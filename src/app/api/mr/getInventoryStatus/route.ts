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
 *
 * Uses progressive phrase matching (longest consecutive keyword run first),
 * then scores the matched phrase using IDF weights so that rare, specific
 * words contribute far more than generic ones like "water" or "steel".
 *
 * Score = Σ IDF(matched keywords) / Σ IDF(all material keywords)
 *
 * Example — "Clean Water Pump" vs "Water Power Supply":
 *   Only "water" matches (low IDF ≈ 0.4).
 *   score = 0.4 / (IDF(clean) + IDF(water) + IDF(pump)) ≈ 0.4 / 3.2 = 0.13
 *   → below threshold → no match ✓
 *
 * Example — "Clean Water Pump" vs "Centrifugal Water Pump":
 *   "water pump" consecutive phrase matches (IDF(water)+IDF(pump) ≈ 0.4+1.5).
 *   score = 1.9 / 3.2 ≈ 0.59 → similar match ✓
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

  // Total IDF weight of all material keywords (denominator)
  const totalIdf = matKw.reduce((sum, kw) => sum + (idf.get(kw) ?? 1), 0);
  if (totalIdf === 0) return { score: 0, isExact: false };

  // Find the longest consecutive phrase from material keywords that exists
  // inside the inventory keywords, then score it by IDF weight.
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
    // For MR lines that have a predefined_item_id, fetch the canonical
    // material_description from lut_predefined_items and use that for matching.
    // For lines without a predefined_item_id, use the MR line's own description.
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

    // Build targets: each entry holds the original material string (used as the
    // result key) and the effective description used for matching.
    const targets = materials.map((material, i) => {
      const pid = predefinedIds[i] ?? null;
      const effectiveDesc = pid !== null && predefinedDescMap.has(pid)
        ? predefinedDescMap.get(pid)!   // use predefined canonical description
        : material;                      // fall back to MR line's own description
      return { original: material, effectiveDesc };
    });

    // ── Fetch all active inventory items (Pass 1) ────────────────────────────
    const [invRows] = await db.query<RowDataPacket[]>(
      `SELECT
         i.id                            AS inventory_item_id,
         i.description                   AS inventory_description,
         i.unit,
         COALESCE(SUM(s.quantity), 0)    AS total_qty
       FROM inventory i
       LEFT JOIN stocks s ON s.inventory_item_id = i.id AND s.mr_line_id IS NOT NULL
       WHERE i.is_archived = 0
       GROUP BY i.id, i.description, i.unit`,
    );

    // ── Fetch stocks with their MR line descriptions (Pass 2) ─────────────
    // Only stocks that have a mr_line_id are included.
    // If the mr_line has a predefined_item_id, use the predefined item's
    // canonical description; otherwise fall back to ml.material_description.
    const [stockMrRows] = await db.query<RowDataPacket[]>(
      `SELECT
         COALESCE(pi.material_description, ml.material_description) AS mr_line_desc,
         i.id                            AS inventory_item_id,
         i.description                   AS inventory_description,
         i.unit,
         COALESCE(SUM(s.quantity), 0)    AS total_qty
       FROM stocks s
       JOIN mr_lines            ml ON ml.id  = s.mr_line_id
       LEFT JOIN lut_predefined_items pi ON pi.id = ml.predefined_item_id
       JOIN inventory            i  ON i.id  = s.inventory_item_id
       WHERE s.mr_line_id       IS NOT NULL
         AND s.inventory_item_id IS NOT NULL
       GROUP BY COALESCE(pi.material_description, ml.material_description),
                i.id, i.description, i.unit`,
    );

    // Build IDF from all inventory descriptions — done once, shared across all targets
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
            total_qty: Number(row.total_qty) || 0,
            match_type: "exact",
            _score: 1,
          });
        } else if (score >= SIMILARITY_THRESHOLD) {
          matchMap.set(row.inventory_item_id, {
            inventory_item_id: row.inventory_item_id,
            inventory_description: invName,
            unit: row.unit || "",
            total_qty: Number(row.total_qty) || 0,
            match_type: "similar",
            _score: score,
          });
        }
      }

      // ── Pass 2: compare effective description against MR line descriptions ─
      // If the MR line description matches, surface the linked inventory item.
      for (const row of stockMrRows as any[]) {
        const mrLineDesc: string = row.mr_line_desc || "";
        const { score, isExact } = compareDescriptions(effectiveDesc, mrLineDesc, idf);

        if (!isExact && score < SIMILARITY_THRESHOLD) continue;

        const matchType: "exact" | "similar" = isExact ? "exact" : "similar";
        const invId: number = row.inventory_item_id;

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
            inventory_description: row.inventory_description || "",
            unit: row.unit || "",
            total_qty: Number(row.total_qty) || 0,
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

      // Key by original material string so callers can look it up unchanged
      result[original] = matches.map(({ _score, ...rest }) => rest);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("getInventoryStatus error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
