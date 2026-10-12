import Link from "next/link";
import { Suspense } from "react";
import { createGroup, joinGroup } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Amount, LoadingShell, PageShell } from "@/components/ui";
import { getGroupsForUser, requireUser } from "@/lib/dal";

export const metadata = { title: "Your ledgers" };

export default function GroupsPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <GroupsPageContent  />
    </Suspense>
  );
}

async function GroupsPageContent() {
  const user = await requireUser();
  const groups = await getGroupsForUser(user.id);

  return (
    <PageShell nav={<AppNav name={user.name} />}>
      <div className="sheet mt-2 px-5 pb-8 sm:px-9 sm:pb-10">
        <h1 className="font-display text-4xl sm:text-5xl">Your ledgers</h1>

        {groups.length === 0 ? (
          <p className="mt-5 max-w-md text-lg text-ink-soft">
            No ledgers yet. Start one for your flat or trip below, or join one with an invite code.
          </p>
        ) : (
          <ul className="mt-6 border-t border-ink/15">
            {groups.map((group) => (
              <li key={group.id} className="ledger-row border-b border-ink/15">
                <Link
                  href={`/groups/${group.id}`}
                  className="block py-3.5 pr-3 transition-colors hover:text-cloth"
                >
                  <span className="block text-xl font-semibold">{group.name}</span>
                  <span className="block text-sm text-ink-soft">
                    {group.memberCount} {group.memberCount === 1 ? "member" : "members"},{" "}
                    {group.expenseCount} {group.expenseCount === 1 ? "entry" : "entries"}
                  </span>
                </Link>
                <div className="amount-col flex flex-col justify-center py-3.5">
                  {group.balance === 0 ? (
                    <span className="text-ink-soft">settled</span>
                  ) : (
                    <>
                      <Amount
                        paise={Math.abs(group.balance)}
                        className={`text-lg font-semibold ${group.balance < 0 ? "text-debt" : ""}`}
                      />
                      <span className="text-sm text-ink-soft">
                        {group.balance < 0 ? "you owe" : "you get back"}
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
          <ActionForm action={createGroup}>
            <label htmlFor="group-name" className="mb-1.5 block font-semibold">
              Start a new ledger
            </label>
            <div className="mb-2 flex gap-2">
              <input
                id="group-name"
                className="field"
                name="name"
                placeholder="Room 214"
                maxLength={40}
                required
              />
              <SubmitButton className="btn shrink-0">Create</SubmitButton>
            </div>
          </ActionForm>

          <ActionForm action={joinGroup}>
            <label htmlFor="invite-code" className="mb-1.5 block font-semibold">
              Join with an invite code
            </label>
            <div className="mb-2 flex gap-2">
              <input
                id="invite-code"
                className="field uppercase"
                name="code"
                placeholder="K7M2QX"
                maxLength={6}
                autoCapitalize="characters"
                required
              />
              <SubmitButton className="btn shrink-0">Join</SubmitButton>
            </div>
          </ActionForm>
        </div>
      </div>
    </PageShell>
  );
}
