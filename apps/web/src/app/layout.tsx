import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "AAAhoraQue?",
  description: "Sistema de Ayuda a la Toma de Decisiones Académicas",
};

const navigation = [
  { href: "/degrees", label: "Qué estudiar" },
  { href: "/erasmus", label: "Erasmus" },
  { href: "/subjects", label: "Asignaturas" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <nav
            aria-label="Navegación principal"
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"
          >
            <Link href="/" className="text-xl font-bold">
              AAAhoraQue?
            </Link>

            <div className="flex flex-wrap gap-5 text-sm">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:underline"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
          {children}
        </main>

        <footer className="border-t border-zinc-200 px-6 py-5 text-sm text-zinc-500 dark:border-zinc-800">
          <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3">
            <span>AAAhoraQue? · Equipo A³</span>
            <span>La decisión siempre es tuya.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
