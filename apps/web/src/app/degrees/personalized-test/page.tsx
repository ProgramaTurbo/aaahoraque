import type { Metadata } from "next";
import { OrientationTestPage } from "@/features/degrees/personalized-pages";
export const metadata: Metadata = { title: "Test de orientación de carreras — AAAhoraQue?" };
export default function TestPage() {
  return <div className="space-y-8"><h1 id="orientation-test-title" className="scroll-mt-24 font-display text-4xl md:text-5xl">Test de orientación</h1><OrientationTestPage /></div>;
}
