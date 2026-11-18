import { AccountPage, type AccountSearch } from "@/features/account/account-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cambiar contraseña · AAAhoraQue" };

export default function Page({ searchParams }: { searchParams: AccountSearch }) {
  return <AccountPage mode="reset" searchParams={searchParams} />;
}
