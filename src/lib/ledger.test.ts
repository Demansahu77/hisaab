import { describe, expect, it } from "vitest";
import { formatPaise, toPaise } from "./money";
import { computeBalances, simplifyDebts } from "./settle";
import { computeShares, SplitError } from "./split";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("money", () => {
  it("parses rupee input into paise", () => {
    expect(toPaise("1,250.50")).toBe(125050);
    expect(toPaise("₹ 99")).toBe(9900);
    expect(toPaise("0.5")).toBe(50);
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e3", "."]) {
      expect(toPaise(bad)).toBeNull();
    }
  });

  it("formats with Indian digit grouping", () => {
    expect(formatPaise(12345678)).toBe("₹1,23,456.78");
    expect(formatPaise(50000)).toBe("₹500");
    expect(formatPaise(-1050)).toBe("-₹10.50");
    expect(formatPaise(1050, { sign: true })).toBe("+₹10.50");
  });
});

describe("computeShares", () => {
  it("splits equally without losing a paisa", () => {
    const shares = computeShares({
      type: "equal",
      total: 10000,
      userIds: ["a", "b", "c"],
    });
    expect(shares.map((s) => s.amount)).toEqual([3334, 3333, 3333]);
    expect(sum(shares.map((s) => s.amount))).toBe(10000);
  });

  it("splits by weighted shares", () => {
    const shares = computeShares({
      type: "shares",
      total: 9000,
      weights: { a: 2, b: 1, c: 0 },
    });
    expect(shares).toEqual([
      { userId: "a", amount: 6000 },
      { userId: "b", amount: 3000 },
    ]);
  });

  it("always sums to the total, whatever the weights", () => {
    for (let total = 1; total < 400; total += 7) {
      const shares = computeShares({
        type: "shares",
        total,
        weights: { a: 3, b: 5, c: 7, d: 1 },
      });
      expect(sum(shares.map((s) => s.amount))).toBe(total);
    }
  });

  it("accepts exact amounts only when they add up", () => {
    expect(
      computeShares({ type: "exact", total: 500, amounts: { a: 200, b: 300 } }),
    ).toHaveLength(2);
    expect(() =>
      computeShares({ type: "exact", total: 500, amounts: { a: 200, b: 200 } }),
    ).toThrow(SplitError);
  });

  it("rejects empty splits and non-positive totals", () => {
    expect(() =>
      computeShares({ type: "equal", total: 100, userIds: [] }),
    ).toThrow(SplitError);
    expect(() =>
      computeShares({ type: "equal", total: 0, userIds: ["a"] }),
    ).toThrow(SplitError);
  });
});

describe("balances and settle-up", () => {
  const members = ["asha", "bilal", "chitra", "dev"];

  it("nets expenses and settlements to zero overall", () => {
    const balances = computeBalances(
      members,
      [
        {
          paidBy: "asha",
          shares: computeShares({ type: "equal", total: 12000, userIds: members }),
        },
        {
          paidBy: "bilal",
          shares: computeShares({
            type: "equal",
            total: 3000,
            userIds: ["bilal", "chitra"],
          }),
        },
      ],
      [{ from: "dev", to: "asha", amount: 1000 }],
    );

    expect(Object.fromEntries(balances)).toEqual({
      asha: 8000,
      bilal: -1500,
      chitra: -4500,
      dev: -2000,
    });
    expect(sum([...balances.values()])).toBe(0);
  });

  it("clears every balance in at most n - 1 payments", () => {
    const balances = new Map([
      ["asha", 8000],
      ["bilal", -1500],
      ["chitra", -4500],
      ["dev", -2000],
    ]);
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(members.length - 1);

    const after = new Map(balances);
    for (const t of transfers) {
      after.set(t.from, after.get(t.from)! + t.amount);
      after.set(t.to, after.get(t.to)! - t.amount);
    }
    expect([...after.values()].every((v) => v === 0)).toBe(true);
  });

  it("collapses a chain of debts into one payment", () => {
    // asha owes bilal 500, bilal owes chitra 500: asha should just pay chitra.
    const balances = new Map([
      ["asha", -500],
      ["bilal", 0],
      ["chitra", 500],
    ]);
    expect(simplifyDebts(balances)).toEqual([
      { from: "asha", to: "chitra", amount: 500 },
    ]);
  });

  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts(new Map(members.map((m) => [m, 0])))).toEqual([]);
  });
});
