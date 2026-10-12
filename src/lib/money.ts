// All amounts are stored as integer paise. Floats cannot represent 0.1 exactly,
// so adding rupee decimals drifts; integers never do.

/** Parse user input like "1,250.50" into paise. Returns null when invalid. */
export function toPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rupees, fraction = ""] = cleaned.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/** Format paise as an Indian-grouped rupee string, e.g. 12345678 -> "1,23,456.78". */
export function formatPaise(paise: number, { sign = false } = {}): string {
  const abs = Math.abs(paise);
  const text = (abs / 100).toLocaleString("en-IN", {
    minimumFractionDigits: abs % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const prefix = paise < 0 ? "-" : sign && paise > 0 ? "+" : "";
  return `${prefix}₹${text}`;
}
