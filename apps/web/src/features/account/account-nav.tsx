import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { getAccountUser } from "@/lib/account/session";
import { SignOut } from "./sign-out";

export function GuestAccountLinks() {
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <Link className="px-2 py-2 hover:underline" href="/login">Iniciar sesión</Link>
    <Link className="border border-[var(--color-accent)] px-3 py-2 font-semibold" href="/registro">Crear cuenta</Link>
  </div>;
}

export async function AccountNav() {
  const user = await getAccountUser().catch((error: unknown) => {
    unstable_rethrow(error);
    return null;
  });
  if (!user) return <GuestAccountLinks />;

  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <Link href="/panel" className="border border-[var(--color-accent)] px-3 py-2 font-semibold">Mi panel</Link>
    <SignOut />
  </div>;
}
