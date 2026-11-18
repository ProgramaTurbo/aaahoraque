"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  areas, emptyProfile, interestChoices, orientationReviewStep, regions, migrateOrientationProfile,
  scaleLabels, comparisonOptions, capacityQuestions, activityQuestions, motivationQuestions, subinterests,
  selectExplorationAreas, profileValidationMessages, requirementLabels,
  type OrientationProfile, type ScaleAnswer, type ComparisonAnswer, type DataStatus, type RequirementLevel,
} from "./orientation-profile";
import { OrientationProfileView, mobilityLabels, feasibilityLabels, conditionLabels } from "./orientation-profile-view";

const field = "mt-2 block w-full border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-3";
const button = "border border-[var(--color-degree-bright)] px-5 py-3 text-[var(--color-degree-bright)]";
const steps = ["Tus intereses", "Elegir A o B", "Cómo te ves", "Tu formación", "Dónde estudiar", "Condiciones y prioridades", "Revisar respuestas"];
const emptyLocation = { preferred: [], acceptable: [], unavailable: [], moving: "unknown", commuting: "unknown" } as const;

function ScaleQuestion({ label, answer, onChange, capacity = false, area = false }: {
  label: string; answer?: ScaleAnswer; onChange: (value?: ScaleAnswer) => void; capacity?: boolean; area?: boolean;
}) {
  const options = capacity ? ["Me cuesta mucho", "Me cuesta un poco", "Me manejo", "Se me da bien", "Se me da muy bien"] : scaleLabels;
  return <label className="block">{label}<select className={field}
    value={answer?.state === "answered" ? answer.level : answer?.state ?? ""}
    onChange={(event) => {
      const value = event.target.value;
      onChange(value === "" ? undefined : value === "unknown" ? { state: "unknown" } : { state: "answered", level: Number(value) as 0 | 1 | 2 | 3 | 4 });
    }}>
    <option value="">Sin responder</option>
    {options.map((label, level) => <option key={level} value={level}>{label}</option>)}
    <option value="unknown">{capacity ? "No sabría valorarlo" : area ? "No conozco suficientemente esta área para valorarla" : "No conozco suficientemente esta opción para valorarla"}</option>
  </select></label>;
}

export function OrientationTest({ initial, initialStep = 0, onStepChange, onDraftChange, onComplete }: {
  initialStep?: number; onStepChange?: (step: number) => void; onDraftChange?: (profile: OrientationProfile) => void;
  initial?: OrientationProfile; onComplete: (profile: OrientationProfile) => void;
}) {
  const [profile, setProfile] = useState(() => migrateOrientationProfile(initial ?? emptyProfile));
  const [step, setStep] = useState(Math.max(0, Math.min(orientationReviewStep, initialStep)));
  const [region, setRegion] = useState(() => initial?.origin_region ?? Object.keys(regions).find((name) =>
    regions[name].includes(initial?.origin_province ?? "") ||
    (initial?.allowed_provinces.length && JSON.stringify(regions[name]) === JSON.stringify(initial.allowed_provinces))) ?? "");
  const heading = useRef<HTMLHeadingElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const explored = selectExplorationAreas(profile);
  const location = profile.locationPreferences ?? { ...emptyLocation, preferred: [], acceptable: [], unavailable: [] };
  const validation = profileValidationMessages(profile);
  useEffect(() => { onDraftChange?.(profile); }, [profile, onDraftChange]);
  function change<K extends keyof OrientationProfile>(key: K, value: OrientationProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }
  function answerQuestion(id: string, answer?: ScaleAnswer) {
    setProfile((current) => {
      const answers = { ...current.answers };
      if (answer) answers[id] = answer;
      else delete answers[id];
      return { ...current, answers };
    });
  }
  function updateAcademicStatus(key: keyof NonNullable<OrientationProfile["academicStatus"]>, status: DataStatus) {
    setProfile((current) => {
      const statusValues = current.academicStatus ?? { access_grade: "unknown", admission_grade: "unknown", previous_studies: "unknown", subjects: "unknown" };
      return { ...current, [key]: status === "unknown" ? key.endsWith("grade") ? null : "" : current[key],
        academicStatus: { ...statusValues, [key]: status } };
    });
  }
  function requirement(key: "budget" | "institution" | "modality" | "duration", value: RequirementLevel) {
    setProfile((current) => ({
      ...current, requirements: { ...current.requirements, [key]: value },
      ...(key === "budget" ? { budget_strict: value === "mandatory" } : {}),
      ...(key === "modality" ? { modality_strict: value === "mandatory", ...(value === "none" ? { modality: "unknown" as const } : {}) } : {}),
      ...(key === "institution" && value === "none" ? { institution: "either" as const } : {}),
      ...(key === "duration" && value === "none" ? { max_years: null } : {}),
    }));
  }
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const scroll = () => document.getElementById("orientation-test-title")?.scrollIntoView({ block: "start", behavior: "instant" });
    scroll();
    const frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [step]);
  function move(next: number) { setStep(next); onStepChange?.(next); }
  function scales(dimension: string, questions: readonly (readonly [string, string])[], capacity = false) {
    return <div className="grid gap-4 md:grid-cols-2">{questions.map(([id, label]) => <ScaleQuestion key={id} label={label}
      capacity={capacity} area={dimension === "interests"} answer={profile.answers?.[dimension + "." + id]} onChange={(value) => answerQuestion(dimension + "." + id, value)} />)}</div>;
  }
  function statusControl(key: keyof NonNullable<OrientationProfile["academicStatus"]>) {
    return <label className="block text-sm">Estado de este dato<select className={field} value={profile.academicStatus?.[key] ?? "unknown"}
      onChange={(event) => updateAcademicStatus(key, event.target.value as DataStatus)}>
      <option value="unknown">Desconocido</option><option value="estimated">Estimado</option><option value="confirmed">Confirmado por el estudiante</option>
    </select></label>;
  }
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (step < orientationReviewStep) move(step + 1);
    else { setSubmitted(true); if (validation.length === 0) onComplete(profile); }
  }} className="space-y-7 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 md:p-10">
    <p className="font-mono text-sm text-[var(--color-degree-bright)]">TEST DE ORIENTACIÓN · PASO {step + 1} DE {steps.length}</p>
    <progress aria-label="Progreso del test" max={steps.length} value={step + 1} className="w-full" />
    <h2 ref={heading} tabIndex={-1} className="text-3xl font-semibold">{steps[step]}</h2>
    <p className="text-sm text-[var(--color-fg-dim)]">Todas las preguntas son opcionales. Puedes responder que no sabes valorarlas. El borrador se conserva en esta pestaña. «Salir del test» lo borra.</p>
    {step === 0 && <div className="space-y-6">
      <p>¿Cuánto te atrae cada área?</p>
      {scales("interests", areas)}
      {explored.length > 0 && <div className="space-y-4">
        <p>Explora las actividades de tus áreas favoritas. Si cambias tus intereses, estas preguntas se adaptan y conservamos tus respuestas anteriores.</p>
        {explored.map((area) => <details key={area} open className="border border-[var(--color-border)] p-4">
          <summary className="mb-4 cursor-pointer font-semibold">{areas.find(([id]) => id === area)?.[1]}</summary>
          {scales("subinterests." + area, subinterests[area])}
        </details>)}
      </div>}
    </div>}
    {step === 1 && <div className="space-y-5">
      <p>Elige cómo te sientes ante cada pareja. Puedes valorar las dos positivamente.</p>
      {interestChoices.map(([id, a, b], index) => <fieldset key={id} className="space-y-2 border border-[var(--color-border)] p-4">
        <legend className="px-2 font-semibold">Pareja {index + 1}</legend>
        <p>A · {a}</p><p>B · {b}</p>
        {comparisonOptions.map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-3">
          <input type="radio" name={id} checked={profile.comparisons?.[id] === value}
            onChange={() => change("comparisons", { ...profile.comparisons, [id]: value as ComparisonAnswer })} />{label}
        </label>)}
        <button type="button" className="text-sm underline" onClick={() => {
          const comparisons = { ...profile.comparisons }; delete comparisons[id]; change("comparisons", comparisons);
        }}>Dejar sin responder</button>
      </fieldset>)}
    </div>}
    {step === 2 && <div className="space-y-7">
      <section className="space-y-3"><h3 className="font-semibold">Cómo percibes tus capacidades</h3>
        <p className="text-sm">Valora cómo te sientes hoy al realizar estas tareas.</p>{scales("capacities", capacityQuestions, true)}</section>
      <section className="space-y-3"><h3 className="font-semibold">Qué actividades te apetece hacer</h3>{scales("activities", activityQuestions)}</section>
      <section className="space-y-3"><h3 className="font-semibold">Qué valoras en tu futuro profesional</h3>{scales("motivations", motivationQuestions)}</section>
      {(profile.activities.length > 0 || profile.goals.length > 0) && <p className="text-sm">Conservamos tus selecciones del test anterior. Valora aquí su intensidad para actualizar el perfil.</p>}
    </div>}
    {step === 3 && <div className="space-y-5">
      <label className="block">Vía de acceso<select className={field} value={profile.access_route} onChange={(event) => change("access_route", event.target.value as OrientationProfile["access_route"])}>
        <option value="unknown">No lo sé</option><option value="bachillerato">Bachillerato</option><option value="fp_superior">FP superior</option><option value="other">Otra vía</option>
      </select></label>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2"><label>Modalidad de Bachillerato, ciclo de FP o estudios previos<input className={field} maxLength={200}
          value={profile.previous_studies} onChange={(event) => {
            change("previous_studies", event.target.value);
            if (!event.target.value) updateAcademicStatus("previous_studies", "unknown");
            else if (!profile.academicStatus || profile.academicStatus.previous_studies === "unknown") updateAcademicStatus("previous_studies", "confirmed");
          }} /></label>{statusControl("previous_studies")}</div>
        <div className="space-y-2"><label>Asignaturas cursadas y notas<textarea className={field} maxLength={2000} value={profile.subjects}
          onChange={(event) => {
            change("subjects", event.target.value);
            if (!event.target.value) updateAcademicStatus("subjects", "unknown");
            else if (!profile.academicStatus || profile.academicStatus.subjects === "unknown") updateAcademicStatus("subjects", "confirmed");
          }} /></label>{statusControl("subjects")}</div>
        {([["access_grade", "Nota de acceso (0–10)", 10], ["admission_grade", "Nota de admisión (0–14)", 14]] as const).map(([key, label, maximum]) =>
          <div key={key} className="space-y-2"><label>{label}<input type="number" min={0} max={maximum} step="0.01" className={field} placeholder="No lo sé" value={profile[key] ?? ""}
            onChange={(event) => {
              change(key, event.target.value === "" ? null : Number(event.target.value));
              updateAcademicStatus(key, event.target.value === "" ? "unknown" : profile.academicStatus?.[key] === "confirmed" ? "confirmed" : "estimated");
            }} /></label>{statusControl(key)}</div>)}
      </div>
      <p className="text-sm">Las notas se conservan para estudiar la viabilidad académica en futuras versiones. La afinidad vocacional usa tus intereses declarados.</p>
    </div>}
    {step === 4 && <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label>Comunidad de origen<select className={field} value={region} onChange={(event) => {
          setRegion(event.target.value); change("origin_region", event.target.value); change("origin_province", null); change("allowed_provinces", regions[event.target.value] ?? []);
        }}><option value="">No lo sé / fuera de España</option>{Object.keys(regions).map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Provincia de origen<select className={field} value={profile.origin_province ?? ""} onChange={(event) => change("origin_province", event.target.value || null)}>
          <option value="">No lo sé</option>{(regions[region] ?? []).map((name) => <option key={name}>{name}</option>)}</select></label>
      </div>
      <label className="block">¿Dónde podrías estudiar?<select className={field} value={profile.mobility} onChange={(event) => {
        change("mobility", event.target.value as OrientationProfile["mobility"]); change("allowed_provinces", regions[region] ?? []);
      }}>{Object.entries(mobilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2">{(["moving", "commuting"] as const).map((key) => <label key={key}>{key === "moving" ? "Mudarte" : "Desplazarte habitualmente"}
        <select className={field} value={location[key]} onChange={(event) => change("locationPreferences", { ...location, [key]: event.target.value as typeof location[typeof key] })}>
          {Object.entries(feasibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>)}</div>
      <details className="space-y-4 border border-[var(--color-border)] p-4">
        <summary className="cursor-pointer font-semibold">Añadir provincias preferidas, aceptables o imposibles</summary>
        <p className="text-sm">Estas ubicaciones adicionales completan tu perfil. La movilidad elegida arriba es la que utiliza el ranking actual.</p>
        <div className="grid gap-4 md:grid-cols-3">{([["preferred", "Preferidas"], ["acceptable", "Aceptables"], ["unavailable", "Imposibles"]] as const).map(([key, label]) =>
          <label key={key}>{label}<select multiple size={5} className={field} value={location[key]} onChange={(event) => change("locationPreferences", {
            ...location, [key]: Array.from(event.target.selectedOptions, (option) => option.value),
          })}>{Object.values(regions).flat().map((name) => <option key={name}>{name}</option>)}</select></label>)}</div>
      </details>
      <label className="block">Condiciones de desplazamiento o mudanza<input className={field} maxLength={150} value={profile.distance} onChange={(event) => change("distance", event.target.value)} /></label>
    </div>}
    {step === 5 && <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label>Presupuesto anual total (€)<input type="number" min={0} max={1000000} className={field} value={profile.budget ?? ""} onChange={(event) => change("budget", event.target.value === "" ? null : Number(event.target.value))} /></label>
        <label>Tipo de universidad<select className={field} value={profile.institution} onChange={(event) => change("institution", event.target.value as OrientationProfile["institution"])}>
          <option value="unknown">No lo sé</option><option value="either">Sin preferencia</option><option value="public">Pública</option><option value="private">Privada</option>
        </select></label>
        <label>Modalidad<select className={field} value={profile.modality} onChange={(event) => change("modality", event.target.value as OrientationProfile["modality"])}>
          <option value="unknown">Sin preferencia / no lo sé</option><option value="on_site">Presencial</option><option value="online">Online</option><option value="hybrid">Híbrida</option>
        </select></label>
        <label>Duración máxima (años)<input type="number" min={1} max={10} className={field} value={profile.max_years ?? ""} onChange={(event) => change("max_years", event.target.value === "" ? null : Number(event.target.value))} /></label>
      </div>
      <fieldset className="space-y-4"><legend className="font-semibold">Cómo de importante es cada condición</legend>
        <div className="grid gap-4 md:grid-cols-2">{(["budget", "institution", "modality", "duration"] as const).map((key) =>
          <label key={key}>{conditionLabels[key]}<select className={field}
            value={profile.requirements?.[key] ?? (key === "budget" && profile.budget_strict || key === "modality" && profile.modality_strict ? "mandatory" : "flexible")}
            onChange={(event) => requirement(key, event.target.value as RequirementLevel)}>
            {Object.entries(requirementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>)}</div>
      </fieldset>
      <p className="text-sm">Las condiciones de presupuesto, tipo de universidad y duración quedan pendientes de verificar. Para modalidad, «obligatoria» actúa como restricción. Los pesos siguientes determinan la importancia en el ranking.</p>
      <fieldset className="space-y-4"><legend className="font-semibold">Pesos del ranking</legend>
        {[["interests", "Intereses"], ["location", "Ubicación"], ["modality", "Modalidad"]].map(([key, label]) => <label key={key} className="block">{label} · {profile.priorities[key]} / 5
          <input type="range" min={0} max={5} value={profile.priorities[key]} onChange={(event) => change("priorities", { ...profile.priorities, [key]: Number(event.target.value) })} className="ml-4 align-middle" />
        </label>)}
      </fieldset>
    </div>}
    {step === 6 && <div className="space-y-4">
      <p>Revisa tu perfil y vuelve a cualquier sección para editarla.</p>
      <OrientationProfileView profile={profile} onEdit={move} />
    </div>}
    {validation.length > 0 && <div role={submitted ? "alert" : "status"} className="border border-amber-500 p-4 text-sm">
      <ul className="list-disc pl-5">{validation.map((message) => <li key={message}>{message}</li>)}</ul>
      {submitted && <p className="mt-2">Revisa estas respuestas antes de continuar.</p>}
    </div>}
    <div className="flex flex-wrap gap-4 border-t border-[var(--color-border)] pt-6">
      {step > 0 && <button type="button" className={button} onClick={() => move(step - 1)}>Anterior</button>}
      {step < orientationReviewStep && <button type="button" className={button} onClick={() => move(orientationReviewStep)}>Revisar respuestas</button>}
      <button type="submit" className={button + " bg-[var(--color-degree)]/10"}>{step === orientationReviewStep ? "Ver mis opciones afines" : "Continuar"}</button>
    </div>
  </form>;
}
