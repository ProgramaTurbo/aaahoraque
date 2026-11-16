"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ComponentProps } from "react";
import { setCurrentStudyPlan } from "@/app/subjects/account-actions";
import { accountPath } from "@/lib/account/paths";
import { CatalogSearch, type CatalogOption } from "./catalog-search";
import { SubjectsWorkspace } from "./subjects-workspace";

type Workspace = Omit<ComponentProps<typeof SubjectsWorkspace>, "onDirtyChange">;

export function SubjectsExperience({ universities, plans, universityId, currentPlanId, workspace, signedIn }: {
  universities: CatalogOption[];
  plans: CatalogOption[];
  universityId?: string;
  currentPlanId?: string | null;
  workspace?: Workspace;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dirtyPlan, setDirtyPlan] = useState<string>();
  const [marking, setMarking] = useState(false);
  const [planError, setPlanError] = useState("");
  const activePlan = workspace?.planId;
  const dirty = Boolean(activePlan && dirtyPlan === activePlan);
  const selectedPlan = plans.find((item) => item.id === activePlan);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function navigate(university: string, plan?: string) {
    if (university === universityId && plan === activePlan) return;
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Quieres cambiar de plan y descartarlos?")) return;

    const params = new URLSearchParams({ university });
    if (plan) params.set("plan", plan);
    setPlanError("");
    setDirtyPlan(undefined);
    startTransition(() => {
      router.push(`/subjects?${params}`, { scroll: false });
    });
  }

  async function markCurrent() {
    if (!activePlan) return;
    setPlanError("");
    setMarking(true);
    try {
      const result = await setCurrentStudyPlan(activePlan);
      if ("error" in result) setPlanError(result.error);
      else startTransition(() => router.refresh());
    } catch {
      setPlanError("No se ha podido actualizar tu plan actual.");
    } finally {
      setMarking(false);
    }
  }

  return <>
    <section aria-labelledby="plan-search-title" className="space-y-5 rounded-2xl border border-cyan-300/20 bg-[var(--color-bg-card)] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-search-title" className="text-lg font-semibold">Busca tu plan de estudios</h2>
        {pending && <span role="status" className="text-sm text-cyan-200">Actualizando catálogo…</span>}
      </div>
      {universities.length ? <>
        <div className="grid items-start gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <CatalogSearch key={universityId ?? "unselected"} label="Universidad" placeholder="Ej. Zaragoza o UNIZAR"
            options={universities} selected={universities.find((item) => item.id === universityId)}
            disabled={pending || marking} onSelect={(id) => { if (id !== universityId) navigate(id); }} />
          <div className="space-y-3">
            <CatalogSearch key={`${universityId}:${activePlan}`} label="Titulación o plan"
              placeholder={universityId ? "Ej. Ingeniería Informática o 716" : "Elige primero una universidad"}
              options={plans} selected={selectedPlan}
              disabled={!universityId || !plans.length || pending || marking}
              onSelect={(id) => { if (universityId) navigate(universityId, id); }} />
            {selectedPlan?.detail && <p className="text-xs leading-relaxed text-[var(--color-fg-dim)]">
              {selectedPlan.detail}
            </p>}
            {universityId && !plans.length && <p className="text-sm text-[var(--color-fg-dim)]">Esta universidad aún no tiene planes disponibles.</p>}
            {workspace?.status === "official" && (currentPlanId === activePlan
              ? <p className="text-sm font-semibold text-cyan-200">✓ Mi plan actual</p>
              : signedIn
                ? <button type="button" onClick={markCurrent} disabled={pending || marking}
                    className="min-h-10 rounded-lg border border-cyan-300/30 px-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-50">
                    {marking ? "Actualizando…" : "Marcar como mi plan actual"}
                  </button>
                : <Link href={accountPath("/login", workspace.returnTo)} className="text-sm text-cyan-200 underline">Iniciar sesión para guardar este plan</Link>)}
            {planError && <p role="alert" className="text-sm text-rose-300">{planError}</p>}
          </div>
        </div>
      </> : <p className="text-sm text-[var(--color-fg-dim)]">El catálogo de esta base de datos aún no contiene universidades con planes disponibles.</p>}
    </section>
    {workspace ? <SubjectsWorkspace key={workspace.planId} {...workspace} onDirtyChange={(changed) => setDirtyPlan(changed ? activePlan : undefined)} />
      : universities.length > 0 && <p className="rounded-xl border border-dashed border-white/15 px-5 py-8 text-center text-[var(--color-fg-dim)]">
        {universityId ? "Elige una titulación o plan para ver sus asignaturas." : "Empieza escribiendo el nombre de tu universidad."}
      </p>}
  </>;
}
