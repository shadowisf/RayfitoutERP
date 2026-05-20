// Quick test — run with: npx ts-node scripts/testFuzzy.ts

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

// Per-token character similarity (0–1). Returns 0 if below TOKEN_MIN.
const TOKEN_MIN = 0.72;
function tokenSim(a: string, b: string): number {
  if (a === b) return 1;
  const s = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return s >= TOKEN_MIN ? s : 0;
}

// Greedy fuzzy token match. Returns number of matched pairs and their total score.
function fuzzyMatch(aT: string[], bT: string[]): { matched: number; score: number } {
  const bUsed = new Array(bT.length).fill(false);
  let matched = 0, score = 0;
  for (const ta of aT) {
    let best = 0, bestJ = -1;
    for (let j = 0; j < bT.length; j++) {
      if (bUsed[j]) continue;
      const s = tokenSim(ta, bT[j]);
      if (s > best) { best = s; bestJ = j; }
    }
    if (bestJ >= 0 && best > 0) {
      score += best;
      matched++;
      bUsed[bestJ] = true;
    }
  }
  return { matched, score };
}

function similarity(a: string, b: string): number {
  const aT = tokenise(a);
  const bT = tokenise(b);
  if (aT.length === 0 || bT.length === 0) return 0;

  const { matched } = fuzzyMatch(aT, bT);
  if (matched < 2) return 0;

  const jaccard = matched / (aT.length + bT.length - matched);
  const overlap = matched / Math.min(aT.length, bT.length);
  return Math.max(jaccard, overlap);
}

// ─── Test cases ──────────────────────────────────────────────────────────────

const THRESHOLD = 0.5;

const cases: [string, string, string][] = [
  // label, mr description, inventory description
  [
    "typo GLASSG vs GLASS (same compound)",
    "6MM CLEAR TEMPER GLASS+10MM SPACER +6MM CLEAR TEMPER DOUBLE GLASSG",
    "6MM CLEAR TEMPER GLASS+10MM SPACER+6MM CLEAR TEMPER DOUBLE GLASS",
  ],
  [
    "TEMPER vs TEMPERED suffix",
    "6MM CLEAR TEMPER GLASS 10MM SPACER",
    "6MM CLEAR TEMPERED GLASS 10MM SPACER",
  ],
  [
    "short inventory name as subset",
    "6MM CLEAR TEMPER GLASS+10MM SPACER +6MM CLEAR TEMPER DOUBLE GLASSG",
    "DOUBLE GLASS",
  ],
  [
    "SUPPLY OF prefix",
    "SUPPLY OF ALUMINUM EXTRUSION 100X50",
    "ALUMINUM EXTRUSION 100X50",
  ],
  [
    "exact match",
    "STEEL PIPE 50MM",
    "STEEL PIPE 50MM",
  ],
  [
    "completely different (should NOT match)",
    "PAINT WHITE EMULSION 20L",
    "6MM CLEAR TEMPER GLASS+10MM SPACER",
  ],
  [
    "completely different 2 (should NOT match)",
    "CEMENT BAGS 50KG",
    "ALUMINUM EXTRUSION 100X50",
  ],
  [
    "single shared word CLEAR — should NOT match",
    "SUPPLY OF 6MM CLEAR TEMPER GLASS +12MM SPACER + 6MM CLEAR TEMPER DOUBLE GLASS",
    "SILICONE CLEAR",
  ],
  [
    "SILICONE CLEAR does match SILICONE SEALANT CLEAR",
    "SILICONE SEALANT CLEAR 300ML",
    "SILICONE CLEAR",
  ],
  [
    "NOS quantity suffix should NOT match unrelated items",
    "SPANNER - 17MM (1 NOS)",
    "BOLT HEX 17MM 10 NOS",
  ],
  [
    "SPANNER should match SPANNER correctly",
    "SPANNER - 17MM (1 NOS)",
    "SPANNER 17MM",
  ],
  [
    "SPANNER vs glass compound — should NOT match",
    "6MM CLEAR TEMPER GLASS + 10MM SPACER + 6MM CLEAR TEMPER DOUBLE GLASS",
    "SPANNER - 17MM (1 NOS)",
  ],
  [
    "spacing and spacing variant",
    "STEEL PIPE  50MM  GALVANIZED",
    "STEEL PIPE 50MM GALVANIZED",
  ],
  [
    "abbreviation-like (ALUM vs ALUMINUM)",
    "ALUM EXTRUSION 100X50",
    "ALUMINUM EXTRUSION 100X50",
  ],
  [
    "one word off",
    "CLEAR FLOAT GLASS 6MM",
    "CLEAR TEMPER GLASS 6MM",
  ],
];

console.log(`\nFuzzy token matching test (threshold = ${THRESHOLD})\n`);
console.log("─".repeat(80));

for (const [label, mr, inv] of cases) {
  const score = similarity(mr, inv);
  const pass = score >= THRESHOLD;
  const marker = pass ? "✓ MATCH  " : "✗ NO MATCH";
  console.log(`${marker}  score=${score.toFixed(3)}  ${label}`);
  console.log(`           MR : ${mr}`);
  console.log(`           INV: ${inv}`);
  console.log();
}
