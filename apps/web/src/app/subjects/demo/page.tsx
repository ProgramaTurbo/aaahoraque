import Link from "next/link";
import type { Metadata } from "next";
import { getSubjectsDemo716 } from "@/lib/subjects/demo716";
import { SubjectsDemoDashboard } from "@/features/subjects/subjects-demo-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Observatorio de optativas · Ingeniería Informática 716 — AAAhoraQue",
  description: "Dashboard de análisis académico con optativas reales y estadísticas sintéticas diferenciadas.",
};

export default async function SubjectsDemoPage() {
  try {
    const data = await getSubjectsDemo716();
    return <main className="bg-textured min-h-screen">
      <div className="mx-auto max-w-[1700px] px-4 py-8 md:px-8 xl:px-10">
        <nav aria-label="Ruta de navegación" className="mb-6 flex flex-wrap gap-3 font-mono text-xs tracking-wider text-[var(--color-fg-dim)]">
          <Link href="/" className="hover:text-[var(--color-fg)]">AAAHORAQUE?</Link>
          <span>/</span>
          <Link href="/subjects" className="hover:text-[var(--color-fg)]">ASIGNATURAS</Link>
          <span>/</span><span className="text-[var(--color-subjects)]">OBSERVATORIO DEMO</span>
        </nav>
        <SubjectsDemoDashboard data={data}/>
      </div>
    </main>;
  } catch (error) {
    console.error("[DSS716] Error al consultar el observatorio:", error);
    return <main className="bg-textured min-h-screen px-6 py-24">
      <section className="mx-auto max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 md:p-12">
        <p className="section-marker section-marker-subjects">OBSERVATORIO / FUENTE DE DATOS</p>
        <h1 className="font-display mt-6 text-4xl">NO SE PUEDE CARGAR EL OBSERVATORIO.</h1>
        <p className="mt-5 text-sm leading-relaxed text-[var(--color-fg-dim)]">
          Comprueba que Next.js use DATABASE_URL y que exista el esquema dss_demo_716_v2.
          El error concreto se registra en el terminal de Next.js. No se muestran estadísticas inventadas.
        </p>
        <Link href="/subjects" className="mt-8 inline-block font-semibold text-[var(--color-subjects)]">Volver a asignaturas →</Link>
      </section>
    </main>;
  }
}
