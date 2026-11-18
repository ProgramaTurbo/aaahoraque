"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deleteScenario, saveDecision } from "@/app/subjects/decision/actions";
import { addFavorite, removeFavorite } from "@/app/panel/favorite-actions";
import { CatalogSearch } from "./catalog-search";
import { ScenarioComparison } from "./scenario-comparison";
import { StudentObservatory } from "./student-observatory";
import {
  creditsFormat, isOutsidePeriod, isPeriod, periodNames, selectionCredits, semesterName,
  type DecisionDraft, type DecisionSubject, type DecisionTab, type OfficialEvidence, type Period,
} from "@/lib/subjects/decision";
import { emptySubjectPreferences, preferenceLabels, subjectPreferenceFields, type SubjectPreferences, type SubjectProgress } from "@/lib/subjects/progress";
import type { ObservatoryHistory } from "@/lib/subjects/observatory-history";

type SavedDecision = DecisionDraft & {
  id: string; version: number; kind: "draft" | "scenario"; name: string | null; preferences: SubjectPreferences | null;
};
type ScenarioForm = DecisionDraft & { id?: string; version: number; name: string; preferences: SubjectPreferences };
type DraftForm = DecisionDraft & { id?: string; version: number };
type Props = {
  planId: string; totalCredits: number; subjects: DecisionSubject[]; progress: SubjectProgress | null;
  decisions: SavedDecision[]; evidence: OfficialEvidence[]; history: ObservatoryHistory; favorites: { id: string; subjectId: string }[];
  initialTab: DecisionTab; scenarioId?: string; subjectId?: string;
};

const card = "rounded-2xl border border-border bg-bg-card p-5 sm:p-6";
const primary = "rounded-lg bg-subjects-fill px-4 py-2.5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover disabled:opacity-50";
const secondary = "rounded-lg border border-control-border px-3 py-2 text-sm font-semibold text-fg hover:bg-bg-card-hover disabled:opacity-50";
const field = "mt-1 block w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-fg";
const muted = "text-sm text-[var(--color-fg-dim)]";
const defaultDraft: DraftForm = { period: "1", target: 30, subjectIds: [], version: 0 };

function ects(value: number) {
  return `${creditsFormat.format(value)} ECTS`;
}

export function DecisionWorkspace({ planId, totalCredits, subjects, progress, decisions, evidence, history, favorites, initialTab, scenarioId, subjectId }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [tab, setTab] = useState<DecisionTab>(initialTab);
  const workspaceNav = useRef<HTMLElement>(null);
  const [compared, setCompared] = useState<string[]>(() => [...new Set([subjectId, ...(progress?.shortlist ?? [])].filter((id): id is string =>
    Boolean(id && subjects.some((subject) => subject.id === id))))]);
  const [draft, setDraft] = useState<DraftForm>(() => decisions.find((row) => row.kind === "draft") ?? defaultDraft);
  const scenarios = decisions.filter((row) => row.kind === "scenario");
  const [draftDirty, setDraftDirty] = useState(false);
  const [scenarioDirty, setScenarioDirty] = useState(false);
  const [scenarioPeriod, setScenarioPeriod] = useState("all");
  const [comparison, setComparison] = useState<string[]>([]);
  const filteredScenarios = scenarios.filter((item) => scenarioPeriod === "all" || item.period === scenarioPeriod);
  const comparedScenarios = scenarios.filter((item) => comparison.includes(item.id));
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
  const priorities = progress ? subjectPreferenceFields.filter((key) => {
    const value = progress.preferences[key];
    return value !== null && value > 0;
  }).sort((a, b) => (progress.preferences[b] ?? 0) - (progress.preferences[a] ?? 0)).slice(0, 3)
    .map((key) => ({ key, label: preferenceLabels[key], value: progress.preferences[key] ?? 0 })) : [];
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

  function chooseTab(value: DecisionTab, fromAction = false) {
    setTab(value);
    setMessage(null);
    if (fromAction) requestAnimationFrame(() => {
      workspaceNav.current?.scrollIntoView({ block: "start" });
      workspaceNav.current?.querySelector<HTMLButtonElement>("button[aria-pressed=true]")?.focus({ preventScroll: true });
    });
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
    chooseTab("escenarios", true);
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
    if (!draft.subjectIds.includes(id)) {
      const semester = byId.get(id)?.semester;
      const untouchedDraft = !draft.id && !draftDirty && draft.subjectIds.length === 0;
      editDraft({
        ...draft, period: untouchedDraft && isPeriod(semester) ? semester : draft.period,
        subjectIds: [...draft.subjectIds, id],
      });
    }
    chooseTab("semestre", true);
  }

  const tabs = [
    { id: "decidir", label: "Observatorio de asignaturas" },
    { id: "semestre", label: "Próximo semestre" },
    { id: "escenarios", label: "Mis escenarios" },
  ] as const;
  return <div className="space-y-5">
    <nav ref={workspaceNav} aria-label="Ayuda a la decisión" className="scroll-mt-24 flex flex-wrap gap-2 border-b border-border pb-3">
      {tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => chooseTab(item.id)}
        className={tab === item.id ? primary : secondary}>{item.label}</button>)}
    </nav>
    {message && <p role={message.error ? "alert" : "status"} className={`rounded-lg border border-subjects-border bg-subjects-surface p-3 text-sm ${message.error ? "font-semibold" : ""}`}>{message.text}</p>}

    <div hidden={tab !== "decidir"}>
      <StudentObservatory
        subjects={subjects} totalCredits={totalCredits} completed={completed} evidence={evidence} history={history}
        compared={compared} setCompared={setCompared} initialSubjectId={subjectId} draft={draft}
        favorites={favoriteIds} priorities={priorities} pending={pending} onDraft={addToDraft}
        onScenario={() => newScenario(compared)}
        onFavorite={(id) => run(async () => {
          const favorite = favoriteIds.get(id);
          const result = favorite ? await removeFavorite(favorite) : await addFavorite({ kind: "subject", id });
          setMessage({
            text: result.error ?? (favorite ? "Asignatura retirada de favoritos." : "Asignatura guardada en favoritos."),
            error: Boolean(result.error),
          });
        })}
      />
    </div>

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
          {scenarios.length > 0 && <label className="mt-4 block text-sm font-semibold">Periodo de los escenarios guardados
            <select className={field} value={scenarioPeriod} onChange={(event) => setScenarioPeriod(event.target.value)}>
              <option value="all">Todos los periodos</option>
              {Object.entries(periodNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>}
          {filteredScenarios.length > 0 ? <ul className="mt-4 max-h-96 space-y-2 overflow-auto">
            {filteredScenarios.map((saved) => <li key={saved.id}>
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
          </ul> : <p className={`${muted} mt-4`}>{scenarios.length ? "Sin escenarios guardados para ese periodo." : "Todavía no tienes escenarios guardados."}</p>}
        </div>
        <div className={card}>
          <h3 className="text-xl font-semibold">{scenario.id ? "Editar escenario" : "Nuevo escenario"}</h3>
          <label className="mt-4 block text-sm font-semibold">Nombre del escenario
            <input className={field} value={scenario.name} maxLength={80} disabled={pending} placeholder="Optativas de datos"
              onChange={(event) => editScenario({ ...scenario, name: event.target.value })} />
          </label>
          <PlanEditor value={scenario} onChange={editScenario} subjects={subjects} completed={completed} disabled={pending} filterCandidates />
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
                  setComparison((current) => current.filter((selected) => selected !== id));
                  setMessage({ text: "Escenario eliminado." });
                }
              });
            }}>Borrar escenario</button>}
          </div>
        </div>
      </div>
      {scenarios.length >= 2 && <div className={card}>
        <h3 className="text-xl font-semibold">Comparar escenarios</h3>
        <p className={`${muted} mt-2`}>Marca dos o más escenarios guardados. Podrás comparar el curso completo o un semestre sin cambiar lo guardado.</p>
        <ul className="mt-3 grid max-h-60 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((item) => <li key={item.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-subjects has-checked:bg-subjects-surface">
              <input type="checkbox" aria-label={`Comparar escenario ${item.name}`} checked={comparison.includes(item.id)}
                className="size-4 accent-subjects-fill" onChange={(event) => {
                  const checked = event.target.checked;
                  setComparison((current) => checked ? [...current, item.id] : current.filter((id) => id !== item.id));
                }} />
              <span>{item.name}<span className={`${muted} block text-xs`}>{periodNames[item.period]}</span></span>
            </label>
          </li>)}
        </ul>
        <p className={`${muted} mt-3`} role="status">{comparedScenarios.length} en comparación</p>
        {comparedScenarios.length >= 2 && <ScenarioComparison scenarios={comparedScenarios}
          subjects={subjects} completed={completed} history={history} evidence={evidence} />}
      </div>}
    </section>}
  </div>;
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

function PlanEditor<T extends DecisionDraft>({ value, onChange, subjects, completed, disabled, filterCandidates = false }: {
  value: T; onChange: (value: T) => void; subjects: DecisionSubject[]; completed: Set<string>; disabled: boolean; filterCandidates?: boolean;
}) {
  const [candidateYear, setCandidateYear] = useState("all");
  const pickedIds = new Set(value.subjectIds);
  const picked = subjects.filter((item) => pickedIds.has(item.id));
  const onPeriod = (subject: DecisionSubject) => value.period === "annual" || subject.semester === value.period || subject.semester === "annual";
  const years = filterCandidates ? [...new Set(subjects.flatMap((item) => item.year === null ? [] : [item.year]))].sort((a, b) => a - b) : [];
  const candidates = filterCandidates ? subjects.filter((item) => onPeriod(item) && (candidateYear === "all" || item.year === Number(candidateYear))) : subjects;
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
    {filterCandidates && years.length > 0 && <label className="block text-sm font-semibold">Curso del plan para añadir asignaturas
      <select className={field} value={candidateYear} disabled={disabled} onChange={(event) => setCandidateYear(event.target.value)}>
        <option value="all">Todos los cursos</option>
        {years.map((year) => <option key={year} value={year}>{year}.º curso</option>)}
      </select>
    </label>}
    <SubjectSearch label="Añadir asignatura" subjects={candidates} selected={value.subjectIds} disabled={disabled}
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

function SelectionWarnings({ subject, completed, period }: { subject: DecisionSubject; completed: boolean; period: Period }) {
  const notes = [
    completed ? "Superada en tu expediente" : null,
    subject.knownUnavailable ? "No ofertada según el catálogo" : null,
    isOutsidePeriod(subject, period) ? "Figura en otro semestre" : null,
    subject.semester === null ? "Periodo sin confirmar" : null,
  ].filter(Boolean);
  return notes.length ? <p className="mt-1 text-sm font-semibold text-subjects">{notes.join(" · ")}</p> : null;
}
