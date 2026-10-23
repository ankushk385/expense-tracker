/**
 * Shared money-input helpers.
 *
 * Users type into plain TextInputs, so we normalise the value ourselves:
 * one decimal point, at most 2 decimals, no leading zeroes, sensible max
 * length. This prevents values like "1.2.3" being silently parsed as 1.2.
 */

const MAX_INTEGER_DIGITS = 9;

export function sanitizeAmountInput(raw: string): string {
  let cleaned = raw.replace(/[^0-9.]/g, "");

  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  cleaned = cleaned.replace(/^0+(?=\d)/, "");

  let [integer, decimals] = cleaned.split(".");
  integer = (integer ?? "").slice(0, MAX_INTEGER_DIGITS);
  if (decimals !== undefined) {
    return `${integer}.${decimals.slice(0, 2)}`;
  }
  return integer;
}

export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100) / 100;
}
