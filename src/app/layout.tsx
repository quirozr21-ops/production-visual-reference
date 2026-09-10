import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Production Visual Reference",
  description: "Controlled manufacturing visual reference system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href="/" className="brand">PRODUCTION VISUAL REFERENCE</Link>
            <Link href="/admin">Dashboard</Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
