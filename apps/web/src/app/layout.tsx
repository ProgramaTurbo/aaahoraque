// apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav, GuestAccountLinks } from "@/features/account/account-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AAAhoraQue? — Orientación Académica",
  description: "Sistema universitario de ayuda a la toma de decisiones académicas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="grain"></div>

        {/* Top Nav */}
        <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/5">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-10">
            <Link href="/" aria-label="Volver a la página principal" className="font-display text-2xl tracking-wider">
              AAAhoraQue<span className="text-[var(--color-accent)]">?</span>
            </Link>
            <nav className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm md:order-none md:w-auto lg:gap-9">
              <a href="/degrees" className="nav-link nav-link-degree">Carreras</a>
              <a href="/erasmus" className="nav-link nav-link-erasmus">Erasmus</a>
              <a href="/subjects" className="nav-link nav-link-subjects">Asignaturas</a>
            </nav>
            <Suspense fallback={<GuestAccountLinks />}><AccountNav /></Suspense>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--color-border)] bg-black py-8 mt-20">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-10 text-center font-mono text-xs text-[var(--color-muted)] tracking-[0.2em] uppercase">
            AAAhoraQue? · Equipo A³ — La decisión siempre es tuya.
          </div>
        </footer>
      </body>
    </html>
  );
}
