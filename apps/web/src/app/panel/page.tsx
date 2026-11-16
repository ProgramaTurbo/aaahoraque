import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountUser } from "@/lib/account/session";
import { getLastSavedPlan, getOfficialPlanContext, getStudentProfile, subjectsPlanPath } from "@/lib/account/profile";
import { ProfileForm } from "@/features/account/profile-form";
import { RemoveCurrentPlan } from "@/features/account/remove-current-plan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi panel · AAAhoraQue" };

export default async function PanelPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?next=%2Fpanel");

  const [profile, lastPlan] = await Promise.all([getStudentProfile(user.id), getLastSavedPlan(user.id)]);
  const currentPlan = profile?.currentStudyPlanId ? await getOfficialPlanContext(profile.currentStudyPlanId) : null;
  const preferredPlan = lastPlan ?? currentPlan;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-12 sm:py-16">
      <header className="space-y-3">
        <h1 className="font-display text-5xl">Mi panel</h1>
        <p className="text-[var(--color-fg-dim)]">{user.email}</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-5 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <h2 className="font-display text-2xl">Mi perfil</h2>
          <ProfileForm name={profile?.displayName ?? user.name} stage={profile?.academicStage ?? ""} languages={profile?.languages ?? []} />
        </section>
        <section className="space-y-5 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <h2 className="font-display text-2xl">Mi plan actual</h2>
          {currentPlan ? <><Link href={subjectsPlanPath(currentPlan)} className="underline">{currentPlan.name}</Link><RemoveCurrentPlan /></>
            : <p>Elige tu plan en <Link href="/subjects" className="underline">Asignaturas</Link> y márcalo como tu plan actual.</p>}
        </section>
      </div>
      <nav aria-label="Mis decisiones" className="grid gap-4 sm:grid-cols-3">
        <Link href="/degrees" className="border border-[var(--color-border)] border-t-[var(--color-degree)] p-5 hover:underline">Carreras</Link>
        <Link href="/erasmus" className="border border-[var(--color-border)] border-t-[var(--color-erasmus)] p-5 hover:underline">Erasmus</Link>
        <Link href={preferredPlan ? subjectsPlanPath(preferredPlan) : "/subjects"}
          className="border border-[var(--color-border)] border-t-[var(--color-subjects)] p-5 hover:underline">
          {preferredPlan ? "Continuar en Asignaturas" : "Explorar Asignaturas"}
        </Link>
      </nav>
    </div>
  );
}
