"use client";
import { useEffect, useState } from "react";
import type { DegreePlan } from "./types";

export function OfferingPlans({ id }: { id: string }) {
  const [plans, setPlans] = useState<DegreePlan[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/degrees/plans?offering=${id}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((result) => { if (!controller.signal.aborted) { setPlans(result.data); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, attempt]);
  if (error) return <p role="alert">No se pudieron cargar los planes. <button type="button" className="underline" onClick={() => { setError(false); setAttempt((n) => n + 1); }}>Reintentar</button></p>;
  if (plans === null) return <p role="status">Cargando planes de esta oferta…</p>;
  if (!plans.length) return <p>Sin planes disponibles</p>;
  return <>{plans.map((plan) => <details key={plan.id} className="mb-4">
    <summary className="cursor-pointer">{plan.name} · {plan.totalEcts} ECTS · {plan.subjects.length} asignaturas cargadas</summary>
    <p className="my-2 text-[var(--color-fg-dim)]">La lista puede estar incompleta y no confirma la vigencia del plan.</p>
    <ul className="list-disc space-y-1 pl-5">{plan.subjects.map((s) => <li key={s.id}>{s.name} ({s.ects} ECTS)</li>)}</ul>
  </details>)}</>;
}
