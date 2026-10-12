import Link from "next/link";
import { Demo } from "@/components/demo";
import { Arrow, PageShell } from "@/components/ui";

export default function Home() {
  return (
    <PageShell
      nav={
        <Link href="/login" className="text-link">
          Log in
        </Link>
      }
    >
      <section className="grid items-end gap-x-10 gap-y-6 pt-6 pb-10 sm:pt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <h1 className="font-display text-[clamp(3rem,9vw,6.5rem)] leading-[0.98] text-balance">
          Hostel ka hisaab, saaf.
        </h1>
        <div className="max-w-sm lg:pb-3">
          <p className="text-lg leading-relaxed">
            Write down who paid for what. Hisaab works out who pays whom, in the fewest payments.
          </p>
          <Link href="/signup" className="btn btn-paper mt-5">
            Open a ledger <Arrow />
          </Link>
        </div>
      </section>

      <Demo />

      <footer className="mt-16 max-w-xl text-[0.95rem] leading-relaxed text-paper/85">
        <p>
          Built by Deman Sahu with Next.js, TypeScript and SQLite. Amounts are stored as whole
          paise, so a three-way split of ₹100 never loses a paisa.
        </p>
        <p className="mt-2">
          <a className="text-link" href="https://github.com/Demansahu77/hisaab">
            Read the source on GitHub
          </a>
        </p>
      </footer>
    </PageShell>
  );
}
