"use client";

import { useMemo, useState } from "react";
import { computeBalances, simplifyDebts } from "@/lib/settle";
import { computeShares } from "@/lib/split";
import { Amount } from "./ui";

const PEOPLE = ["Asha", "Bilal", "Chitra", "Dev"];

const ENTRIES = [
  { id: "mess", date: "02 Sep", what: "Mess advance", paidBy: "Asha", total: 480000, among: PEOPLE },
  { id: "wifi", date: "05 Sep", what: "Wifi recharge", paidBy: "Bilal", total: 120000, among: PEOPLE },
  { id: "auto", date: "09 Sep", what: "Auto to the station", paidBy: "Chitra", total: 36000, among: ["Asha", "Chitra", "Dev"] },
  { id: "gas", date: "14 Sep", what: "Cylinder refill", paidBy: "Asha", total: 110000, among: PEOPLE },
  { id: "chai", date: "17 Sep", what: "Maggi and chai", paidBy: "Dev", total: 25000, among: PEOPLE },
];

/** The landing page ledger. It runs the same split and settle-up code the app
    uses, so unticking an entry recomputes the payments for real. */
export function Demo() {
  const [included, setIncluded] = useState(() => new Set(ENTRIES.map((e) => e.id)));

  const { transfers, rawDebts } = useMemo(() => {
    const active = ENTRIES.filter((entry) => included.has(entry.id)).map((entry) => ({
      paidBy: entry.paidBy,
      shares: computeShares({ type: "equal", total: entry.total, userIds: entry.among }),
    }));
    // Every "X owes the payer" pair, before simplifying.
    const pairs = new Set(
      active.flatMap((e) =>
        e.shares.filter((s) => s.userId !== e.paidBy).map((s) => `${s.userId}>${e.paidBy}`),
      ),
    );
    return {
      transfers: simplifyDebts(computeBalances(PEOPLE, active, [])),
      rawDebts: pairs.size,
    };
  }, [included]);

  const toggle = (id: string) =>
    setIncluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="sheet px-5 pb-8 sm:px-9 sm:pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-display text-3xl">Room 214, September</h2>
        <p className="text-[0.95rem] text-ink-soft">Untick an entry to see the payments change.</p>
      </div>

      <div className="mt-6 grid gap-x-12 gap-y-9 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ul>
          {ENTRIES.map((entry) => {
            const on = included.has(entry.id);
            return (
              <li key={entry.id} className="ledger-row border-b border-ink/15">
                <label className="flex cursor-pointer items-center gap-3 py-3 pr-3">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(entry.id)}
                    className="shrink-0"
                  />
                  <span className={`min-w-0 transition-opacity ${on ? "" : "opacity-45"}`}>
                    <span className="block font-semibold">{entry.what}</span>
                    <span className="block text-sm text-ink-soft">
                      {entry.date}, {entry.paidBy} paid, split {entry.among.length} ways
                    </span>
                  </span>
                </label>
                <div
                  className={`amount-col flex items-center justify-end py-3 text-lg font-semibold transition-opacity ${on ? "" : "opacity-45"}`}
                >
                  <Amount paise={entry.total} />
                </div>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="lg:pt-3">
          <p className="text-ink-soft">
            {rawDebts === 0
              ? "Nothing is owed."
              : `${rawDebts} separate debts, cleared with ${transfers.length} ${transfers.length === 1 ? "payment" : "payments"}:`}
          </p>
          <ul className="mt-3 space-y-3">
            {transfers.map((t) => (
              <li key={`${t.from}-${t.to}`} className="flex items-baseline justify-between gap-4">
                <span className="text-lg">
                  <strong>{t.from}</strong> pays <strong>{t.to}</strong>
                </span>
                <Amount paise={t.amount} className="font-display text-3xl text-debt" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
