import Link from "next/link";
import { formatPaise } from "@/lib/money";

/** Rupee amount. The sign glyph is set in the body face so it looks the same
    whether or not the display font ships a rupee symbol. */
export function Amount({
  paise,
  sign = false,
  className = "",
}: {
  paise: number;
  sign?: boolean;
  className?: string;
}) {
  const text = formatPaise(paise, { sign });
  const [prefix, digits] = text.split("₹");
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {prefix}
      <span className="font-sans text-[0.8em] font-semibold">₹</span>
      <span className="ml-[0.08em]">{digits}</span>
    </span>
  );
}

/** Up-right arrow drawn to match the squared-off buttons. */
export function Arrow() {
  return (
    <svg
      className="arrow"
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <path d="M2.5 10.5 10 3M4 2.5h6.5V9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-display text-[1.9rem] leading-none tracking-wide">
      hisaab
    </Link>
  );
}

export function PageShell({
  children,
  nav,
}: {
  children: React.ReactNode;
  nav?: React.ReactNode;
}) {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-5 py-6 sm:px-8">
        <Wordmark href={nav ? "/groups" : "/"} />
        <nav className="flex items-center gap-5 text-[0.95rem]">{nav}</nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-20 sm:px-8">{children}</main>
    </>
  );
}

/** Shown while a signed-in page streams in behind its Suspense boundary. */
export function LoadingShell() {
  return (
    <PageShell>
      <div className="sheet mt-2 px-5 pb-10 sm:px-9">
        <p className="font-display text-3xl">Opening the ledger…</p>
      </div>
    </PageShell>
  );
}
