"use client";

import { useState, useTransition } from "react";
import { saveDisplayName, selectPanelArea } from "@/app/panel/actions";
import { accountInput } from "./styles";

const areas = [
  { id: "degree", label: "Carreras", detail: "Qué titulación elegir", active: "border-degree text-degree" },
  { id: "erasmus", label: "Erasmus", detail: "Dónde estudiar de intercambio", active: "border-chart-green text-chart-green" },
  { id: "subjects", label: "Asignaturas", detail: "Qué cursar en tu plan", active: "border-subjects text-subjects" },
] as const;

export function ProfileForm({ name, area }: { name: string; area: typeof areas[number]["id"] }) {
  const [value, setValue] = useState(name);
  const [saved, setSaved] = useState(name);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [saving, startSaving] = useTransition();
  const [changing, startChanging] = useTransition();

  function saveName() {
    const next = value.trim();
    if (saving || next === saved) return;
    startSaving(async () => {
      try {
        const result = await saveDisplayName(next);
        if (typeof result.displayName === "string") {
          const displayName = result.displayName;
          setSaved(displayName);
          setValue((current) => current.trim() === next ? displayName : current);
          setMessage({ text: "Nombre guardado." });
        } else setMessage({ text: result.error ?? "No se pudo guardar el nombre.", error: true });
      } catch {
        setMessage({ text: "No se pudo guardar el nombre. Pulsa Enter para reintentar.", error: true });
      }
    });
  }

  return <div className="space-y-5">
    <div className="max-w-lg">
      <label htmlFor="panel-display-name" className="block text-sm font-semibold">Nombre visible</label>
      <input id="panel-display-name" autoComplete="nickname" value={value} maxLength={80} className={`${accountInput} mt-2`}
        readOnly={saving} onChange={(event) => { setValue(event.target.value); setMessage(undefined); }} onBlur={saveName}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); saveName(); } }} />
      <p role="status" className={`mt-1 min-h-5 text-xs ${message?.error ? "text-rose-500" : "text-[var(--color-fg-dim)]"}`}>
        {saving ? "Guardando nombre…" : message?.text ?? "Se guarda al salir del campo o pulsar Enter."}
      </p>
    </div>
    <nav aria-label="Áreas de mi perfil" aria-busy={changing} className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      {areas.map((item) => <button key={item.id} type="button" aria-pressed={area === item.id} disabled={changing}
        className={`rounded-xl border p-4 text-left transition hover:bg-bg-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subjects ${area === item.id ? `bg-bg-card-hover ring-1 ring-current ${item.active}` : "border-control-border text-fg"}`}
        onClick={() => {
          if (area === item.id) return;
          startChanging(async () => {
            try {
              if (await selectPanelArea(item.id)) return;
            } catch {
              // Show the same message for a connection failure.
            }
            setMessage({ text: "No se pudo cambiar de área. Vuelve a intentarlo.", error: true });
          });
        }}>
        <span className="block font-heading text-lg font-semibold">{item.label}</span>
        <span className="mt-1 block text-sm text-[var(--color-fg-dim)]">{item.detail}</span>
      </button>)}
    </nav>
  </div>;
}
