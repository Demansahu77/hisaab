import Link from "next/link";
import { PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell>
      <div className="sheet mx-auto mt-6 max-w-md px-6 pb-9 sm:px-9">
        <h1 className="font-display text-4xl">No such page in this ledger</h1>
        <p className="mt-3 text-ink-soft">
          The link may be wrong, or you may not be a member of that ledger.
        </p>
        <Link href="/groups" className="btn mt-6">
          Back to your ledgers
        </Link>
      </div>
    </PageShell>
  );
}
