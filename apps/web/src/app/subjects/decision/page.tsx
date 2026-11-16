import Link from "next/link";
import { redirect } from "next/navigation";
import { DecisionWorkspace } from "@/features/subjects/decision-workspace";
import { getFavoriteSubjects } from "@/lib/account/favorites";
import { accountPath } from "@/lib/account/paths";
import { getOfficialPlanContext, getSavedPlanProgress, getStudentProfile, subjectsPlanPath, uuidPattern } from "@/lib/account/profile";
import { getAccountUser } from "@/lib/account/session";
import { getPlanSubjects } from "@/lib/subjects/catalog";
import { decisionPath } from "@/lib/subjects/decision";
import { getDecisionPlans, getOfficialEvidence, safeSourceUrl } from "@/lib/subjects/student-decisions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi ayuda a la decisión · AAAhoraQue" };

type SearchParams = Promise<{ plan?: string; tab?: string; scenario?: string; asignatura?: string }>;

export default async function DecisionPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tab = params.tab === "semestre" || params.tab === "escenarios" ? params.tab : "decidir";
  const scenarioId = typeof params.scenario === "string" && uuidPattern.test(params.scenario) ? params.scenario : undefined;
  const subjectId = typeof params.asignatura === "string" && uuidPattern.test(params.asignatura) ? params.asignatura : undefined;
  const user = await getAccountUser();
  if (!user) {
    const next = typeof params.plan === "string" && uuidPattern.test(params.plan)
      ? decisionPath(params.plan, tab, scenarioId) + (subjectId ? `&asignatura=${subjectId}` : "") : "/subjects/decision";
    redirect(accountPath("/login", next));
  }

  const id = params.plan ?? (await getStudentProfile(user.id))?.currentStudyPlanId;
  if (!id) redirect("/subjects");
  const plan = await getOfficialPlanContext(id);
  if (!plan) return <div className="mx-auto max-w-5xl space-y-4 px-5 py-10">
    <h1 className="font-display text-4xl">Elige un plan oficial</h1>
    <p>Selecciona en el catálogo una titulación con asignaturas oficiales para abrir tu ayuda a la decisión.</p>
    <Link href="/subjects?buscar=1" className="font-semibold text-subjects underline">Buscar mi plan</Link>
  </div>;

  const [subjects, progress, decisions, favorites] = await Promise.all([
    getPlanSubjects(plan.id), getSavedPlanProgress(user.id, plan.id), getDecisionPlans(user.id, plan.id),
    getFavoriteSubjects(user.id, plan.id),
  ]);
  const evidence = await getOfficialEvidence(plan.id, subjects);

  return <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 md:px-9 md:py-12">
    <header className="space-y-3">
      <nav aria-label="Contexto del plan" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-subjects">
        <Link href="/panel">← Mi panel</Link>
        <Link href={subjectsPlanPath(plan, "expediente")}>Editar expediente</Link>
        <Link href={subjectsPlanPath(plan, "preferencias")}>Editar prioridades del plan</Link>
      </nav>
      <h1 className="font-display text-4xl md:text-5xl">Mi ayuda a la decisión</h1>
      <p className="text-[var(--color-fg-dim)]">{[plan.degreeName, plan.universityName, plan.name === plan.degreeName ? null : plan.name].filter(Boolean).join(" · ")}</p>
    </header>
    <DecisionWorkspace key={`${plan.id}:${tab}:${scenarioId ?? ""}:${subjectId ?? ""}`}
      planId={plan.id} initialTab={tab} scenarioId={scenarioId} subjectId={subjectId}
      subjects={subjects.map((subject) => ({ ...subject, sourceUrl: safeSourceUrl(subject.sourceUrl) }))}
      progress={progress} decisions={decisions.map(({ id, kind, name, period, target, subjectIds, version, preferences }) =>
        ({ id, kind, name, period, target, subjectIds, version, preferences }))}
      evidence={evidence} favorites={favorites} />
  </div>;
}
