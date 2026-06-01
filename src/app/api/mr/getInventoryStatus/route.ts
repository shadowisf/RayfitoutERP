import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// ── Stop words: units, fillers, prepositions that carry no material identity ──
const STOP_WORDS = new Set([
  "and", "the", "for", "per", "with", "all", "not", "use",
  "nos", "pcs", "qty", "set", "lot", "box", "bag", "can",
  "rmt", "mtr", "ltr", "kgs", "sqm", "sqf", "cft", "lfs",
  "rft", "nrs", "rls", "sup",
]);

/**
 * Pull only meaningful words from a description.
 * - Splits on anything that is not a plain letter (drops digits, punctuation,
 *   slashes, dashes — so dimension tokens like "100mm", "4x8", "1/2",
 *   and model codes like "PCWP750F" are discarded entirely).
 * - Keeps words longer than 2 characters that are not stop words.
 */
function extractKeywords(desc: string): string[] {
  return [
    ...new Set(
      desc
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
    ),
  ];
}

// Keywords must match exactly — no fuzzy, no typo tolerance.
function keywordsMatch(a: string, b: string): boolean {
  return a === b;
}

/**
 * Build an IDF (Inverse Document Frequency) map from a corpus of descriptions.
 *
 * IDF(word) = log((N + 1) / (df + 1)) + 1   (smoothed so no word scores zero)
 *
 * Words that appear in many documents (e.g. "water", "steel") get a low IDF
 * weight; rare specific words (e.g. "centrifugal", "submersible") get a high
 * weight. This prevents a single common keyword from triggering a false match.
 */
function buildIdf(descriptions: string[]): Map<string, number> {
  const df = new Map<string, number>();
  const N  = descriptions.length;

  for (const desc of descriptions) {
    for (const kw of new Set(extractKeywords(desc))) {
      df.set(kw, (df.get(kw) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [word, freq] of df.entries()) {
    idf.set(word, Math.log((N + 1) / (freq + 1)) + 1);
  }
  return idf;
}

type ScoreResult = { score: number; isExact: boolean };

/**
 * Check whether a phrase (ordered sequence of keywords) appears as a
 * consecutive run anywhere inside an inventory item's keyword list.
 */
function phraseInInventory(phrase: string[], invKw: string[]): boolean {
  if (phrase.length > invKw.length) return false;
  outer: for (let start = 0; start <= invKw.length - phrase.length; start++) {
    for (let i = 0; i < phrase.length; i++) {
      if (!keywordsMatch(phrase[i], invKw[start + i])) continue outer;
    }
    return true;
  }
  return false;
}

/**
 * Compare a material description against an inventory item name.
 */
function compareDescriptions(
  material: string,
  inventoryName: string,
  idf: Map<string, number>,
): ScoreResult {
  const matLower = material.toLowerCase().trim();
  const invLower = inventoryName.toLowerCase().trim();

  if (matLower === invLower) return { score: 1, isExact: true };

  const matKw = extractKeywords(material);
  const invKw = extractKeywords(inventoryName);

  if (matKw.length === 0 || invKw.length === 0) return { score: 0, isExact: false };

  const totalIdf = matKw.reduce((sum, kw) => sum + (idf.get(kw) ?? 1), 0);
  if (totalIdf === 0) return { score: 0, isExact: false };

  for (let size = matKw.length; size >= 1; size--) {
    for (let start = 0; start <= matKw.length - size; start++) {
      const phrase = matKw.slice(start, start + size);
      if (phraseInInventory(phrase, invKw)) {
        const matchedIdf = phrase.reduce((sum, kw) => sum + (idf.get(kw) ?? 1), 0);
        return { score: matchedIdf / totalIdf, isExact: false };
      }
    }
  }

  return { score: 0, isExact: false };
}

// IDF-weighted score threshold — a single common word won't clear this
const SIMILARITY_THRESHOLD = 0.25;

type MatchEntry = {
  inventory_item_id: number;
  inventory_description: string;
  unit: string;
  total_qty: number;
  locations: string[];
  match_type: "exact" | "similar";
  _score?: number; // internal, stripped before response
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materialsParam    = searchParams.get("materials");
  const predefinedIdsParam = searchParams.get("predefined_ids");

  if (!materialsParam) {
    return NextResponse.json({ error: "materials param required" }, { status: 400 });
  }

  const materials = materialsParam
    .split("||")
    .map((m) => m.trim())
    .filter(Boolean);

  if (materials.length === 0) {
    return NextResponse.json({}, { status: 200 });
  }

  // Parse parallel predefined_ids (0 or missing = no predefined ID)
  const predefinedIds: (number | null)[] = predefinedIdsParam
    ? predefinedIdsParam.split("||").map((id) => {
        const n = parseInt(id);
        return isNaN(n) || n === 0 ? null : n;
      })
    : materials.map(() => null);

  try {
    // ── Resolve predefined descriptions ──────────────────────────────────────
    const nonNullIds = [...new Set(predefinedIds.filter((id): id is number => id !== null))];
    const predefinedDescMap = new Map<number, string>();

    if (nonNullIds.length > 0) {
      const [piRows] = await db.query<RowDataPacket[]>(
        `SELECT id, material_description FROM lut_predefined_items WHERE id IN (${nonNullIds.map(() => "?").join(",")})`,
        nonNullIds,
      );
      for (const row of piRows as any[]) {
        predefinedDescMap.set(row.id, row.material_description);
      }
    }

    const targets = materials.map((material, i) => {
      const pid = predefinedIds[i] ?? null;
      const effectiveDesc = pid !== null && predefinedDescMap.has(pid)
        ? predefinedDescMap.get(pid)!
        : material;
      return { original: material, effectiveDesc };
    });

    // ── Pass 1: All active inventory items with correct available qty ─────────
    // available_qty = total_stock - total_issued
    // (transfers cancel out globally, so net = 0)
    // Only items with available_qty > 0 are returned.
    const [invRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM (
         SELECT
           i.id                                      AS inventory_item_id,
           i.description                             AS inventory_description,
           i.unit,
           GREATEST(0,
             COALESCE(s_agg.total_stock, 0)
             - COALESCE(iss_agg.total_issued, 0)
           )                                         AS available_qty
         FROM inventory i
         LEFT JOIN (
           SELECT inventory_item_id, SUM(quantity) AS total_stock
           FROM stocks
           GROUP BY inventory_item_id
         ) s_agg ON s_agg.inventory_item_id = i.id
         LEFT JOIN (
           SELECT jt.inventory_item_id, SUM(jt.quantity) AS total_issued
           FROM stocks_transfer_issue sti
           INNER JOIN jt_stocks_transfer_issue_inventory_item jt
             ON sti.id = jt.stocks_transfer_issue_id
           WHERE LOWER(sti.type) LIKE '%issue%'
           GROUP BY jt.inventory_item_id
         ) iss_agg ON iss_agg.inventory_item_id = i.id
         WHERE i.is_archived = 0
       ) sub
       WHERE sub.available_qty > 0`,
    );

    // Fetch distinct locations per inventory item from stocks (non-empty, qty > 0)
    const [locationRows] = await db.query<RowDataPacket[]>(
      `SELECT inventory_item_id,
              GROUP_CONCAT(DISTINCT location ORDER BY location SEPARATOR '||') AS locations
       FROM stocks
       WHERE location IS NOT NULL AND location != '' AND quantity > 0
       GROUP BY inventory_item_id`,
    );
    const locationMap = new Map<number, string[]>(
      (locationRows as any[]).map((r) => [
        r.inventory_item_id,
        String(r.locations ?? "").split("||").filter(Boolean),
      ]),
    );

    // Build a lookup map: inventory_item_id → row data (for Pass 2 qty lookup)
    const invMap = new Map<number, { inventory_description: string; unit: string; available_qty: number; locations: string[] }>(
      (invRows as any[]).map((r) => [
        r.inventory_item_id,
        {
          inventory_description: r.inventory_description || "",
          unit: r.unit || "",
          available_qty: Number(r.available_qty),
          locations: locationMap.get(r.inventory_item_id) ?? [],
        },
      ]),
    );

    // ── Pass 2: MR-line descriptions linked to inventory items ────────────────
    // Gives us a second matching surface: the MR line description that was
    // originally received into an inventory item.
    // Only include inventory items that are in invMap (i.e. have available stock).
    const [stockMrRows] = await db.query<RowDataPacket[]>(
      `SELECT DISTINCT
         COALESCE(pi.material_description, ml.material_description) AS mr_line_desc,
         s.inventory_item_id
       FROM stocks s
       JOIN mr_lines ml ON ml.id = s.mr_line_id
       LEFT JOIN lut_predefined_items pi ON pi.id = ml.predefined_item_id
       WHERE s.mr_line_id IS NOT NULL
         AND s.inventory_item_id IS NOT NULL`,
    );

    // Build IDF from all inventory descriptions in the available-stock pool
    const idf = buildIdf((invRows as any[]).map((r) => r.inventory_description || ""));

    const result: Record<string, MatchEntry[]> = {};

    for (const { original, effectiveDesc } of targets) {
      const matchMap = new Map<number, MatchEntry>(); // keyed by inventory_item_id

      // ── Pass 1: compare effective description against inventory item names ──
      for (const row of invRows as any[]) {
        const invName: string = row.inventory_description || "";
        const { score, isExact } = compareDescriptions(effectiveDesc, invName, idf);

        if (isExact) {
          matchMap.set(row.inventory_item_id, {
            inventory_item_id: row.inventory_item_id,
            inventory_description: invName,
            unit: row.unit || "",
            total_qty: Number(row.available_qty),
            locations: locationMap.get(row.inventory_item_id) ?? [],
            match_type: "exact",
            _score: 1,
          });
        } else if (score >= SIMILARITY_THRESHOLD) {
          matchMap.set(row.inventory_item_id, {
            inventory_item_id: row.inventory_item_id,
            inventory_description: invName,
            unit: row.unit || "",
            total_qty: Number(row.available_qty),
            locations: locationMap.get(row.inventory_item_id) ?? [],
            match_type: "similar",
            _score: score,
          });
        }
      }

      // ── Pass 2: compare effective description against MR line descriptions ─
      for (const row of stockMrRows as any[]) {
        const invId: number = row.inventory_item_id;

        // Skip if the inventory item has no available stock
        const invData = invMap.get(invId);
        if (!invData) continue;

        const mrLineDesc: string = row.mr_line_desc || "";
        const { score, isExact } = compareDescriptions(effectiveDesc, mrLineDesc, idf);

        if (!isExact && score < SIMILARITY_THRESHOLD) continue;

        const matchType: "exact" | "similar" = isExact ? "exact" : "similar";

        const existing = matchMap.get(invId);
        if (existing) {
          // Upgrade to exact if this pass gives a better result
          if (matchType === "exact" && existing.match_type !== "exact") {
            existing.match_type = "exact";
            existing._score = 1;
          }
        } else {
          matchMap.set(invId, {
            inventory_item_id: invId,
            inventory_description: invData.inventory_description,
            unit: invData.unit,
            total_qty: invData.available_qty,
            locations: invData.locations,
            match_type: matchType,
            _score: isExact ? 1 : score,
          });
        }
      }

      // Sort: exact first, then similar by descending score
      const matches = [...matchMap.values()].sort((a, b) => {
        if (a.match_type === "exact" && b.match_type !== "exact") return -1;
        if (b.match_type === "exact" && a.match_type !== "exact") return 1;
        return (b._score ?? 0) - (a._score ?? 0);
      });

      result[original] = matches.map(({ _score, ...rest }) => rest);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("getInventoryStatus error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
