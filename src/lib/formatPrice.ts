/**
 * Formats a number as a price string with comma separators for thousands.
 * e.g. 1234567.89 → "1,234,567.89"
 * This should be used for all price/cost/amount DISPLAY values (not input fields).
 */
export function formatPrice(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0.00";
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a number as a price with AED prefix and comma separators.
 * e.g. 1234567.89 → "AED 1,234,567.89"
 */
export function formatPriceAED(
  value: number | string | null | undefined,
): string {
  return `AED ${formatPrice(value)}`;
}
