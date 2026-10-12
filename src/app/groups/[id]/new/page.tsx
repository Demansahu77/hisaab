import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { ExpenseForm } from "@/components/expense-form";
import { LoadingShell, PageShell } from "@/components/ui";
import { getGroup, requireUser } from "@/lib/dal";

export const metadata = { title: "Add an entry" };

export default function NewExpensePage(props: PageProps<"/groups/[id]/new">) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <NewExpensePageContent {...props} />
    </Suspense>
  );
}

async function NewExpensePageContent({ params }: PageProps<"/groups/[id]/new">) {
  const { id } = await params;
  const user = await requireUser();
  const { group, members } = await getGroup(id, user.id);

  return (
    <PageShell nav={<AppNav name={user.name} />}>
      <p className="mx-auto mb-3 max-w-2xl">
        <Link href={`/groups/${group.id}`} className="text-link">
          Back to {group.name}
        </Link>
      </p>
      <div className="sheet mx-auto max-w-2xl px-5 pb-8 sm:px-9">
        <h1 className="font-display text-4xl">Add an entry</h1>
        <ExpenseForm
          groupId={group.id}
          members={members}
          currentUserId={user.id}
          today={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </PageShell>
  );
}
