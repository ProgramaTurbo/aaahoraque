import {
  areas, deriveOrientationProfile, interestChoices, comparisonOptions, requirementLabels,
  type OrientationProfile, type ProfileMeasure,
} from "./orientation-profile";

export function ProfileMeasureChart({ title, measures }: {
  title: string;
  measures: (ProfileMeasure & { label: string; annotation?: string })[];
}) {
  return <section className="space-y-3">
    <h3 className="font-semibold">{title}</h3>
    <dl className="grid gap-3 sm:grid-cols-2">
      {measures.map((measure) => <div key={measure.questionId} className="min-w-0 text-sm">
        <dt>{measure.label}</dt>
        <dd>{measure.value === null
          ? measure.state === "unknown" ? "No sabe valorarlo" : "Sin responder"
          : <><span>{measure.value}/100</span><meter aria-label={measure.label} min={0} max={100} value={measure.value} className="mt-1 block w-full" /></>}
        </dd>
        {measure.annotation && <dd className="text-xs text-[var(--color-fg-dim)]">{measure.annotation}</dd>}
      </div>)}
    </dl>
  </section>;
}

export function OrientationProfileView({ profile, onEdit }: { profile: OrientationProfile; onEdit?: (step: number) => void }) {
  const derived = deriveOrientationProfile(profile);
  function editButton(step: number) {
    return onEdit && <button type="button" onClick={() => onEdit(step)} className="mt-3 text-sm text-[var(--color-degree-bright)] underline">Editar respuestas</button>;
  }
  return <div className="space-y-4">
    <p className="text-sm">{derived.coverage.valid}/{derived.coverage.applicable} preguntas del perfil con valoración · {derived.coverage.percent}% de cobertura. Las preguntas adicionales se cuentan solo para las áreas exploradas.</p>
    <p className="text-sm">El ranking utiliza el interés declarado, la ubicación y la modalidad con los pesos elegidos. Las demás dimensiones ayudan a describir tu perfil.</p>
    <details open className="space-y-4 border border-[var(--color-border)] p-4">
      <summary className="cursor-pointer font-semibold">Intereses generales y subintereses</summary>
      <ProfileMeasureChart title="Interés declarado por área · 0–100" measures={areas.map(([id, label]) => ({
        ...derived.generalInterests[id], label,
        annotation: derived.areaCoverage[id].valid + "/" + derived.areaCoverage[id].applicable + " respuestas disponibles" + (derived.areaCoverage[id].limited ? " · Poca información adicional" : ""),
      }))} />
      {Object.entries(derived.subinterests).map(([area, measures]) => <ProfileMeasureChart key={area} title={areas.find(([id]) => id === area)?.[1] ?? area} measures={measures} />)}
      {derived.exploredAreas.length === 0 && <p className="text-sm">Valora positivamente alguna área para explorar sus subintereses.</p>}
      {editButton(0)}
    </details>
    <details className="space-y-4 border border-[var(--color-border)] p-4">
      <summary className="cursor-pointer font-semibold">Preferencias A/B y evidencias sobre actividades</summary>
      <p className="text-sm">La escala comparativa indica qué actividad prefieres frente a otra. «Ambas» y «Ninguna» se cuentan como evidencia propia y conservan tu interés declarado.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {areas.map(([id, label]) => {
          const evidence = derived.comparativePreferences[id];
          return <div key={id} className="space-y-1 text-sm">
            <p className="font-semibold">{label}</p>
            {evidence.preference === null ? <p>Sin comparaciones relativas válidas</p>
              : <><p>Preferencia comparativa · {Math.round(evidence.preference)}/100</p>
                <meter aria-label={"Preferencia comparativa de " + label} min={0} max={100} value={evidence.preference} className="block w-full" /></>}
            <p>{evidence.relativeCount} comparaciones relativas · {evidence.positive} evidencias positivas · {evidence.negative} negativas</p>
            <p>{evidence.unknown} por desconocimiento · {evidence.unanswered} sin responder</p>
          </div>;
        })}
      </div>
      <details className="space-y-2">
        <summary className="cursor-pointer text-sm font-semibold">Respuestas originales y evidencia de cada actividad</summary>
        <ul className="space-y-3 text-sm">{interestChoices.map(([id, a, b]) => <li key={id}>
          <p>{a} / {b} · {comparisonOptions.find(([key]) => key === profile.comparisons?.[id])?.[1] ?? "Sin responder"}</p>
          {derived.activityEvidence.filter(({ questionId }) => questionId === id).map((evidence) => <p key={evidence.area}>
            {evidence.activity} · {evidence.relative !== null
              ? evidence.relative > 0 ? "Preferida en esta pareja" : "La otra actividad se prefirió en esta pareja"
              : evidence.absolute !== null ? evidence.absolute > 0 ? "Evidencia positiva" : "Evidencia negativa"
              : evidence.state === "unknown" ? "Desconocimiento" : "Sin responder"}
          </p>)}
        </li>)}</ul>
      </details>
      {editButton(1)}
    </details>
    <details className="space-y-4 border border-[var(--color-border)] p-4">
      <summary className="cursor-pointer font-semibold">Actividades, capacidades percibidas y motivaciones</summary>
      <ProfileMeasureChart title="Actividades valoradas directamente" measures={derived.activityPreferences} />
      <ProfileMeasureChart title="Capacidades autopercibidas" measures={derived.perceivedCapacities} />
      <ProfileMeasureChart title="Motivaciones profesionales" measures={derived.motivations} />
      {(profile.activities.length > 0 || profile.goals.length > 0) && <p className="text-sm">Selecciones anteriores conservadas, pendientes de una valoración de intensidad · {[...profile.activities, ...profile.goals].join(", ")}</p>}
      {editButton(2)}
    </details>
    <details className="space-y-3 border border-[var(--color-border)] p-4">
      <summary className="cursor-pointer font-semibold">Formación</summary>
      <p>Vía de acceso · {accessRouteLabels[profile.access_route]}</p>
      <p>Estudios previos · {profile.previous_studies || "Sin definir"} · {dataStatusLabels[profile.academicStatus?.previous_studies ?? "unknown"]}</p>
      <p className="whitespace-pre-wrap">Asignaturas · {profile.subjects || "Sin definir"} · {dataStatusLabels[profile.academicStatus?.subjects ?? "unknown"]}</p>
      <p>Nota de acceso · {profile.access_grade ?? "Sin definir"} · {dataStatusLabels[profile.academicStatus?.access_grade ?? "unknown"]}</p>
      <p>Nota de admisión · {profile.admission_grade ?? "Sin definir"} · {dataStatusLabels[profile.academicStatus?.admission_grade ?? "unknown"]}</p>
      {editButton(3)}
    </details>
    <details className="space-y-3 border border-[var(--color-border)] p-4">
      <summary className="cursor-pointer font-semibold">Ubicación, condiciones y prioridades</summary>
      <p>Comunidad de origen · {profile.origin_region ?? "Sin definir"}</p>
      <p>Provincia de origen · {profile.origin_province ?? "Sin definir"}</p>
      <p>Movilidad utilizada por el ranking · {mobilityLabels[profile.mobility]}</p>
      <p>Condiciones de desplazamiento · {profile.distance || "Sin definir"}</p>
      {profile.locationPreferences && <>
        <p>Preferidas · {profile.locationPreferences.preferred.join(", ") || "Sin definir"}</p>
        <p>Aceptables · {profile.locationPreferences.acceptable.join(", ") || "Sin definir"}</p>
        <p>Imposibles · {profile.locationPreferences.unavailable.join(", ") || "Sin definir"}</p>
        <p>Mudarse · {feasibilityLabels[profile.locationPreferences.moving]} · Desplazarse · {feasibilityLabels[profile.locationPreferences.commuting]}</p>
      </>}
      {editButton(4)}
      <p>Presupuesto · {profile.budget ?? "Sin definir"} €/año · {profile.budget_strict ? "Límite obligatorio" : "Preferencia"}</p>
      <p>Universidad · {institutionLabels[profile.institution]} · Modalidad · {modalityLabels[profile.modality]} · Duración máxima · {profile.max_years ?? "Sin definir"}</p>
      {Object.entries(profile.requirements ?? {}).map(([key, value]) => <p key={key}>{conditionLabels[key]} · {requirementLabels[value]}</p>)}
      <p>Pesos del ranking (0–5) · Intereses {profile.priorities.interests} · Ubicación {profile.priorities.location} · Modalidad {profile.priorities.modality}</p>
      <p className="text-sm">Las ubicaciones adicionales, las condiciones para mudarte, el presupuesto, el tipo de universidad y la duración quedan recogidos para su futura evaluación. El ranking conserva la movilidad, modalidad y pesos indicados.</p>
      {editButton(5)}
    </details>
  </div>;
}
export const mobilityLabels: Record<OrientationProfile["mobility"], string> = {
  unknown: "No estoy seguro/a", anywhere: "Cualquier provincia",
  prefer_province: "Prefiero mi provincia", require_province: "Solo mi provincia",
  prefer_region: "Prefiero mi comunidad", require_region: "Solo mi comunidad",
};
export const feasibilityLabels = { unknown: "No lo sé", possible: "Posible", conditional: "Posible con condiciones", impossible: "Imposible" };
export const conditionLabels: Record<string, string> = { budget: "Presupuesto", institution: "Tipo de universidad", modality: "Modalidad", duration: "Duración" };

const dataStatusLabels = { confirmed: "Confirmado por el estudiante", estimated: "Estimado", unknown: "Estado desconocido" };
const accessRouteLabels = { unknown: "Sin definir", bachillerato: "Bachillerato", fp_superior: "FP superior", other: "Otra vía" };
const institutionLabels = { unknown: "Sin definir", public: "Pública", private: "Privada", either: "Sin preferencia" };
const modalityLabels = { unknown: "Sin definir", on_site: "Presencial", online: "Online", hybrid: "Híbrida" };
