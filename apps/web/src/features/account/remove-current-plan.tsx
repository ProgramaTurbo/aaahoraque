"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCurrentStudyPlan } from "@/app/subjects/account-actions";

export function RemoveCurrentPlan() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function remove() {
    setError("");
    setPending(true);
    try {
      const result = await setCurrentStudyPlan("");
      if ("error" in result) setError(result.error);
      else router.refresh();
    } catch {
      setError("No se ha podido quitar el plan.");
    } finally {
      setPending(false);
    }
  }

  return <div>
    <button type="button" onClick={remove} disabled={pending} className="min-h-11 text-sm underline">
      {pending ? "Actualizando…" : "Quitar como plan actual"}
    </button>
    {error && <p role="alert" className="text-error-fg">{error}</p>}
  </div>;
}
