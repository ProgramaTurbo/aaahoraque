import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Carreras — AAAhoraQue?" };
export default function DegreesPage() {
  return <div className="space-y-10">
    <header><h1 className="font-display text-4xl md:text-6xl">¿Qué quieres estudiar?</h1><p className="mt-5 max-w-3xl text-[var(--color-fg-dim)]">Descubre qué opciones encajan con tus intereses y condiciones. Empieza por tu perfil o explora las ofertas disponibles.</p></header>
    <section className="max-w-3xl border border-[var(--color-degree)] bg-[var(--color-bg-card)] p-8 md:p-12">
      <p className="font-mono text-sm text-[var(--color-degree-bright)]">PRIMERO, VAMOS A CONOCERTE</p>
      <h2 className="mt-4 text-3xl font-semibold">Encuentra opciones que tengan sentido para ti</h2>
      <p className="mt-5 text-[var(--color-fg-dim)]">Cuéntanos qué te interesa, cómo te ves y dónde podrías estudiar. Puedes dejar cualquier respuesta sin definir y cambiarla después.</p>
      <p className="mt-4 text-sm">Test orientativo de seis pasos. Incluye autoevaluación, no una medición de capacidades.</p>
      <Link href="/degrees/personalized-test" className="mt-7 inline-block bg-[var(--color-degree)] px-6 py-4 font-semibold text-white">Empezar mi orientación →</Link>
      <Link href="/degrees/compare" className="mt-5 block text-sm underline">Explorar el comparador general</Link>
    </section>
  </div>;
}
