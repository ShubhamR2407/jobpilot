import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@jobpilot/core";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_TAGLINE,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Providers>
          <nav className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3">
              <span className="font-bold tracking-tight">{APP_NAME}</span>
              <Link
                href="/"
                className="text-sm text-neutral-400 hover:text-neutral-100"
              >
                Dashboard
              </Link>
              <Link
                href="/board"
                className="text-sm text-neutral-400 hover:text-neutral-100"
              >
                Board
              </Link>
            </div>
          </nav>
          {children}
        </Providers>
      </body>
    </html>
  );
}
