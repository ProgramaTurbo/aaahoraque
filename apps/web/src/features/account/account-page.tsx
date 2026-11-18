import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/account/auth";
import { afterLoginPath } from "@/lib/account/paths";
import { getAccountUser } from "@/lib/account/session";
import { AccountForm } from "./account-form";

type Mode = "login" | "register" | "recovery" | "reset";
export type AccountSearch = Promise<{ next?: string; token?: string; verified?: string; error?: string }>;

export async function AccountPage({ mode, searchParams }: { mode: Mode; searchParams: AccountSearch }) {
  const params = await searchParams;
  const next = afterLoginPath(params.next);
  if ((mode === "login" || mode === "register") && await getAccountUser()) redirect(next);

  return <div className="px-5 py-12 sm:py-20">
    {getAuth() ? <AccountForm mode={mode} next={next} token={typeof params.token === "string" ? params.token : undefined} verified={params.verified === "1" && !params.error} verificationError={mode === "login" && Boolean(params.error)} />
      : <section className="mx-auto max-w-lg space-y-5 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8">
        <h1 className="font-display text-3xl">Acceso con cuenta no disponible</h1>
        <Link href={next === "/panel" ? "/" : next} className="underline">Continuar como invitado</Link>
      </section>}
  </div>;
}
