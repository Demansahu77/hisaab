export type SplitType = "equal" | "exact" | "shares";

export type Share = { userId: string; amount: number };

export type SplitInput =
  | { type: "equal"; total: number; userIds: string[] }
  | { type: "exact"; total: number; amounts: Record<string, number> }
  | { type: "shares"; total: number; weights: Record<string, number> };

export class SplitError extends Error {}

/**
 * Turn a split description into per-person amounts in paise.
 * The returned amounts always sum to exactly `total`.
 */
export function computeShares(input: SplitInput): Share[] {
  if (!Number.isInteger(input.total) || input.total <= 0) {
    throw new SplitError("Amount must be more than zero.");
  }

  if (input.type === "exact") {
    const shares = Object.entries(input.amounts)
      .filter(([, amount]) => amount > 0)
      .map(([userId, amount]) => ({ userId, amount }));
    const sum = shares.reduce((acc, share) => acc + share.amount, 0);
    if (sum !== input.total) {
      throw new SplitError("Individual amounts must add up to the total.");
    }
    return shares;
  }

  const weights: [string, number][] =
    input.type === "equal"
      ? input.userIds.map((userId) => [userId, 1])
      : Object.entries(input.weights).filter(([, weight]) => weight > 0);

  if (weights.length === 0) {
    throw new SplitError("Pick at least one person to split with.");
  }
  if (weights.some(([, weight]) => !Number.isInteger(weight))) {
    throw new SplitError("Shares must be whole numbers.");
  }

  return allocate(input.total, weights);
}

/**
 * Largest-remainder allocation: everyone gets the floor of their exact share,
 * then the leftover paise go one each to whoever lost the biggest fraction.
 * Example: ₹100 between 3 people gives 33.34, 33.33, 33.33 instead of losing a paisa.
 */
function allocate(total: number, weights: [string, number][]): Share[] {
  const weightSum = weights.reduce((acc, [, weight]) => acc + weight, 0);
  const rows = weights.map(([userId, weight], index) => {
    const exact = total * weight;
    return {
      userId,
      index,
      amount: Math.floor(exact / weightSum),
      remainder: exact % weightSum,
    };
  });

  let leftover = total - rows.reduce((acc, row) => acc + row.amount, 0);
  const byRemainder = [...rows].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  for (const row of byRemainder) {
    if (leftover === 0) break;
    row.amount += 1;
    leftover -= 1;
  }

  return rows.map(({ userId, amount }) => ({ userId, amount }));
}
