import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getAuth } from "./auth";

export const getAccountUser = cache(async () => {
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: requestHeaders });
  return session?.user.emailVerified ? session.user : null;
});
