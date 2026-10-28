"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { areas, emptyProfile, regions, type OrientationProfile } from "./orientation-profile";
const field = "mt-2 block w-full border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-3";
const button = "border border-[var(--color-degree-bright)] px-5 py-3 text-[var(--color-degree-bright)]";
const steps = ["Tus intereses", "Cómo te ves", "Tu formación", "Dónde estudiar", "Condiciones y prioridades", "Revisar respuestas"];

export function OrientationTest({ initial, initialStep = 0, onStepChange, onDraftChange, onComplete }: {
  initialStep?: number; onStepChange?: (step: number) => void; onDraftChange?: (profile: OrientationProfile) => void;
  initial?: OrientationProfile; onComplete: (profile: OrientationProfile) => void;
}) {
  const [profile, setProfile] = useState<OrientationProfile>(initial ?? structuredClone(emptyProfile));
  const [step, setStep] = useState(initialStep);
  const [region, setRegion] = useState(() => Object.keys(regions).find((r) => regions[r].includes(initial?.origin_province ?? "") || (initial?.allowed_provinces.length && JSON.stringify(regions[r]) === JSON.stringify(initial.allowed_provinces))) ?? "");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { onDraftChange?.(profile); }, [profile, onDraftChange]);
  function change<K extends keyof OrientationProfile>(key: K, value: OrientationProfile[K]) { setProfile((p) => ({ ...p, [key]: value })); }
  // Scroll after React commits the new step, never before its layout changes.
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const scrollToStepPosition = () => {
      document.getElementById("orientation-test-title")?.scrollIntoView({ block: "start", behavior: "instant" });
    };
    scrollToStepPosition();
    const frame = requestAnimationFrame(scrollToStepPosition);
    return () => cancelAnimationFrame(frame);
  }, [step]);
  function move(next: number) { setStep(next); onStepChange?.(next); }
  function toggleList(key: "goals" | "activities", value: string) { change(key, profile[key].includes(value) ? profile[key].filter((v) => v !== value) : [...profile[key], value]); }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (step < 5) move(step + 1); else onComplete(profile); }} className="space-y-7 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-10">
      <p className="font-mono text-sm text-[var(--color-degree-bright)]">TEST DE ORIENTACIÓN · PASO {step + 1} DE {steps.length}</p>
      <progress aria-label="Progreso del test" max={steps.length} value={step + 1} className="w-full" />
      <h2 ref={heading} tabIndex={-1} className="text-3xl font-semibold">{steps[step]}</h2>
      <p className="text-[var(--color-fg-dim)]">Todas las preguntas son opcionales. «No lo sé» deja el dato sin valorar. Tus respuestas se conservan al navegar por Carreras y se borran al recargar la página.</p>
      {step === 0 && <div className="space-y-5">
        <p>¿Qué áreas te atraen? Puedes indicar también lo que no te interesa.</p>
        <div className="grid gap-5 md:grid-cols-2">{areas.map(([key, label]) => <label key={key}>{label}<select className={field} value={profile.interests[key] ?? "unknown"} onChange={(e) => {
          const interests = { ...profile.interests }; if (e.target.value === "unknown") delete interests[key]; else interests[key] = e.target.value as "like" | "dislike"; change("interests", interests);
        }}><option value="unknown">No lo sé / no he respondido</option><option value="like">Me interesa</option><option value="dislike">No me interesa</option></select></label>)}</div>
        <fieldset><legend className="mb-3 font-semibold">¿Qué actividades disfrutas? Sin marcar = no lo sé.</legend><div className="flex flex-wrap gap-5">{["Resolver problemas", "Crear y diseñar", "Ayudar a otras personas", "Leer y argumentar", "Experimentar", "Organizar proyectos"].map((activity) => <label key={activity}><input type="checkbox" checked={profile.activities.includes(activity)} onChange={() => toggleList("activities", activity)} /> {activity}</label>)}</div></fieldset>
      </div>}
      {step === 1 && <div className="space-y-6">
        <p>Autoevaluación: cómo te sientes hoy. No mide tu capacidad ni limita las carreras que puedes estudiar. En esta versión se recoge para orientar la conversación; todavía no puntúa titulaciones.</p>
        <div className="grid gap-5 md:grid-cols-2">{[["logic", "Razonamiento lógico"], ["comprehension", "Comprensión de textos"], ["memory", "Memorización"], ["creativity", "Creatividad"], ["communication", "Comunicación"]].map(([key, label]) => <label key={key}>{label}<select className={field} value={profile.aptitudes[key] ?? "unknown"} onChange={(e) => {
          const aptitudes = { ...profile.aptitudes }; if (e.target.value === "unknown") delete aptitudes[key]; else aptitudes[key] = Number(e.target.value); change("aptitudes", aptitudes);
        }}><option value="unknown">No lo sé</option>{["Me cuesta mucho", "Me cuesta un poco", "Me manejo", "Se me da bien", "Se me da muy bien"].map((label, n) => <option key={n} value={n}>{label}</option>)}</select></label>)}</div>
        <fieldset><legend className="mb-3 font-semibold">¿Qué valoras en tu futuro profesional? Sin marcar = no lo sé.</legend><div className="flex flex-wrap gap-5">{["Investigación", "Creatividad", "Impacto social", "Autonomía", "Salario", "Estabilidad"].map((goal) => <label key={goal}><input type="checkbox" checked={profile.goals.includes(goal)} onChange={() => toggleList("goals", goal)} /> {goal}</label>)}</div></fieldset>
      </div>}
      {step === 2 && <div className="grid gap-5 md:grid-cols-2">
        <label>Vía de acceso<select className={field} value={profile.access_route} onChange={(e) => change("access_route", e.target.value as OrientationProfile["access_route"])}><option value="unknown">No lo sé</option><option value="bachillerato">Bachillerato</option><option value="fp_superior">FP superior</option><option value="other">Otra vía</option></select></label>
        <label>Modalidad de Bachillerato, ciclo de FP o estudios previos<input className={field} maxLength={200} placeholder="Puedes dejarlo en blanco" value={profile.previous_studies} onChange={(e) => change("previous_studies", e.target.value)} /></label>
        <label className="md:col-span-2">Asignaturas cursadas y notas que quieras aportar<textarea className={field} maxLength={2000} placeholder="Por ejemplo: Matemáticas 7, Lengua 8. Opcional." value={profile.subjects} onChange={(e) => change("subjects", e.target.value)} /></label>
        <label>Nota de acceso estimada (0–10)<input type="number" min={0} max={10} step="0.01" className={field} placeholder="No lo sé" value={profile.access_grade ?? ""} onChange={(e) => change("access_grade", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label>Nota de admisión estimada (0–14)<input type="number" min={0} max={14} step="0.01" className={field} placeholder="No lo sé" value={profile.admission_grade ?? ""} onChange={(e) => change("admission_grade", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <p className="md:col-span-2 text-sm text-[var(--color-fg-dim)]">Datos declarados. No calculamos ni verificamos la admisión: depende de la oferta, la vía y las reglas oficiales de cada curso. Puedes omitir ambas notas.</p>
      </div>}
      {step === 3 && <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2"><label>Comunidad de origen<select className={field} value={region} onChange={(e) => { setRegion(e.target.value); change("origin_province", null); change("allowed_provinces", regions[e.target.value] ?? []); }}><option value="">No lo sé / fuera de España</option>{Object.keys(regions).map((r) => <option key={r}>{r}</option>)}</select></label>
        <label>Provincia de origen<select className={field} value={profile.origin_province ?? ""} onChange={(e) => change("origin_province", e.target.value || null)}><option value="">No lo sé</option>{(regions[region] ?? []).map((province) => <option key={province}>{province}</option>)}</select></label></div>
        <label>¿Dónde podrías estudiar?<select className={field} value={profile.mobility} onChange={(e) => { change("mobility", e.target.value as OrientationProfile["mobility"]); change("allowed_provinces", regions[region] ?? []); }}>
          <option value="unknown">No estoy seguro/a</option><option value="anywhere">Puedo estudiar en cualquier provincia</option><option value="prefer_province">Prefiero mi provincia, pero puedo mudarme</option><option value="require_province">Solo puedo estudiar en mi provincia</option><option value="prefer_region">Prefiero mi comunidad, pero puedo salir</option><option value="require_region">Solo puedo estudiar en mi comunidad</option>
        </select></label>
        <label>Distancia o condiciones adicionales (opcional)<input className={field} maxLength={150} value={profile.distance} onChange={(e) => change("distance", e.target.value)} placeholder="Por ejemplo: podría desplazarme una hora" /></label>
        <p className="text-sm text-[var(--color-fg-dim)]">Usamos la provincia del centro. Permanecer en una provincia no garantiza poder desplazarte a diario. Los kilómetros y tiempos quedan pendientes de comprobar.</p>
      </div>}
      {step === 4 && <div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2"><label>Presupuesto anual total en euros (opcional)<input type="number" min={0} max={1000000} className={field} placeholder="No lo sé" value={profile.budget ?? ""} onChange={(e) => change("budget", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label>Tipo de universidad<select className={field} value={profile.institution} onChange={(e) => change("institution", e.target.value as OrientationProfile["institution"])}><option value="unknown">No lo sé</option><option value="either">Me da igual</option><option value="public">Prefiero pública</option><option value="private">Prefiero privada</option></select></label></div>
        <label className="block"><input type="checkbox" checked={profile.budget_strict} onChange={(e) => change("budget_strict", e.target.checked)} /> El presupuesto es un límite que no puedo superar</label>
        <div className="grid gap-5 md:grid-cols-2"><label>Modalidad<select className={field} value={profile.modality} onChange={(e) => change("modality", e.target.value as OrientationProfile["modality"])}><option value="unknown">No lo sé / sin preferencia</option><option value="on_site">Presencial</option><option value="online">Online</option><option value="hybrid">Híbrida</option></select></label>
        <label>Duración máxima en años (opcional)<input type="number" min={1} max={10} className={field} value={profile.max_years ?? ""} placeholder="No lo sé" onChange={(e) => change("max_years", e.target.value === "" ? null : Number(e.target.value))} /></label></div>
        <label className="block"><input type="checkbox" checked={profile.modality_strict} onChange={(e) => change("modality_strict", e.target.checked)} /> La modalidad elegida es obligatoria</label>
        <p className="text-sm text-[var(--color-fg-dim)]">Todavía faltan costes, titularidad y duración comparable. Quedarán pendientes y no se darán por cumplidas.</p>
        <fieldset className="space-y-4"><legend className="mb-3 font-semibold">¿Qué pesa más para ti? Solo se usan los criterios que hayas respondido y puedan calcularse.</legend>{[["interests", "Intereses"], ["location", "Ubicación"], ["modality", "Modalidad"]].map(([key, label]) => <label key={key} className="block">{label}: {profile.priorities[key]} / 5<input type="range" min={0} max={5} value={profile.priorities[key]} onChange={(e) => change("priorities", { ...profile.priorities, [key]: Number(e.target.value) })} className="ml-4 align-middle" /></label>)}</fieldset>
      </div>}
      {step === 5 && <div className="space-y-4">
        <h3 className="text-xl font-semibold">Esta será tu orientación inicial</h3>
        <p>Áreas respondidas: {Object.keys(profile.interests).length}. Autoevaluaciones: {Object.keys(profile.aptitudes).length}. Objetivos: {profile.goals.join(", ") || "Sin definir"}.</p>
        <p>Origen: {profile.origin_province ?? (region || "Sin definir")}. Movilidad: {({ unknown: "Sin definir", anywhere: "Cualquier provincia", prefer_province: "Preferencia por mi provincia", require_province: "Solo mi provincia", prefer_region: "Preferencia por mi comunidad", require_region: "Solo mi comunidad" })[profile.mobility]}.</p>
        <p>Presupuesto: {profile.budget === null ? "Sin definir" : `${profile.budget} €/año (${profile.budget_strict ? "obligatorio" : "preferencia"})`}. Modalidad: {({ unknown: "Sin definir", on_site: "Presencial", online: "Online", hybrid: "Híbrida" })[profile.modality]}.</p>
        <p className="border-l-2 border-[var(--color-degree)] pl-4">La afinidad usa una clasificación provisional por el nombre del grado, ubicación y modalidad. No evalúa tus capacidades ni garantiza acceso. Verás qué se ha calculado y qué falta. Si no hay datos suficientes, no se asignará una puntuación.</p>
        <details><summary className="cursor-pointer underline">Ver el resto de mis respuestas</summary><p className="mt-3">Estudios: {profile.previous_studies || "Sin definir"}. Notas: acceso {profile.access_grade ?? "sin definir"}, admisión {profile.admission_grade ?? "sin definir"}.</p><p className="whitespace-pre-wrap">{profile.subjects || "Asignaturas sin definir"}</p><p>Actividades: {profile.activities.join(", ") || "Sin definir"}. Distancia: {profile.distance || "Sin definir"}.</p></details>
      </div>}
      <div className="flex flex-wrap gap-4 border-t border-[var(--color-border)] pt-6">

        {step > 0 && <button type="button" className={button} onClick={() => move(step - 1)}>Anterior</button>}
        <button type="submit" className={`${button} bg-[var(--color-degree)]/10`}>{step === 5 ? "Ver mis opciones afines" : "Continuar"}</button>
      </div>
    </form>
  );
}
