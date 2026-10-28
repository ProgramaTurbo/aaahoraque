"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const labels: Record<string, string> = {
  "/degrees/compare": "COMPARADOR GENERAL",
  "/degrees/personalized-test": "GUÍA PERSONALIZADA - TEST",
  "/degrees/personalized-results": "GUÍA PERSONALIZADA - RESULTADOS",
};
export function DegreesNavigation() {
  const pathname = usePathname();
  return <header>
    <nav aria-label="Ruta de navegación de Carreras" className="flex flex-wrap gap-3 font-mono text-sm text-[var(--color-degree-bright)]">
      {pathname === "/degrees" ? <span aria-current="page">CARRERAS</span> : <><Link href="/degrees" className="underline">CARRERAS</Link><span aria-hidden="true">/</span><span aria-current="page">{labels[pathname] ?? "CARRERAS"}</span></>}
    </nav>
  </header>;
}
