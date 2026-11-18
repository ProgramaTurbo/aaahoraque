"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrientationProfileView } from "./orientation-profile-view";
import { OrientationTest } from "./orientation-test";
import { DegreesWorkspace } from "./degrees-workspace";
import { useOrientationSession } from "./orientation-session";
import { createRandomProfile, orientationReviewStep } from "./orientation-profile";

export function OrientationTestPage() {
  const session = useOrientationSession();
  const router = useRouter();
  function exitTest() {
    session.setDraft(undefined);
    session.setProfile(undefined);
    session.setStep(0);
    session.setIsRandomProfile(false);
    router.push("/degrees");
  }
  function randomizeTest() {
    const profile = createRandomProfile();
    session.setProfile(profile);
    session.setDraft(profile);
    session.setStep(orientationReviewStep);
    session.setIsRandomProfile(true);
    router.push("/degrees/personalized-results");
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3">
    <button type="button" onClick={exitTest} className="border border-[var(--color-border-light)] px-5 py-3 text-sm hover:border-[var(--color-degree-bright)]">Salir del test</button>
    <button type="button" onClick={randomizeTest} className="border border-[var(--color-degree-bright)] px-5 py-3 text-sm text-[var(--color-degree-bright)] hover:bg-[var(--color-degree)]/10">Autocompletado aleatorio</button>
    </div>
    <OrientationTest initial={session.draft ?? session.profile} initialStep={session.step} onStepChange={session.setStep} onDraftChange={session.setDraft}
      onComplete={(profile) => { session.setProfile(profile); session.setDraft(profile); router.push("/degrees/personalized-results"); }} />
  </div>;
}
export function OrientationResultsPage() {
  const { profile, isRandomProfile } = useOrientationSession();
  if (!profile) return <section className="space-y-5 border border-[var(--color-border)] p-8"><h2 className="text-2xl font-semibold">Todavía no hay un perfil completado</h2><p>Completa el test para ver tus opciones afines. Puedes recuperar tu borrador en esta pestaña desde el test.</p><Link href="/degrees/personalized-test" className="inline-block bg-[var(--color-degree)] px-5 py-3 text-white">Ir al test de orientación</Link></section>;
  return <div className="space-y-6">{isRandomProfile && <p role="status" className="border border-[var(--color-degree)] bg-[var(--color-bg-card)] p-4 text-sm">Perfil de prueba generado aleatoriamente. Las respuestas son simuladas; puedes revisarlas y modificarlas.</p>}<Link href="/degrees/personalized-test" className="text-[var(--color-degree-bright)] underline">Revisar mis respuestas y recalcular</Link><details className="space-y-4 border border-[var(--color-border)] p-5"><summary className="cursor-pointer font-semibold">Ver mi perfil y sus valoraciones</summary><OrientationProfileView profile={profile} /></details><DegreesWorkspace key={JSON.stringify(profile)} profile={profile} /></div>;
}
