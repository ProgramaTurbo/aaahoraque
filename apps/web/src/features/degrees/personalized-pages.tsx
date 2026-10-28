"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrientationTest } from "./orientation-test";
import { DegreesWorkspace } from "./degrees-workspace";
import { useOrientationSession } from "./orientation-session";

export function OrientationTestPage() {
  const session = useOrientationSession();
  const router = useRouter();
  function exitTest() {
    session.setDraft(undefined);
    session.setProfile(undefined);
    session.setStep(0);
    router.push("/degrees");
  }
  return <div className="space-y-5">
    <button type="button" onClick={exitTest} className="border border-[var(--color-border-light)] px-5 py-3 text-sm hover:border-[var(--color-degree-bright)]">Salir del test</button>
    <OrientationTest initial={session.draft ?? session.profile} initialStep={session.step} onStepChange={session.setStep} onDraftChange={session.setDraft}
      onComplete={(profile) => { session.setProfile(profile); session.setDraft(profile); router.push("/degrees/personalized-results"); }} />
  </div>;
}
export function OrientationResultsPage() {
  const { profile } = useOrientationSession();
  if (!profile) return <section className="space-y-5 border border-[var(--color-border)] p-8"><h2 className="text-2xl font-semibold">Todavía no hay un perfil completado</h2><p>Completa el test para ver tus opciones afines. Las respuestas se conservan al navegar por Carreras y se borran al recargar la página.</p><Link href="/degrees/personalized-test" className="inline-block bg-[var(--color-degree)] px-5 py-3 text-white">Ir al test de orientación</Link></section>;
  return <div className="space-y-6"><Link href="/degrees/personalized-test" className="text-[var(--color-degree-bright)] underline">Revisar mis respuestas y recalcular</Link><DegreesWorkspace key={JSON.stringify(profile)} profile={profile} /></div>;
}
