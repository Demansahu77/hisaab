import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const gambarino = localFont({
  src: "./fonts/Gambarino-Regular.woff2",
  variable: "--font-gambarino",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Hisaab", template: "%s · Hisaab" },
  description:
    "A shared ledger for flats and hostels. Add what you spent, and Hisaab works out who pays whom in the fewest payments.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${gambarino.variable} h-full antialiased`}>
      <body className="on-cloth flex min-h-full flex-col">{children}</body>
    </html>
  );
}
