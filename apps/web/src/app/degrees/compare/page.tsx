import type { Metadata } from "next";
import { DegreesWorkspace } from "@/features/degrees/degrees-workspace";
export const metadata: Metadata = { title: "Comparador general de carreras — AAAhoraQue?" };
export default function CompareDegreesPage() {
  return <div className="space-y-8"><header><h1 className="font-display text-4xl md:text-5xl">Comparador general de carreras</h1><p className="mt-4 text-[var(--color-fg-dim)]">Explora el catálogo y compara hasta tres ofertas, sin personalización.</p></header><DegreesWorkspace /></div>;
}
