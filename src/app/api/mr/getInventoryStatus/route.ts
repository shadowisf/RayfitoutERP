import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

// Common quantity/unit suffixes and filler words that carry no material identity.
const STOP_TOKENS = new Set([
  "nos", "pcs", "qty", "set", "lot", "box", "bag", "can", "rmt", "mtr",
  "ltr", "kgs", "sqm", "sqf", "cft", "lfs", "rft", "nrs", "rls",
  "and", "the", "for", "per", "with", "sup", "all",
]);

function tokenise(desc: string): string[] {
  return [
    ...new Set(
      desc
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !STOP_TOKENS.has(w)),
    ),
  ];
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return prev[n];
}

// Per-token character similarity. Returns 0 if below the minimum threshold.
const TOKEN_MIN = 0.72;
function tokenSim(a: string, b: string): number {
  if (a === b) return 1;
  const s = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return s >= TOKEN_MIN ? s : 0;
}

// Greedy fuzzy token match: for each token in aT, find the best-matching token
// in bT by character similarity, then score as max(jaccard, overlap-coefficient).
// Overlap handles short inventory names that are a near-subset of long MR descriptions.
function similarity(a: string, b: string): number {
  const aT = tokenise(a);
  const bT = tokenise(b);
  if (aT.length === 0 || bT.length === 0) return 0;

  const bUsed = new Array(bT.length).fill(false);
  let matched = 0;

  for (const ta of aT) {
    let best = 0, bestJ = -1;
    for (let j = 0; j < bT.length; j++) {
      if (bUsed[j]) continue;
      const s = tokenSim(ta, bT[j]);
      if (s > best) { best = s; bestJ = j; }
    }
    if (bestJ >= 0 && best > 0) {
      matched++;
      bUsed[bestJ] = true;
    }
  }

  // Require at least 2 matched tokens to avoid single-word coincidences
  // (e.g. "SILICONE CLEAR" sharing only "CLEAR" with a glass description).
  if (matched < 2) return 0;
  const jaccard = matched / (aT.length + bT.length - matched);
  const overlap = matched / Math.min(aT.length, bT.length);
  return Math.max(jaccard, overlap);
}

const SIMILARITY_THRESHOLD = 0.5;

type MatchEntry = {
  inventory_item_id: number;
  inventory_description: string;
  unit: string;
  total_qty: number;
  match_type: "exact" | "similar";
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const materialsParam = searchParams.get("materials");

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

  const lowerMaterials = materials.map((m) => m.toLowerCase());

  try {
    const result: Record<string, MatchEntry[]> = {};

    // ── Pass 1: stocks linked to past MR lines ────────────────────────────────
    const allTokens = [
      ...new Set(lowerMaterials.flatMap((d) => tokenise(d).filter((t) => t.length > 3))),
    ];

    const exactPlaceholders = lowerMaterials.map(() => "?").join(",");
    const likeConditions = allTokens
      .map(() => `LOWER(ml.material_description) LIKE ?`)
      .join(" OR ");
    const likeParams = allTokens.map((t) => `%${t}%`);

    const whereClause =
      allTokens.length > 0
        ? `(LOWER(ml.material_description) IN (${exactPlaceholders}) OR (${likeConditions}))`
        : `LOWER(ml.material_description) IN (${exactPlaceholders})`;

    const [mrLineRows] = await db.query<RowDataPacket[]>(
      `SELECT
         LOWER(ml.material_description) AS mr_line_desc,
         i.id                           AS inventory_item_id,
         i.description                  AS inventory_description,
         i.unit,
         (
           SELECT COALESCE(SUM(s2.quantity), 0)
           FROM stocks s2
           WHERE s2.inventory_item_id = i.id
         )                              AS total_qty
       FROM stocks s
       JOIN inventory  i  ON i.id  = s.inventory_item_id
       JOIN mr_lines   ml ON ml.id = s.mr_line_id
       WHERE s.inventory_item_id IS NOT NULL
         AND ${whereClause}
       GROUP BY LOWER(ml.material_description), i.id, i.description, i.unit`,
      [...lowerMaterials, ...likeParams],
    );

    for (const row of mrLineRows as any[]) {
      const mrLineDesc: string = row.mr_line_desc;

      let bestDesc: string | null = null;
      let bestScore = 0;

      for (const lower of lowerMaterials) {
        if (mrLineDesc === lower) { bestDesc = lower; bestScore = Infinity; break; }
        const score = similarity(mrLineDesc, lower);
        if (score > bestScore) { bestScore = score; bestDesc = lower; }
      }

      if (!bestDesc || bestScore < SIMILARITY_THRESHOLD) continue;

      if (!result[bestDesc]) result[bestDesc] = [];
      const matchType: "exact" | "similar" = mrLineDesc === bestDesc ? "exact" : "similar";

      const existing = result[bestDesc].find((e) => e.inventory_item_id === row.inventory_item_id);
      if (existing) { if (matchType === "exact") existing.match_type = "exact"; continue; }

      result[bestDesc].push({
        inventory_item_id: row.inventory_item_id,
        inventory_description: row.inventory_description,
        unit: row.unit || "",
        total_qty: Number(row.total_qty) || 0,
        match_type: matchType,
      });
    }

    // ── Pass 2: all inventory items, pure JS similarity ───────────────────────
    // No SQL filter — load all non-archived items and score in JS so nothing is
    // missed due to naming differences or missing mr_line_id on stocks entries.
    const [invRows] = await db.query<RowDataPacket[]>(
      `SELECT
         i.id          AS inventory_item_id,
         i.description AS inventory_description,
         i.unit,
         (
           SELECT COALESCE(SUM(s2.quantity), 0)
           FROM stocks s2
           WHERE s2.inventory_item_id = i.id
         )             AS total_qty
       FROM inventory i
       WHERE i.is_archived = 0`,
    );

    for (const row of invRows as any[]) {
      const invDesc: string = (row.inventory_description || "").toLowerCase();

      let bestDesc: string | null = null;
      let bestScore = 0;

      for (const lower of lowerMaterials) {
        if (invDesc === lower) { bestDesc = lower; bestScore = Infinity; break; }
        const score = similarity(invDesc, lower);
        if (score > bestScore) { bestScore = score; bestDesc = lower; }
      }

      if (!bestDesc || bestScore < SIMILARITY_THRESHOLD) continue;

      if (!result[bestDesc]) result[bestDesc] = [];
      const matchType: "exact" | "similar" = invDesc === bestDesc ? "exact" : "similar";

      const existing = result[bestDesc].find((e) => e.inventory_item_id === row.inventory_item_id);
      if (existing) { if (matchType === "exact") existing.match_type = "exact"; continue; }

      result[bestDesc].push({
        inventory_item_id: row.inventory_item_id,
        inventory_description: row.inventory_description,
        unit: row.unit || "",
        total_qty: Number(row.total_qty) || 0,
        match_type: matchType,
      });
    }

    // Sort: exact first
    for (const key in result) {
      result[key].sort((a, b) => (a.match_type === "exact" ? -1 : 1));
    }

    // Re-key to original casing
    const cased: typeof result = {};
    for (const original of materials) {
      cased[original] = result[original.toLowerCase()] ?? [];
    }

    return NextResponse.json(cased, { status: 200 });
  } catch (err: any) {
    console.error("getInventoryStatus error:", err.sqlMessage || err.message);
    return NextResponse.json({ error: err.sqlMessage || err.message }, { status: 500 });
  }
}
