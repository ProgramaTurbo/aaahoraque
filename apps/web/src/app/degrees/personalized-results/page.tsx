import type { Metadata } from "next";
import { OrientationResultsPage } from "@/features/degrees/personalized-pages";
export const metadata: Metadata = { title: "Resultados personalizados de carreras — AAAhoraQue?" };
export default function ResultsPage() {
  return <div className="space-y-8"><h1 className="font-display text-4xl md:text-5xl">Resultados personalizados</h1><OrientationResultsPage /></div>;
}
