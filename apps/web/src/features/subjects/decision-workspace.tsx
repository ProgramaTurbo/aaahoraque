"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteScenario, saveDecision } from "@/app/subjects/decision/actions";
import { addFavorite, removeFavorite } from "@/app/panel/favorite-actions";
import { CatalogSearch } from "./catalog-search";
import {
  creditsFormat, isOutsidePeriod, isPeriod, periodNames, selectionCredits, semesterName, subjectTypes,
  type DecisionDraft, type DecisionSubject, type DecisionTab, type OfficialEvidence, type Period,
} from "@/lib/subjects/decision";
import { emptySubjectPreferences, preferenceLabels, subjectPreferenceFields, type SubjectPreferences, type SubjectProgress } from "@/lib/subjects/progress";

type SavedDecision = DecisionDraft & {
  id: string; version: number; kind: "draft" | "scenario"; name: string | null; preferences: SubjectPreferences | null;
};
type ScenarioForm = DecisionDraft & { id?: string; version: number; name: string; preferences: SubjectPreferences };
type DraftForm = DecisionDraft & { id?: string; version: number };
type Props = {
  planId: string; subjects: DecisionSubject[]; progress: SubjectProgress | null;
  decisions: SavedDecision[]; evidence: OfficialEvidence[]; favorites: { id: string; subjectId: string }[];
  initialTab: DecisionTab; scenarioId?: string; subjectId?: string;
};

const card = "rounded-2xl border border-border bg-bg-card p-5 sm:p-6";
const primary = "rounded-lg bg-subjects-fill px-4 py-2.5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover disabled:opacity-50";
const secondary = "rounded-lg border border-control-border px-3 py-2 text-sm font-semibold text-fg hover:bg-bg-card-hover disabled:opacity-50";
const field = "mt-1 block w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-fg";
const muted = "text-sm text-[var(--color-fg-dim)]";
const link = "font-semibold text-subjects underline underline-offset-2";
const defaultDraft: DraftForm = { period: "1", target: 30, subjectIds: [], version: 0 };

function ects(value: number) {
  return `${creditsFormat.format(value)} ECTS`;
}

export function DecisionWorkspace({ planId, subjects, progress, decisions, evidence, favorites, initialTab, scenarioId, subjectId }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [tab, setTab] = useState<DecisionTab>(initialTab);
  const [compared, setCompared] = useState<string[]>([...new Set([subjectId, ...(progress?.shortlist ?? [])].filter((id): id is string =>
    Boolean(id && subjects.some((subject) => subject.id === id))))].slice(0, 3));
  const [draft, setDraft] = useState<DraftForm>(() => decisions.find((row) => row.kind === "draft") ?? defaultDraft);
  const scenarios = decisions.filter((row) => row.kind === "scenario");
  const [draftDirty, setDraftDirty] = useState(false);
  const [scenarioDirty, setScenarioDirty] = useState(false);
  const [comparison, setComparison] = useState({ first: "", second: "" });
  const [scenario, setScenario] = useState<ScenarioForm>(() => {
    const saved = scenarios.find((option) => option.id === scenarioId);
    return saved ? { ...saved, name: saved.name ?? "", preferences: saved.preferences ?? emptySubjectPreferences() } :
      { period: draft.period, target: draft.target, subjectIds: draft.subjectIds, name: "", version: 0, preferences: progress?.preferences ?? emptySubjectPreferences() };
  });

  useEffect(() => {
    if (!draftDirty && !scenarioDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [draftDirty, scenarioDirty]);

  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const completed = new Set(progress?.completed ?? []);
  const favoriteIds = new Map(favorites.map((item) => [item.subjectId, item.id]));
  const evidenceById = new Map(evidence.map((item) => [item.subjectId, item]));
  const priorities = progress ? subjectPreferenceFields.filter((key) => {
    const value = progress.preferences[key];
    return value !== null && value > 0;
  }).sort((a, b) => (progress.preferences[b] ?? 0) - (progress.preferences[a] ?? 0)).slice(0, 3) : [];
  const scenarioA = scenarios.find((item) => item.id === comparison.first);
  const scenarioB = scenarios.find((item) => item.id === comparison.second);
  const selectedSubjects = (ids: string[]) => ids.flatMap((id) => {
    const subject = byId.get(id);
    return subject ? [subject] : [];
  });

  function run(action: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try { await action(); } catch { setMessage({ text: "No se ha podido guardar el cambio. Vuelve a intentarlo.", error: true }); }
    });
  }

  function chooseTab(value: DecisionTab) {
    setTab(value);
    setMessage(null);
  }

  function editDraft(value: DraftForm) {
    setDraft(value);
    setDraftDirty(true);
    setMessage(null);
  }

  function editScenario(value: ScenarioForm) {
    setScenario(value);
    setScenarioDirty(true);
    setMessage(null);
  }

  function canReplaceScenario() {
    return !scenarioDirty || window.confirm("Tienes cambios sin guardar en el escenario. ¿Quieres descartarlos?");
  }

  function saveDraft() {
    run(async () => {
      const result = await saveDecision(planId, "draft", { ...draft, subjectIds: selectedSubjects(draft.subjectIds).map((item) => item.id) });
      if (result.error) setMessage({ text: result.error, error: true });
      if (result.saved) {
        setDraft({ ...draft, ...result.saved });
        setDraftDirty(false);
        setMessage({ text: "Borrador de semestre guardado." });
      }
    });
  }

  function newScenario(subjectIds = draft.subjectIds) {
    if (!canReplaceScenario()) return;
    resetScenario(subjectIds);
  }

  function resetScenario(subjectIds = draft.subjectIds) {
    setScenarioDirty(false);
    setScenario({
      period: draft.period, target: draft.target, subjectIds, name: "", version: 0,
      preferences: progress?.preferences ?? emptySubjectPreferences(),
    });
    chooseTab("escenarios");
  }

  function saveScenario() {
    run(async () => {
      const result = await saveDecision(planId, "scenario", { ...scenario, subjectIds: selectedSubjects(scenario.subjectIds).map((item) => item.id) });
      if (result.error) setMessage({ text: result.error, error: true });
      if (result.saved) {
        setScenario({ ...scenario, ...result.saved, name: scenario.name.trim() });
        setScenarioDirty(false);
        setMessage({ text: "Escenario guardado." });
      }
    });
  }

  function addToDraft(id: string) {
    if (draft.subjectIds.length >= 80 && !draft.subjectIds.includes(id)) {
      setMessage({ text: "El borrador admite hasta 80 asignaturas.", error: true });
      return;
    }
    if (!draft.subjectIds.includes(id)) editDraft({ ...draft, subjectIds: [...draft.subjectIds, id] });
    chooseTab("semestre");
  }

  const tabs = [
    { id: "decidir", label: "Comparar asignaturas" },
    { id: "semestre", label: "Próximo semestre" },
    { id: "escenarios", label: "Mis escenarios" },
  ] as const;
  return <div className="space-y-5">
    <nav aria-label="Ayuda a la decisión" className="flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => chooseTab(item.id)}
        className={tab === item.id ? primary : secondary}>{item.label}</button>)}
    </nav>
    {message && <p role={message.error ? "alert" : "status"} className={`rounded-lg border border-subjects-border bg-subjects-surface p-3 text-sm ${message.error ? "font-semibold" : ""}`}>{message.text}</p>}

    {tab === "decidir" && <section aria-labelledby="decision-compare" className="space-y-4">
      <div className={card}>
        <h2 id="decision-compare" className="text-xl font-semibold">Comparar asignaturas</h2>
        <p className={`${muted} mt-2`}>Elige hasta tres alternativas. Contrasta los créditos, cuándo se cursan, la evaluación y los resultados históricos cuando estén disponibles.</p>
        {priorities.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={muted}>Tus prioridades más altas</span>
          {priorities.map((key) => <span key={key} className="rounded-full border border-subjects-border bg-subjects-surface px-2.5 py-1 text-subjects">
            {preferenceLabels[key]} · {progress?.preferences[key]}/10
          </span>)}
        </div>}
        <div className="mt-4 max-w-2xl">
          <SubjectSearch label="Añadir una asignatura a la comparación" subjects={subjects} selected={compared} disabled={compared.length >= 3}
            onSelect={(id) => setCompared([...compared, id])} />
          {compared.length >= 3 && <p className={`${muted} mt-2`}>Quita una alternativa para añadir otra.</p>}
        </div>
        {compared.length >= 2 && <button type="button" className={`${secondary} mt-4`} onClick={() => newScenario(compared)}>Crear un escenario con esta selección</button>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {selectedSubjects(compared).map((item) => <article key={item.id} className={`${card} flex flex-col gap-3`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">{item.name}</h3>
            <button type="button" className={secondary} aria-label={`Quitar ${item.name} de la comparación`}
              onClick={() => setCompared(compared.filter((id) => id !== item.id))}>Quitar</button>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className={muted}>Créditos</dt><dd>{ects(item.ects)}</dd></div>
            <div><dt className={muted}>Curso</dt><dd>{item.year ?? "Sin indicar"}</dd></div>
            <div><dt className={muted}>Periodo</dt><dd>{semesterName(item.semester)}</dd></div>
            <div><dt className={muted}>Tipo</dt><dd>{subjectTypes[item.type ?? ""] ?? "Sin indicar"}</dd></div>
          </dl>
          {(completed.has(item.id) || item.knownUnavailable) && <p className="rounded-lg bg-subjects-surface p-2 text-sm">
            {[completed.has(item.id) ? "Marcada como superada en tu expediente." : null,
              item.knownUnavailable ? "El catálogo la indica como no ofertada." : null].filter(Boolean).join(" ")}
          </p>}
          <SubjectEvidence evidence={evidenceById.get(item.id)} />
          {item.sourceUrl && <a href={item.sourceUrl} className={`${link} text-sm`}>Fuente del catálogo</a>}
          <DraftFit item={item} draft={draft} selected={selectedSubjects(draft.subjectIds)} />
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <button type="button" className={primary} onClick={() => addToDraft(item.id)}>Añadir al semestre</button>
            <button type="button" className={secondary} disabled={pending} aria-pressed={favoriteIds.has(item.id)}
              onClick={() => run(async () => {
                const favorite = favoriteIds.get(item.id);
                const result = favorite ? await removeFavorite(favorite) : await addFavorite({ kind: "subject", id: item.id });
                setMessage({ text: result.error ?? (favorite ? "Asignatura retirada de favoritos." : "Asignatura guardada en favoritos."), error: Boolean(result.error) });
              })}>{favoriteIds.has(item.id) ? "Quitar de favoritos" : "Guardar en favoritos"}</button>
          </div>
        </article>)}
      </div>
    </section>}

    {tab === "semestre" && <section className={card} aria-labelledby="semester-title">
      <h2 id="semester-title" className="text-xl font-semibold">Próximo semestre</h2>
      <p className={`${muted} mt-2`}>Fija tu objetivo de créditos y prepara la selección que quieres revisar antes de matricularte.</p>
      <PlanEditor value={draft} onChange={editDraft} subjects={subjects} completed={completed} disabled={pending} />
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={primary} onClick={saveDraft} disabled={pending || !validTarget(draft.target) || (Boolean(draft.id) && !draftDirty)}>Guardar borrador</button>
        <button type="button" className={secondary} onClick={() => newScenario()} disabled={pending}>Crear escenario a partir del borrador</button>
      </div>
    </section>}

    {tab === "escenarios" && <section className="space-y-4" aria-labelledby="scenarios-title">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className={card}>
          <h2 id="scenarios-title" className="text-xl font-semibold">Mis escenarios</h2>
          <p className={`${muted} mt-2`}>Guarda combinaciones con objetivos y prioridades propios.</p>
          <button type="button" onClick={() => newScenario()} disabled={pending} className={`${secondary} mt-4`}>Nuevo escenario</button>
          {scenarios.length > 0 ? <ul className="mt-4 space-y-2">
            {scenarios.map((saved) => <li key={saved.id}>
              <button type="button" aria-pressed={scenario.id === saved.id} disabled={pending}
                className={`${secondary} w-full text-left aria-pressed:border-subjects aria-pressed:bg-subjects-surface`}
                onClick={() => {
                  if (scenario.id === saved.id || !canReplaceScenario()) return;
                  setMessage(null);
                  setScenarioDirty(false);
                  setScenario({ ...saved, name: saved.name ?? "", preferences: saved.preferences ?? emptySubjectPreferences() });
                }}>
                {saved.name}<span className={`${muted} mt-1 block font-normal`}>{periodNames[saved.period]} · {ects(selectionCredits(selectedSubjects(saved.subjectIds)))}</span>
              </button>
            </li>)}
          </ul> : <p className={`${muted} mt-4`}>Todavía no tienes escenarios guardados.</p>}
        </div>
        <div className={card}>
          <h3 className="text-xl font-semibold">{scenario.id ? "Editar escenario" : "Nuevo escenario"}</h3>
          <label className="mt-4 block text-sm font-semibold">Nombre del escenario
            <input className={field} value={scenario.name} maxLength={80} disabled={pending} placeholder="Optativas de datos"
              onChange={(event) => editScenario({ ...scenario, name: event.target.value })} />
          </label>
          <PlanEditor value={scenario} onChange={editScenario} subjects={subjects} completed={completed} disabled={pending} />
          <details className="mt-5 rounded-lg border border-border p-3">
            <summary className="cursor-pointer font-semibold">Prioridades de este escenario</summary>
            <p className={`${muted} mt-2`}>Puedes cambiar las prioridades para esta alternativa (0–10).</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {subjectPreferenceFields.map((key) => <label key={key} className="text-sm">{preferenceLabels[key]}
                <input type="number" min="0" max="10" disabled={pending} placeholder="Sin responder" className={field}
                  value={scenario.preferences[key] ?? ""} onChange={(event) => {
                    const value = event.target.valueAsNumber;
                    if (event.target.value && (!Number.isInteger(value) || value < 0 || value > 10)) return;
                    editScenario({ ...scenario, preferences: { ...scenario.preferences, [key]: event.target.value ? value : null } });
                  }} />
              </label>)}
            </div>
          </details>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={pending || !scenario.name.trim() || !validTarget(scenario.target) || (Boolean(scenario.id) && !scenarioDirty)} onClick={saveScenario}>Guardar escenario</button>
            <button type="button" className={secondary} disabled={pending} onClick={() => {
              if (draftDirty && !window.confirm("¿Sustituir la selección sin guardar del borrador?")) return;
              editDraft({ ...draft, period: scenario.period, target: scenario.target, subjectIds: scenario.subjectIds });
              chooseTab("semestre");
            }}>Cargar en el borrador</button>
            {scenario.id && <button type="button" className={secondary} disabled={pending} onClick={() => {
              const id = scenario.id;
              if (!id || !window.confirm(`¿Borrar «${scenario.name}»?`)) return;
              run(async () => {
                const result = await deleteScenario(planId, id, scenario.version);
                if (result.error) setMessage({ text: result.error, error: true });
                else {
                  resetScenario();
                  setComparison({
                    first: comparison.first === id ? "" : comparison.first,
                    second: comparison.second === id ? "" : comparison.second,
                  });
                  setMessage({ text: "Escenario eliminado." });
                }
              });
            }}>Borrar escenario</button>}
          </div>
        </div>
      </div>
      {scenarios.length >= 2 && <div className={card}>
        <h3 className="text-xl font-semibold">Comparar escenarios</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["first", "second"] as const).map((slot, index) => <label key={slot} className="text-sm font-semibold">Escenario {index + 1}
            <select className={field} value={comparison[slot]} onChange={(event) => setComparison({ ...comparison, [slot]: event.target.value })}>
              <option value="">Seleccionar escenario</option>
              {scenarios.filter((item) => item.id !== comparison[slot === "first" ? "second" : "first"]).map((item) =>
                <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>)}
        </div>
        {scenarioA && scenarioB && <ScenarioComparison first={scenarioA} second={scenarioB} subjects={subjects} completed={completed} />}
      </div>}
    </section>}
  </div>;
}

function DraftFit({ item, draft, selected }: { item: DecisionSubject; draft: DecisionDraft; selected: DecisionSubject[] }) {
  if (draft.subjectIds.includes(item.id)) return <p className={muted}>Ya figura en tu borrador del semestre.</p>;
  const valid = validTarget(draft.target);
  const projected = selectionCredits([...selected, item]);
  if (!valid && !isOutsidePeriod(item, draft.period)) return null;
  return <p className={muted}>
    {isOutsidePeriod(item, draft.period) && <strong className="text-subjects">Figura fuera del periodo del borrador. </strong>}
    {valid && <>Si la añades, el borrador quedará en {ects(projected)} de {ects(draft.target)}.</>}
  </p>;
}

function validTarget(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 120;
}

function SubjectSearch({ label, subjects, selected, disabled, onSelect }: {
  label: string; subjects: DecisionSubject[]; selected: string[]; disabled?: boolean; onSelect: (id: string) => void;
}) {
  return <CatalogSearch label={label} placeholder="Nombre o código de la asignatura" disabled={disabled} onSelect={onSelect}
    options={subjects.filter((item) => !selected.includes(item.id)).map((item) => ({
      id: item.id, label: item.name, keywords: item.code ?? undefined,
      detail: [ects(item.ects), item.year ? `Curso ${item.year}` : null, semesterName(item.semester)].filter(Boolean).join(" · "),
    }))} />;
}

function PlanEditor<T extends DecisionDraft>({ value, onChange, subjects, completed, disabled }: {
  value: T; onChange: (value: T) => void; subjects: DecisionSubject[]; completed: Set<string>; disabled: boolean;
}) {
  const picked = subjects.filter((item) => value.subjectIds.includes(item.id));
  const total = selectionCredits(picked);
  const target = validTarget(value.target) ? value.target : 0;
  const remaining = Math.round((target - total) * 100) / 100;
  return <div className="mt-4 space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold">Periodo
        <select className={field} value={value.period} disabled={disabled} onChange={(event) => {
          const period = event.target.value;
          if (isPeriod(period)) onChange({ ...value, period });
        }}>
          {Object.entries(periodNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Objetivo de ECTS
        <input className={field} type="number" min="1" max="120" disabled={disabled} value={value.target || ""}
          onChange={(event) => onChange({ ...value, target: Number(event.target.value) })} />
      </label>
    </div>
    <div className="rounded-xl border border-subjects-border bg-subjects-surface p-3">
      <p className="font-semibold">{ects(total)} seleccionados{target ? ` de ${ects(target)}` : ""}</p>
      {target > 0 && <>
        <progress aria-label="Créditos seleccionados respecto al objetivo" max={target} value={Math.min(total, target)} className="h-2 w-full accent-subjects-fill" />
        <p className={muted}>{remaining > 0 ? `Faltan ${ects(remaining)} para tu objetivo.` : remaining < 0 ? `Superas el objetivo en ${ects(-remaining)}.` : "Has alcanzado tu objetivo de créditos."}</p>
      </>}
    </div>
    <SubjectSearch label="Añadir asignatura" subjects={subjects} selected={value.subjectIds} disabled={disabled || picked.length >= 80}
      onSelect={(id) => onChange({ ...value, subjectIds: [...value.subjectIds, id] })} />
    {picked.length > 0 && <ul className="divide-y divide-border">
      {picked.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
        <div><p className="font-medium">{item.name}</p>
          <p className={muted}>{ects(item.ects)} · {semesterName(item.semester)}</p>
          <SelectionWarnings subject={item} completed={completed.has(item.id)} period={value.period} />
        </div>
        <button type="button" className={secondary} disabled={disabled} aria-label={`Quitar ${item.name} de la selección`}
          onClick={() => onChange({ ...value, subjectIds: value.subjectIds.filter((id) => id !== item.id) })}>Quitar</button>
      </li>)}
    </ul>}
    {value.subjectIds.length > picked.length && <p className={muted}>Hay asignaturas guardadas que han dejado de figurar en este plan. Al guardar se actualizará la selección.</p>}
  </div>;
}

function SelectionWarnings({ subject, completed, period, contextual }: { subject: DecisionSubject; completed: boolean; period: Period; contextual?: boolean }) {
  const notes = [
    completed ? "Superada en tu expediente" : null,
    subject.knownUnavailable ? "No ofertada según el catálogo" : null,
    isOutsidePeriod(subject, period) ? "Figura en otro semestre" : null,
    subject.semester === null ? "Periodo sin confirmar" : null,
  ].filter(Boolean);
  return notes.length ? <p className="mt-1 text-sm font-semibold text-subjects">{contextual && <strong>{subject.name} · </strong>}{notes.join(" · ")}</p> : null;
}

function SubjectEvidence({ evidence }: { evidence?: OfficialEvidence }) {
  const details = evidence?.guide;
  return <div className={muted}>
    {details ? <details className="rounded-lg border border-border p-2.5">
      <summary className="cursor-pointer font-semibold text-fg">Guía docente</summary>
      {details.program && <><h4 className="mt-2 font-semibold text-fg">Programa</h4><p className="whitespace-pre-line">{details.program}</p></>}
      {details.assessment && <><h4 className="mt-2 font-semibold text-fg">Evaluación</h4><p className="whitespace-pre-line">{details.assessment}</p></>}
      <a className={link} href={details.sourceUrl}>Consultar guía completa</a>
    </details> : <p>Evaluación sin datos en el catálogo.</p>}
    {evidence?.grades.length ? <div className="mt-2">
      <h4 className="font-semibold text-fg">Resultados históricos oficiales</h4>
      <ul className="mt-1 space-y-1">
        {evidence.grades.map((row, index) => <li key={`${row.course}:${row.sourceUrl}:${index}`}>
          {row.course}: {row.passed} aprobados de {row.total} (incluye no presentados) · <a className={link} href={row.sourceUrl}>Fuente</a>
        </li>)}
      </ul>
    </div> : null}
  </div>;
}

function ScenarioComparison({ first, second, subjects, completed }: {
  first: SavedDecision; second: SavedDecision; subjects: DecisionSubject[]; completed: Set<string>;
}) {
  const onlyFirst = subjects.filter((item) => first.subjectIds.includes(item.id) && !second.subjectIds.includes(item.id));
  const onlySecond = subjects.filter((item) => second.subjectIds.includes(item.id) && !first.subjectIds.includes(item.id));
  const preferences = subjectPreferenceFields.filter((key) => (first.preferences?.[key] ?? null) !== (second.preferences?.[key] ?? null));
  return <div className="mt-4 space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      {([{ scenario: first, unique: onlyFirst }, { scenario: second, unique: onlySecond }]).map(({ scenario, unique }) => {
        const items = subjects.filter((item) => scenario.subjectIds.includes(item.id));
        return <article key={scenario.id} className="space-y-2 rounded-xl border border-border p-3">
          <h4 className="font-semibold">{scenario.name}</h4>
          <p className={muted}>{periodNames[scenario.period]} · {ects(selectionCredits(items))} de {ects(scenario.target)}</p>
          <p className="text-sm font-medium">Asignaturas exclusivas</p>
          {unique.length ? <ul className="space-y-1">
            {unique.map((item) => <li key={item.id} className="text-sm">{item.name} · {ects(item.ects)}</li>)}
          </ul> : <p className={muted}>Ninguna.</p>}
          {items.map((item) => <SelectionWarnings key={item.id} subject={item} completed={completed.has(item.id)}
            period={scenario.period} contextual />)}
        </article>;
      })}
    </div>
    {preferences.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="mb-2 text-left font-semibold">Prioridades que cambian</caption>
      <thead><tr className="border-b border-border">
        <th scope="col" className="p-2">Prioridad</th><th scope="col" className="p-2">{first.name}</th><th scope="col" className="p-2">{second.name}</th>
      </tr></thead>
      <tbody>{preferences.map((key) => <tr key={key} className="border-b border-border">
        <th scope="row" className="p-2 font-medium">{preferenceLabels[key]}</th>
        <td className="p-2">{first.preferences?.[key] ?? "Sin responder"}</td><td className="p-2">{second.preferences?.[key] ?? "Sin responder"}</td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}
