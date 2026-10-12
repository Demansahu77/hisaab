import Link from "next/link";
import { Suspense } from "react";
import { deleteExpense, recordSettlement } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/forms";
import { Amount, LoadingShell, PageShell } from "@/components/ui";
import { getGroup, getGroupStats, requireUser } from "@/lib/dal";

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function GroupPage(props: PageProps<"/groups/[id]">) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <GroupPageContent {...props} />
    </Suspense>
  );
}

async function GroupPageContent({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const [data, stats] = await Promise.all([getGroup(id, user.id), getGroupStats(id)]);
  const { group, members, expenses, settlements, balances, transfers, total } = data;

  const nameOf = (userId: string) =>
    userId === user.id ? "You" : (members.find((m) => m.id === userId)?.name ?? "Someone");
  const topCategory = stats.byCategory[0]?.total ?? 0;
  const topMonth = Math.max(0, ...stats.byMonth.map((m) => m.total));

  return (
    <PageShell nav={<AppNav name={user.name} />}>
      <p className="mb-3">
        <Link href="/groups" className="text-link">
          All ledgers
        </Link>
      </p>

      <div className="sheet px-5 pb-10 sm:px-9">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">{group.name}</h1>
            <p className="mt-2 text-ink-soft">
              {members.length} {members.length === 1 ? "member" : "members"}, total spent{" "}
              <Amount paise={total} className="font-semibold text-ink" />. Invite code{" "}
              <strong className="font-mono tracking-widest text-ink">{group.inviteCode}</strong>
            </p>
          </div>
          <Link href={`/groups/${group.id}/new`} className="btn">
            Add an entry
          </Link>
        </div>

        <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-3xl">Settle up</h2>
            {transfers.length === 0 ? (
              <p className="mt-3 text-ink-soft">Everyone is settled. Nothing to pay.</p>
            ) : (
              <ul className="mt-3 divide-y divide-ink/15">
                {transfers.map((t) => {
                  const involved = t.from === user.id || t.to === user.id;
                  return (
                    <li
                      key={`${t.from}-${t.to}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-3"
                    >
                      <span className="text-lg">
                        <strong>{nameOf(t.from)}</strong> {t.from === user.id ? "pay" : "pays"}{" "}
                        <strong>{t.to === user.id ? "you" : nameOf(t.to)}</strong>
                      </span>
                      <Amount paise={t.amount} className="font-display text-3xl text-debt" />
                      {involved && (
                        <form action={recordSettlement} className="col-span-2 mt-1">
                          <input type="hidden" name="groupId" value={group.id} />
                          <input type="hidden" name="from" value={t.from} />
                          <input type="hidden" name="to" value={t.to} />
                          <input type="hidden" name="amount" value={t.amount} />
                          <SubmitButton className="text-link cursor-pointer">
                            Mark as paid
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-3xl">Balances</h2>
            <ul className="mt-3 divide-y divide-ink/15">
              {members.map((member) => {
                const balance = balances.get(member.id) ?? 0;
                return (
                  <li key={member.id} className="flex items-baseline justify-between gap-4 py-3">
                    <span className="text-lg">{nameOf(member.id)}</span>
                    <span className="text-right">
                      {balance === 0 ? (
                        <span className="text-ink-soft">settled</span>
                      ) : (
                        <>
                          <span className="text-sm text-ink-soft">
                            {balance < 0 ? "owes " : "gets back "}
                          </span>
                          <Amount
                            paise={Math.abs(balance)}
                            className={`text-lg font-semibold ${balance < 0 ? "text-debt" : ""}`}
                          />
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-3xl">Entries</h2>
          {expenses.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              Nothing written down yet. Add the first entry to start the ledger.
            </p>
          ) : (
            <ul className="mt-3 border-t border-ink/15">
              {expenses.map((expense) => (
                <li key={expense.id} className="ledger-row border-b border-ink/15">
                  <div className="py-3 pr-3">
                    <span className="block font-semibold">{expense.description}</span>
                    <span className="block text-sm text-ink-soft">
                      {shortDate(expense.spentOn)}, {nameOf(expense.paidBy)} paid, {expense.category},
                      split {expense.shares.length} {expense.shares.length === 1 ? "way" : "ways"}
                    </span>
                  </div>
                  <div className="amount-col flex flex-col items-end justify-center py-3">
                    <Amount paise={expense.amount} className="text-lg font-semibold" />
                    <form action={deleteExpense}>
                      <input type="hidden" name="expenseId" value={expense.id} />
                      <SubmitButton className="cursor-pointer text-sm text-ink-soft underline underline-offset-2 hover:text-debt">
                        Remove
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {expenses.length > 0 && (
          <div className="mt-12 grid gap-x-12 gap-y-10 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-3xl">Where it went</h2>
              <Bars
                rows={stats.byCategory.map((row) => ({ label: row.category, total: row.total }))}
                max={topCategory}
              />
            </section>
            <section>
              <h2 className="font-display text-3xl">Month by month</h2>
              <Bars
                rows={stats.byMonth.map((row) => ({ label: monthLabel(row.month), total: row.total }))}
                max={topMonth}
              />
            </section>
          </div>
        )}

        {settlements.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl">Payments made</h2>
            <ul className="mt-3 divide-y divide-ink/15">
              {settlements.map((s) => (
                <li key={s.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span>
                    <strong>{nameOf(s.fromUser)}</strong> paid{" "}
                    <strong>{s.toUser === user.id ? "you" : nameOf(s.toUser)}</strong>
                    <span className="text-ink-soft">
                      {" "}
                      on {s.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </span>
                  <Amount paise={s.amount} className="font-semibold" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function Bars({ rows, max }: { rows: { label: string; total: number }[]; max: number }) {
  return (
    <ul className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="capitalize">{row.label}</span>
            <Amount paise={row.total} className="font-semibold" />
          </div>
          <div
            className="mt-1.5 h-2 rounded-full bg-cloth"
            style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }}
          />
        </li>
      ))}
    </ul>
  );
}
