import { getAccountUser } from "@/lib/account/session";
import { QuickOrientation } from "./quick-orientation";

export const metadata = { title: "Orientación rápida · AAAhoraQue" };

export default async function QuickOrientationPage() {
  const user = await getAccountUser();
  return <div className="mx-auto max-w-3xl space-y-6 px-5 py-12 sm:py-16">
    <h1 className="font-display text-5xl">Orientación rápida</h1>
    <p className="text-[var(--color-fg-dim)]">Encuentra por dónde empezar. Tu respuesta se usa solo durante esta visita.</p>
    <QuickOrientation signedIn={Boolean(user)} />
  </div>;
}
