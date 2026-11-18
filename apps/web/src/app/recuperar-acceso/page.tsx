import { AccountPage, type AccountSearch } from "@/features/account/account-page";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar acceso · AAAhoraQue" };

export default function Page({ searchParams }: { searchParams: AccountSearch }) {
  return <AccountPage mode="recovery" searchParams={searchParams} />;
}
