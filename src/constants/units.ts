export const UNIT_OPTIONS = [
  "ITEM",
  "NOS",
  "SQM",
  "SQFT",
  "M",
  "LM",
  "FT",
  "CUM",
  "KG",
  "TON",
  "LTR",
  "GAL",
  "SET",
  "LOT",
  "LS",
  "PAIR",
  "BOX",
  "BAG",
  "ROLL",
  "DRUM",
  "MONTHS",
  "DAYS",
  "GLB",
  "CFT",
  "SHEET",
] as const;

export type UnitType = (typeof UNIT_OPTIONS)[number];

// Map predefined item units (from Excel import) to UNIT_OPTIONS values
const UNIT_MAP: Record<string, string> = {
  kg: "KG",
  L: "LTR",
  roll: "ROLL",
  m: "M",
  "m²": "SQM",
  sheet: "SHEET",
};

export function mapPredefinedUnit(unit: string | null): string {
  if (!unit) return "";
  return UNIT_MAP[unit] || unit.toUpperCase();
}
