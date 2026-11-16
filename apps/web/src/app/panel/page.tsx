import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountUser } from "@/lib/account/session";
import { getOfficialPlanContext, getSavedPlanSummaries, getStudentProfile, subjectsPlanPath } from "@/lib/account/profile";
import { ProfileForm } from "@/features/account/profile-form";
import { RemoveCurrentPlan } from "@/features/account/remove-current-plan";
import { subjectPreferenceFields } from "@/lib/subjects/progress";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi panel · AAAhoraQue" };

const card = "rounded-2xl border border-white/10 bg-[var(--color-bg-card)] p-5 sm:p-7";
const smallLink = "rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10";
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" });

export default async function PanelPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?next=%2Fpanel");

  const [profile, savedPlans] = await Promise.all([getStudentProfile(user.id), getSavedPlanSummaries(user.id)]);
  const currentId = profile?.currentStudyPlanId;
  const current = currentId ? savedPlans.find((plan) => plan.id === currentId) ?? await getOfficialPlanContext(currentId) : null;
  const lastSaved = savedPlans[0];
  const resume = current ?? lastSaved;
  const activeProgress = resume ? savedPlans.find((plan) => plan.id === resume.id) : undefined;
  const credits = activeProgress?.earnedCredits ?? 0;
  const total = resume ? Number(resume.totalEcts) : 0;
  const metrics = [
    { label: "ECTS superados", value: total > 0 ? `${number.format(credits)} / ${number.format(total)}` : number.format(credits) },
    { label: "Asignaturas superadas", value: activeProgress?.completedCount ?? 0 },
    { label: "Prioridades respondidas", value: `${activeProgress?.answered ?? 0} / ${subjectPreferenceFields.length}` },
    { label: "Asignaturas en comparación", value: activeProgress?.alternatives.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 md:px-9 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-violet-300">Mi panel</p>
          <h1 className="font-display text-4xl leading-none md:text-5xl">Hola, {profile?.displayName ?? user.name}</h1>
        </div>
        <a href="#perfil" className={smallLink}>Editar mi perfil</a>
      </header>

      <section aria-labelledby="academic-panel-title" className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#181323] to-[#10232b] p-5 sm:p-7">
        <h2 id="academic-panel-title" className="text-xl font-semibold">{current ? "Mi plan actual" : resume ? "Último plan guardado" : "Mi espacio académico"}</h2>
        {resume ? <>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold">{resume.degreeName}</h3>
              <p className="mt-1.5 text-sm text-[var(--color-fg-dim)]">{[resume.universityName, resume.name === resume.degreeName ? null : resume.name].filter(Boolean).join(" · ")}</p>
            </div>
            <Link href={subjectsPlanPath(resume)} className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07151b] hover:bg-cyan-200">Continuar en Asignaturas →</Link>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
              <dt className="text-xs text-[var(--color-fg-dim)] sm:text-sm">{metric.label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</dd>
            </div>)}
          </dl>
          {total > 0 && <progress aria-label="ECTS declarados respecto al total del plan" max={total} value={Math.min(total, credits)}
            className="mt-4 h-2 w-full accent-cyan-300" />}
          <p className="mt-2 text-xs text-[var(--color-fg-dim)]">El progreso se calcula con las asignaturas que has marcado como superadas.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={subjectsPlanPath(resume, "expediente")} className={smallLink}>Mi expediente</Link>
            <Link href={subjectsPlanPath(resume, "preferencias")} className={smallLink}>Mis prioridades</Link>
            <Link href={subjectsPlanPath(resume, "comparar")} className={smallLink}>Mi comparación</Link>
            <Link href="/subjects?buscar=1" className={smallLink}>Buscar otro plan</Link>
          </div>
        </> : <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-lg text-[var(--color-fg-dim)]">Busca tu titulación para elegir un plan y empezar a guardar tu expediente.</p>
          <Link className="rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07151b]" href="/subjects">Buscar mi plan →</Link>
        </div>}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section aria-labelledby="saved-plans-title" className={card}>
          <h2 id="saved-plans-title" className="text-xl font-semibold">Planes con progreso guardado</h2>
          {savedPlans.length > 0 ? <ul className="mt-4 divide-y divide-white/10">
            {savedPlans.map((plan) => <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">{plan.degreeName}</p>
                <p className="mt-1 text-sm text-[var(--color-fg-dim)]">{plan.universityName} · {plan.name}</p>
                <p className="mt-1 text-xs text-[var(--color-fg-dim)]">{plan.completedCount} superadas · {plan.alternatives.length} en comparación · {date.format(plan.updatedAt)}</p>
              </div>
              <Link href={subjectsPlanPath(plan)} className={smallLink}>Abrir plan</Link>
            </li>)}
          </ul> : <p className="mt-3 text-sm text-[var(--color-fg-dim)]">Aquí aparecerán los planes cuando guardes cambios en Asignaturas.</p>}
        </section>
        <section aria-labelledby="comparison-panel-title" className={card}>
          <h2 id="comparison-panel-title" className="text-xl font-semibold">Mi comparación</h2>
          {activeProgress?.alternatives.length ? <ul className="mt-3 divide-y divide-white/10">
            {activeProgress.alternatives.map((subject) => <li key={subject.id} className="flex justify-between gap-4 py-3 text-sm">
              <span>{subject.name}</span><span className="shrink-0 text-cyan-200">{number.format(Number(subject.ects))} ECTS</span>
            </li>)}
          </ul> : <p className="mt-3 text-sm text-[var(--color-fg-dim)]">Añade asignaturas a la comparación y guarda tu selección.</p>}
          {resume && <Link href={subjectsPlanPath(resume, "comparar")} className="mt-4 inline-block text-sm font-semibold text-cyan-200 underline">Ir a la comparación →</Link>}
        </section>
      </div>

      <nav aria-label="Más herramientas" className="grid gap-3 sm:grid-cols-2">
        <Link href="/degrees" className={`${card} border-l-blue-400/60 hover:bg-white/5`}>
          <span className="font-semibold">Carreras →</span><span className="mt-1 block text-sm text-[var(--color-fg-dim)]">Explora y compara titulaciones.</span>
        </Link>
        <Link href="/erasmus" className={`${card} border-l-emerald-400/60 hover:bg-white/5`}>
          <span className="font-semibold">Erasmus →</span><span className="mt-1 block text-sm text-[var(--color-fg-dim)]">Compara tus opciones de movilidad.</span>
        </Link>
      </nav>

      <section id="perfil" aria-labelledby="profile-panel-title" className={`${card} scroll-mt-32 space-y-5`}>
        <div>
          <h2 id="profile-panel-title" className="text-xl font-semibold">Mi perfil</h2>
          <p className="mt-1 text-sm text-[var(--color-fg-dim)]">{user.email}</p>
        </div>
        <ProfileForm name={profile?.displayName ?? user.name} stage={profile?.academicStage ?? ""} languages={profile?.languages ?? []} />
        {current && <div className="border-t border-white/10 pt-3"><RemoveCurrentPlan /></div>}
      </section>
    </div>
  );
}
