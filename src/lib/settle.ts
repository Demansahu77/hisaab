export type LedgerExpense = {
  paidBy: string;
  shares: { userId: string; amount: number }[];
};

export type LedgerSettlement = { from: string; to: string; amount: number };

export type Transfer = { from: string; to: string; amount: number };

/**
 * Net position per member in paise. Positive means the group owes them,
 * negative means they owe the group. The values always sum to zero.
 */
export function computeBalances(
  memberIds: string[],
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): Map<string, number> {
  const balances = new Map<string, number>(memberIds.map((id) => [id, 0]));
  const add = (userId: string, delta: number) =>
    balances.set(userId, (balances.get(userId) ?? 0) + delta);

  for (const expense of expenses) {
    for (const share of expense.shares) {
      add(expense.paidBy, share.amount);
      add(share.userId, -share.amount);
    }
  }
  // Paying someone back raises the payer's balance and lowers the receiver's.
  for (const settlement of settlements) {
    add(settlement.from, settlement.amount);
    add(settlement.to, -settlement.amount);
  }
  return balances;
}

/**
 * Collapse a web of debts into a short list of payments.
 *
 * Who paid for what does not matter once balances are known: only the net
 * amounts do. So we repeatedly match the person who owes the most with the
 * person who is owed the most. Each payment clears at least one of them, which
 * guarantees at most (n - 1) payments for n people.
 *
 * ponytail: greedy, not provably minimal. The true minimum is a subset-sum
 * search (NP-hard); switch to it only if groups get large and the extra
 * payment or two starts to matter.
 */
export function simplifyDebts(balances: Map<string, number>): Transfer[] {
  const byAmountDesc = (a: [string, number], b: [string, number]) =>
    b[1] - a[1] || a[0].localeCompare(b[0]);

  const creditors = [...balances].filter(([, v]) => v > 0).sort(byAmountDesc);
  const debtors = [...balances]
    .filter(([, v]) => v < 0)
    .map(([id, v]): [string, number] => [id, -v])
    .sort(byAmountDesc);

  const transfers: Transfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor[1], debtor[1]);
    transfers.push({ from: debtor[0], to: creditor[0], amount });

    creditor[1] -= amount;
    debtor[1] -= amount;
    if (creditor[1] === 0) creditors.shift();
    if (debtor[1] === 0) debtors.shift();
    creditors.sort(byAmountDesc);
    debtors.sort(byAmountDesc);
  }
  return transfers;
}
