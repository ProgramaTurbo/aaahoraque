import Link from "next/link";
import type { Metadata } from "next";
import { getSubjectUniversities, getSubjectPlans, getPlanSubjects } from "@/lib/subjects/catalog";
import { SubjectsWorkspace } from "@/features/subjects/subjects-workspace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Decisión de asignaturas — AAAhoraQue?",
  description: "Explora tu plan, declara las asignaturas superadas y compara alternativas con información académica trazable.",
};

type SearchParams = Promise<{ university?: string; plan?: string }>;
const selectClass = "w-full border border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-5 py-4 text-[var(--color-fg)] focus:border-[var(--color-subjects)] focus:outline-none";

export default async function SubjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const context = await (async () => {
    try {
      const universities = await getSubjectUniversities();
      const selectedUniversity = universities.find((u) => u.id === params.university);
      const plans = selectedUniversity ? await getSubjectPlans(selectedUniversity.id) : [];
      const selectedPlan = plans.find((p) => p.id === params.plan);
      const subjects = selectedPlan ? await getPlanSubjects(selectedPlan.id) : [];
      return { universities, selectedUniversity, plans, selectedPlan, subjects };
    } catch {
      return null;
    }
  })();

  if (!context) {
    return (
      <main className="bg-textured min-h-screen px-6 py-24">
        <div className="mx-auto max-w-3xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10">
          <div className="section-marker section-marker-subjects">CONEXIÓN CON EL CATÁLOGO</div>
          <h1 className="font-display mt-6 text-4xl">CATÁLOGO NO DISPONIBLE.</h1>
          <p className="mt-5 text-[var(--color-fg-dim)]">No se pueden consultar las asignaturas en este momento. Comprueba la conexión con PostgreSQL e inténtalo de nuevo. No mostraremos datos inventados.</p>
          <Link href="/" className="mt-8 inline-block font-semibold text-[var(--color-subjects)]">Volver a la portada →</Link>
        </div>
      </main>
    );
  }
  const { universities, selectedUniversity, plans, selectedPlan, subjects } = context;

  return (
    <main className="bg-textured min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-[1500px] px-5 py-12 md:px-10 md:py-16">
        <nav aria-label="Ruta de navegación" className="mb-10 flex flex-wrap items-center gap-3 font-mono text-xs tracking-wider text-[var(--color-fg-dim)]">
          <Link href="/" className="hover:text-[var(--color-fg)]">AAAHORAQUE?</Link><span aria-hidden="true">/</span>
          <span className="text-[var(--color-subjects)]">ASIGNATURAS</span>
          <span className="mx-1 opacity-40">·</span>
          <Link href="/explorar/titulaciones" className="hover:text-[var(--color-subjects)]">EXPLORAR TITULACIONES ↗</Link>
        </nav>

        <header className="mb-14 max-w-5xl">
          <div className="section-marker section-marker-subjects mb-6">SISTEMA DE AYUDA A LA DECISIÓN</div>
          <h1 className="font-display text-[clamp(3.1rem,7vw,7rem)] leading-[0.94] tracking-tight">
            TU CAMINO.<br /><span className="text-[var(--color-subjects)]">TUS ASIGNATURAS.</span><br />TU DECISIÓN.
          </h1>
          <p className="mt-7 max-w-3xl text-base leading-relaxed text-[var(--color-fg-dim)] md:text-lg">
            Conoce tu plan académico, organiza tu expediente y compara alternativas. Tú decides; AAAhoraQue aporta estructura y transparencia.
          </p>
        </header>

        <section aria-label="Seleccionar contexto académico" className="mb-12 grid gap-5 border-y border-[var(--color-border)] py-8 lg:grid-cols-2">
          <form action="/subjects" method="GET" className="space-y-3">
            <label htmlFor="university" className="block font-mono text-xs tracking-widest text-[var(--color-subjects)]">01 / UNIVERSIDAD</label>
            <select id="university" name="university" required defaultValue={selectedUniversity?.id ?? ""} className={selectClass}>
              <option value="" disabled>Selecciona tu universidad</option>
              {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button type="submit" className="bg-[var(--color-subjects)] px-6 py-3 font-heading text-sm text-[#07151b] hover:brightness-110">Continuar →</button>
          </form>
          {selectedUniversity ? (
            <form action="/subjects" method="GET" className="space-y-3">
              <input type="hidden" name="university" value={selectedUniversity.id} />
              <label htmlFor="plan" className="block font-mono text-xs tracking-widest text-[var(--color-subjects)]">02 / TITULACIÓN Y PLAN</label>
              <select id="plan" name="plan" required defaultValue={selectedPlan?.id ?? ""} className={selectClass}>
                <option value="" disabled>Selecciona un plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.degreeName}{p.centerName ? ` · ${p.centerName}` : ""} · {p.planName}{p.status === "synthetic" ? " [DATOS SIMULADOS]" : ""}</option>)}
              </select>
              <button type="submit" className="border border-[var(--color-subjects)] px-6 py-3 font-heading text-sm text-[var(--color-subjects)] hover:bg-[var(--color-subjects)]/10">Abrir mi espacio →</button>
            </form>
          ) : (
            <div className="flex flex-col justify-center border-l border-[var(--color-border)] px-5 text-sm leading-relaxed text-[var(--color-fg-dim)]">
              <span className="font-mono text-xs tracking-widest text-[var(--color-subjects)]">02 / TITULACIÓN Y PLAN</span>
              <p className="mt-3">Primero selecciona una universidad para consultar los planes disponibles.</p>
            </div>
          )}
        </section>

        {selectedPlan ? (
          <SubjectsWorkspace
            key={selectedPlan.id}
            planId={selectedPlan.id}
            planName={selectedPlan.planName}
            degreeName={selectedPlan.degreeName}
            centerName={selectedPlan.centerName}
            totalEcts={selectedPlan.totalEcts}
            status={selectedPlan.status}
            subjects={subjects}
          />
        ) : (
          <section className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-card)] px-7 py-12 md:px-12 md:py-16">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[var(--color-subjects)] opacity-[0.07] blur-3xl" aria-hidden="true" />
            <div className="relative max-w-3xl">
              <div className="section-marker section-marker-subjects">UN RECORRIDO, CUATRO ETAPAS</div>
              <h2 className="font-display mt-5 text-3xl md:text-5xl">DE LA INFORMACIÓN A LA DECISIÓN.</h2>
              <p className="mt-5 text-[var(--color-fg-dim)]">Al seleccionar un plan podrás explorar sus asignaturas, organizar lo que has superado, definir tus prioridades y comparar las alternativas disponibles.</p>
            </div>
            <div className="relative mt-10 grid gap-4 md:grid-cols-4">
              {[
                ["01", "Explorar", "Conocer las asignaturas"],
                ["02", "Mi expediente", "Situar tu progreso"],
                ["03", "Mis prioridades", "Explicar qué valoras"],
                ["04", "Comparar", "Entender las diferencias"],
              ].map(([number, title, description]) => (
                <div key={number} className="border-t border-[var(--color-subjects)] bg-[var(--color-bg-darker)] p-5">
                  <span className="font-mono text-xs text-[var(--color-subjects)]">{number} /</span>
                  <h3 className="font-heading mt-3 text-lg">{title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-dim)]">{description}</p>
                </div>
              ))}
            </div>
            <p className="relative mt-8 text-xs text-[var(--color-muted)]">La información académica se distingue por su procedencia. Los planes generados para simulación no permiten recomendaciones reales de matrícula.</p>
          </section>
        )}
      </div>
    </main>
  );
}
