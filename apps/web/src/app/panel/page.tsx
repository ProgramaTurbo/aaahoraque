import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/features/account/profile-form";
import { RemoveCurrentPlan } from "@/features/account/remove-current-plan";
import { Favorites } from "@/features/panel/favorites";
import { getFavorites } from "@/lib/account/favorites";
import { getOfficialPlanContext, getSavedPlanProgress, getPlansWithSavedProgress, getStudentProfile, subjectsPlanPath } from "@/lib/account/profile";
import { getAccountUser } from "@/lib/account/session";
import { getPlanSubjects } from "@/lib/subjects/catalog";
import { creditsFormat, decisionPath, periodNames, selectionCredits } from "@/lib/subjects/decision";
import { subjectPreferenceFields } from "@/lib/subjects/progress";
import { getDecisionPlans, getMostRecentDecision } from "@/lib/subjects/student-decisions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi panel · AAAhoraQue" };

const card = "scroll-mt-32 rounded-2xl border border-border bg-bg-card p-5 sm:p-6";
const button = "inline-block rounded-lg border border-control-border px-3 py-2 text-sm font-semibold hover:bg-bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subjects";
const primary = "inline-block rounded-lg bg-subjects-fill px-4 py-2.5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subjects";
const muted = "text-sm text-[var(--color-fg-dim)]";
const date = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "Europe/Madrid" });

const sections = [
  ["continuar", "Continuar"], ["expediente", "Mi expediente"], ["semestre", "Próximo semestre"],
  ["escenarios", "Mis escenarios"], ["favoritos", "Favoritos"], ["pasos", "Próximos pasos"],
];

export default async function PanelPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?next=%2Fpanel");

  const profile = await getStudentProfile(user.id);
  const area = profile?.decisionGoal ?? "subjects";
  const profileHeader = <header id="perfil" className={`${card} space-y-5`}>
    <h1 className="font-display text-4xl md:text-5xl">Mi perfil</h1>
    <ProfileForm name={profile?.displayName ?? user.name} area={area} />
  </header>;
  if (area !== "subjects") return <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-9 md:py-12">
    {profileHeader}
    <section className={card} aria-label={area === "degree" ? "Carreras" : "Erasmus"}>
      <h2 className="text-xl font-semibold">Próximamente</h2>
    </section>
  </div>;

  const [savedPlans, lastDecision, favorites] = await Promise.all([
    getPlansWithSavedProgress(user.id), getMostRecentDecision(user.id), getFavorites(user.id),
  ]);
  const currentId = profile?.currentStudyPlanId;
  const current = currentId ? savedPlans.find((plan) => plan.id === currentId) ?? await getOfficialPlanContext(currentId) : null;
  const latest = savedPlans[0];
  const lastDecisionPlan = lastDecision
    ? [current, ...savedPlans].find((plan) => plan?.id === lastDecision.planId) ?? await getOfficialPlanContext(lastDecision.planId)
    : null;
  const recordPlan = current ?? latest ?? lastDecisionPlan;
  const [catalog, record, decisions] = recordPlan ? await Promise.all([
    getPlanSubjects(recordPlan.id), getSavedPlanProgress(user.id, recordPlan.id), getDecisionPlans(user.id, recordPlan.id),
  ]) : [[], null, []] as const;
  const draft = decisions.find((item) => item.kind === "draft");
  const scenarios = decisions.filter((item) => item.kind === "scenario");
  const latestDecision = lastDecision && (!latest || lastDecision.updatedAt >= latest.updatedAt) ? lastDecision : null;
  const resume = latestDecision && lastDecisionPlan ? {
    title: latestDecision.kind === "draft" ? "Borrador del semestre" : latestDecision.name ?? "Escenario",
    plan: lastDecisionPlan.degreeName, updatedAt: latestDecision.updatedAt,
    href: latestDecision.kind === "draft" ? decisionPath(lastDecisionPlan.id, "semestre") : decisionPath(lastDecisionPlan.id, "escenarios", latestDecision.id),
  } : latest ? {
    title: latest.lastSection === "preferencias" ? "Mis prioridades" : "Mi expediente",
    plan: latest.degreeName, updatedAt: latest.updatedAt,
    href: subjectsPlanPath(latest, latest.lastSection ?? "expediente"),
  } : null;
  const completed = new Set(record?.completed ?? []);
  const earned = selectionCredits(catalog.filter((subject) => completed.has(subject.id)));
  const courseYears = [...new Set(catalog.map((subject) => subject.year))].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const preferenceCount = record ? Object.values(record.preferences).filter((value) => value !== null).length : 0;
  const steps = [
    ...(!current ? [{ title: "Elige tu plan actual", href: "/subjects?buscar=1" }] : []),
    ...(recordPlan && !completed.size ? [{ title: "Revisa y guarda tu expediente", href: subjectsPlanPath(recordPlan, "expediente") }] : []),
    ...(recordPlan && preferenceCount < subjectPreferenceFields.length ? [{ title: "Completa las prioridades de tu plan", href: subjectsPlanPath(recordPlan, "preferencias") }] : []),
    ...(recordPlan && !draft?.subjectIds.length ? [{ title: "Prepara tu próximo semestre", href: decisionPath(recordPlan.id, "semestre") }] : []),
    ...(recordPlan && draft?.subjectIds.length && !scenarios.length ? [{ title: "Guarda una alternativa al borrador", href: decisionPath(recordPlan.id, "escenarios") }] : []),
  ];

  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 md:px-9 md:py-12">
    {profileHeader}

    <section aria-labelledby="current-plan-title" className="space-y-4 rounded-2xl border border-subjects-border bg-linear-to-br from-panel-start to-panel-end p-5 text-fg sm:p-7">
      <h2 id="current-plan-title" className="text-sm font-semibold text-subjects">Mi plan actual</h2>
      {current ? <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h3 className="text-2xl font-semibold">{current.degreeName}</h3>
            <p className={`${muted} mt-1`}>{[current.universityName, current.name === current.degreeName ? null : current.name].filter(Boolean).join(" · ")}</p></div>
          <Link href={decisionPath(current.id)} className={primary}>Abrir ayuda a la decisión →</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={subjectsPlanPath(current, "expediente")} className={button}>Actualizar expediente</Link>
          <Link href={subjectsPlanPath(current, "preferencias")} className={button}>Actualizar prioridades</Link>
          <Link href="/subjects?buscar=1" className={button}>Cambiar de plan</Link>
          <RemoveCurrentPlan />
        </div>
      </> : <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={muted}>Marca un plan oficial como actual para tener a mano su expediente y su ayuda a la decisión.</p>
        <Link href="/subjects?buscar=1" className={primary}>Buscar mi plan</Link>
      </div>}
    </section>

    <nav aria-label="Secciones del panel" className="flex flex-wrap gap-2">
      {sections.map(([id, label]) => <a key={id} className={button} href={`#${id}`}>{label}</a>)}
    </nav>

    <div className="grid gap-5 lg:grid-cols-2">
      <section id="continuar" className={card}>
        <h2 className="text-xl font-semibold">Continuar</h2>
        {resume ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="font-semibold">{resume.title}</p>
            <p className={muted}>{resume.plan} · {date.format(resume.updatedAt)}</p></div>
          <Link href={resume.href} className={button}>Retomar</Link>
        </div> : <p className={`${muted} mt-3`}>Aquí podrás retomar tu último expediente, prioridades, borrador o escenario guardado.</p>}
      </section>

      <section id="pasos" className={card}>
        <h2 className="text-xl font-semibold">Próximos pasos</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {steps.slice(0, 3).map((step) => <li key={step.href}><Link href={step.href} className="font-semibold text-subjects underline underline-offset-2">{step.title} →</Link></li>)}
        </ul>
        {steps.length === 0 && <p className={muted}>Tu expediente, tus prioridades y tu planificación están configurados.</p>}
      </section>

      <section id="expediente" className={`${card} lg:row-span-2`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Mi expediente</h2>
          {recordPlan && <Link href={subjectsPlanPath(recordPlan, "expediente")} className={button}>Editar expediente</Link>}
        </div>
        {recordPlan ? <>
          <p className={`${muted} mt-2`}>{recordPlan.degreeName} · {creditsFormat.format(earned)} de {creditsFormat.format(Number(recordPlan.totalEcts))} ECTS declarados como superados</p>
          {Number(recordPlan.totalEcts) > 0 && <progress className="mt-3 h-2 w-full accent-subjects-fill"
            aria-label="ECTS declarados como superados" max={Number(recordPlan.totalEcts)} value={Math.min(earned, Number(recordPlan.totalEcts))} />}
          {courseYears.length === 0 && <p className={`${muted} mt-3`}>Este plan aún no tiene asignaturas publicadas en el catálogo.</p>}
          <div className="mt-4 divide-y divide-border">
            {courseYears.map((year) => {
              const items = catalog.filter((item) => item.year === year);
              const passed = items.filter((item) => completed.has(item.id));
              return <details className="py-2" key={year ?? "unknown"}>
                <summary className="cursor-pointer text-sm font-semibold">{year ? `Curso ${year}` : "Curso sin indicar"}
                  <span className={`ml-2 font-normal ${muted}`}>{passed.length} de {items.length} superadas · {creditsFormat.format(selectionCredits(passed))} ECTS</span></summary>
                <ul className="mt-2 space-y-1 text-sm">
                  {items.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2">
                    <span>{item.name}</span><span className={muted}>{completed.has(item.id) ? "Superada" : "Sin marcar"}</span>
                  </li>)}
                </ul>
                <Link href={subjectsPlanPath(recordPlan, "expediente", year === null ? "sin-curso" : String(year))}
                  className={`${button} mt-3`}>Editar este curso</Link>
              </details>;
            })}
          </div>
        </> : <p className={`${muted} mt-3`}>Elige un plan oficial para consultar el expediente por curso.</p>}
        {savedPlans.some((plan) => plan.id !== recordPlan?.id) && <details className="mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer text-sm font-semibold">Expedientes de otros planes</summary>
          <ul className="mt-2 space-y-2 text-sm">
            {savedPlans.filter((plan) => plan.id !== recordPlan?.id).map((plan) => <li key={plan.id}>
              <Link href={subjectsPlanPath(plan, "expediente")} className="font-semibold text-subjects underline">{plan.degreeName} · {plan.name}</Link>
            </li>)}
          </ul>
        </details>}
      </section>

      <section id="semestre" className={card}>
        <h2 className="text-xl font-semibold">Próximo semestre</h2>
        {draft ? <p className={`${muted} mt-2`}>{periodNames[draft.period]} · {creditsFormat.format(selectionCredits(catalog.filter((item) => draft.subjectIds.includes(item.id))))} de {draft.target} ECTS previstos</p>
          : <p className={`${muted} mt-2`}>Elige el periodo, fija tu objetivo de ECTS y guarda una propuesta para tu próxima matrícula.</p>}
        {recordPlan && <Link href={decisionPath(recordPlan.id, "semestre")} className={`${button} mt-3`}>{draft ? "Abrir borrador" : "Preparar semestre"}</Link>}
      </section>

      <section id="escenarios" className={card}>
        <h2 className="text-xl font-semibold">Mis escenarios</h2>
        {scenarios.length ? <ul className="mt-3 space-y-2 text-sm">
          {scenarios.slice(0, 3).map((scenario) => <li key={scenario.id}><Link className="font-semibold text-subjects underline"
            href={decisionPath(scenario.planId, "escenarios", scenario.id)}>{scenario.name}</Link></li>)}
        </ul> : <p className={`${muted} mt-2`}>Guarda combinaciones de asignaturas y prioridades para comparar tus alternativas.</p>}
        {recordPlan && <Link href={decisionPath(recordPlan.id, "escenarios")} className={`${button} mt-3`}>{scenarios.length ? "Abrir escenarios" : "Crear un escenario"}</Link>}
      </section>
    </div>

    <section id="favoritos" className={card}>
      <h2 className="text-xl font-semibold">Favoritos</h2>
      <Favorites favorites={favorites} />
    </section>

  </div>;
}
