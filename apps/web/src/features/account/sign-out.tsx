"use client";

import { useState } from "react";
import { authClient } from "./auth-client";

export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    setBusy(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
      window.location.replace("/");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return <div>
    <button type="button" onClick={signOut} disabled={busy} className="min-h-11 px-2 text-sm underline">
      {busy ? "Cerrando sesión…" : "Cerrar sesión"}
    </button>
    {error && <p className="text-sm text-rose-300" role="alert">No se ha podido cerrar la sesión.</p>}
  </div>;
}
