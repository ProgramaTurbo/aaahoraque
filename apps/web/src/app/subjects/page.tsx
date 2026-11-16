import Link from "next/link";
import { redirect } from "next/navigation";
import { decisionPath } from "@/lib/subjects/decision";
import type { Metadata } from "next";
import {
  getSubjectUniversities,
  getSubjectPlans,
  getPlanSubjects,
} from "@/lib/subjects/catalog";
import { getAccountUser } from "@/lib/account/session";
import { getOfficialPlanContext, getSavedPlanProgress, getStudentProfile, subjectsPlanPath } from "@/lib/account/profile";
import { subjectTab } from "@/lib/subjects/progress";
import { SubjectsExperience } from "@/features/subjects/subjects-experience";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Decisión de asignaturas — AAAhoraQue?",
  description: "Explora tu plan, declara las asignaturas superadas y compara alternativas con información académica trazable.",
};

type SearchParams = Promise<{ university?: string; plan?: string; section?: string; buscar?: string; curso?: string }>;

export default async function SubjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const user = await getAccountUser().catch(() => null);
  const context = await (async () => {
    try {
      const profile = user ? await getStudentProfile(user.id) : null;
      const universities = await getSubjectUniversities();
      const isInitialVisit = !params.university && !params.plan && params.buscar !== "1";
      const current = isInitialVisit && profile?.currentStudyPlanId
        ? await getOfficialPlanContext(profile.currentStudyPlanId)
        : null;
      const universityId = params.university ?? current?.universityId;
      const selectedUniversity = universities.find((u) => u.id === universityId);
      const plans = selectedUniversity ? await getSubjectPlans(selectedUniversity.id) : [];
      const planId = params.plan ?? current?.id;
      const selectedPlan = plans.find((p) => p.id === planId);
      const subjects = selectedPlan ? await getPlanSubjects(selectedPlan.id) : [];
      const progress = user && selectedPlan?.status === "official"
        ? await getSavedPlanProgress(user.id, selectedPlan.id)
        : null;
      return { universities, selectedUniversity, plans, selectedPlan, subjects, progress, currentPlanId: profile?.currentStudyPlanId };
    } catch (error) {
      console.error("[SUBJECTS] Error al cargar el catálogo:", error);
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
  const { universities, selectedUniversity, plans, selectedPlan, subjects, progress, currentPlanId } = context;

  if (params.section === "comparar" && selectedPlan?.status === "official") redirect(decisionPath(selectedPlan.id));
  const initialRecordYear = subjects.some((subject) => String(subject.year ?? "sin-curso") === params.curso) ? params.curso : undefined;

  const workspace = selectedPlan && selectedUniversity ? {
    signedIn: Boolean(user),
    initialTab: subjectTab(params.section),
    initialRecordYear,
    initialProgress: progress,
    returnTo: subjectsPlanPath({ id: selectedPlan.id, universityId: selectedUniversity.id }),
    planId: selectedPlan.id,
    planName: selectedPlan.planName,
    degreeName: selectedPlan.degreeName,
    centerName: selectedPlan.centerName,
    totalEcts: selectedPlan.totalEcts,
    status: selectedPlan.status,
    subjects,
  } : undefined;

  return (
    <div className="bg-textured min-h-screen">
      <div className="mx-auto max-w-7xl space-y-7 px-5 py-8 md:px-9 md:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl leading-none md:text-5xl">Asignaturas</h1>
            <p className="mt-3 max-w-xl text-[var(--color-fg-dim)]">Consulta tu plan, lleva tu expediente y compara asignaturas.</p>
          </div>
          <Link href="/subjects/demo" className="rounded-lg border border-subjects-border bg-subjects-surface px-4 py-2.5 text-sm font-semibold text-subjects hover:bg-subjects-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subjects">
            Probar la demo de optativas →
          </Link>
        </header>
        <SubjectsExperience
          universities={universities.map((university) => ({
            id: university.id, label: university.name,
            keywords: university.name === "Universidad de Zaragoza" ? "UNIZAR" : undefined,
          }))}
          plans={plans.map((plan) => ({
            id: plan.id,
            label: plan.degreeName,
            detail: [
              plan.centerName,
              plan.planName === plan.degreeName ? null : plan.planName,
              plan.planCode && !plan.planName.includes(plan.planCode) && plan.status === "official" ? `Plan ${plan.planCode}` : null,
              plan.status === "synthetic" ? "Simulado" : null,
            ].filter(Boolean).join(" · "),
            keywords: plan.planCode ?? undefined,
          }))}
          universityId={selectedUniversity?.id}
          currentPlanId={currentPlanId}
          workspace={workspace}
          signedIn={Boolean(user)}
        />
      </div>
    </div>
  );
}
