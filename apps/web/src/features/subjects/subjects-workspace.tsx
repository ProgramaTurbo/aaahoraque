"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveSubjectProgress } from "@/app/subjects/account-actions";
import { normalizeSearch } from "./catalog-search";
import { accountPath } from "@/lib/account/paths";
import { emptySubjectPreferences, normalizeSubjectPreferences, type SubjectPreferenceField, type SubjectProgress, type SubjectTab } from "@/lib/subjects/progress";

type Subject = {
  id: string;
  name: string;
  code: string | null;
  ects: number;
  year: number | null;
  semester: string | null;
  type: string | null;
  difficulty: number | null;
  workload: number | null;
};

type Props = {
  planId: string;
  planName: string;
  degreeName: string;
  centerName: string | null;
  totalEcts: number;
  status: string;
  subjects: Subject[];
  signedIn: boolean;
  initialTab: SubjectTab;
  initialProgress: SubjectProgress | null;
  onDirtyChange: (dirty: boolean) => void;
  returnTo: string;
};

type Field = SubjectPreferenceField;

const learning: { key: Field; label: string; help: string }[] = [
  { key: "theory_preference", label: "Fundamentos teóricos", help: "Interés por modelos, conceptos y explicación teórica." },
  { key: "practice_preference", label: "Aplicación práctica", help: "Preferencia por ejercicios y aplicación de conocimientos." },
  { key: "project_preference", label: "Proyectos", help: "Interés por desarrollar soluciones completas." },
  { key: "teamwork_preference", label: "Trabajo colaborativo", help: "Preferencia por actividades en equipo." },
  { key: "difficulty_tolerance", label: "Exigencia académica asumible", help: "Nivel de dificultad que consideras adecuado para ti." },
  { key: "workload_tolerance", label: "Dedicación asumible", help: "Carga que puedes compaginar con tu situación." },
];
const priorities: { key: Field; label: string; help: string }[] = [
  { key: "academic_affinity", label: "Afinidad académica", help: "Importancia del interés por la materia." },
  { key: "professional_alignment", label: "Proyección profesional", help: "Importancia de su relación con tus objetivos profesionales." },
  { key: "learning_compatibility", label: "Forma de aprender", help: "Importancia del método de aprendizaje." },
  { key: "effort_compatibility", label: "Esfuerzo", help: "Importancia del ajuste con tu disponibilidad." },
];
const fields = [...learning, ...priorities];
const format = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
const typeLabels: Record<string, string> = {
  mandatory: "Obligatoria", optional: "Optativa", basic: "Formación básica",
  internship: "Prácticas", final_project: "Trabajo final",
};
function subjectType(type: string | null) {
  return type ? (typeLabels[type] ?? type) : "Sin clasificar";
}
function semesterLabel(semester: string | null) {
  if (semester === "1") return "1.º semestre";
  if (semester === "2") return "2.º semestre";
  if (semester === "annual") return "Anual";
  return semester ?? "No especificado";
}
function readIds(key: string, allowed: Set<string>, max = Infinity): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((id): id is string => typeof id === "string" && allowed.has(id)))].slice(0, max);
  } catch { return []; }
}
function readLocalPreferences(key: string) {
  try { return normalizeSubjectPreferences(JSON.parse(localStorage.getItem(key) ?? "null")); }
  catch { return emptySubjectPreferences(); }
}

export function SubjectsWorkspace({
  planId, planName, degreeName, centerName, totalEcts, status, subjects,
  signedIn, initialTab, initialProgress, onDirtyChange, returnTo,
}: Props) {
  const [tab, setTab] = useState<SubjectTab>(initialTab);
  const allowedIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);
  const [completed, setCompleted] = useState(() => initialProgress?.completed.filter((id) => allowedIds.has(id)) ?? []);
  const [shortlist, setShortlist] = useState(() => initialProgress?.shortlist.filter((id) => allowedIds.has(id)) ?? []);
  const [preferences, setPreferences] = useState(() => initialProgress?.preferences ?? emptySubjectPreferences());
  const [version, setVersion] = useState(initialProgress?.version ?? 0);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();
  const [term, setTerm] = useState("");
  const [year, setYear] = useState("todos");
  const [type, setType] = useState("todos");
  const synthetic = status === "synthetic" || status === "demo";
  const canSave = signedIn && !synthetic;
  const returnPath = `${returnTo}&section=${tab}`;
  const loginHref = accountPath("/login", returnPath);
  const registerHref = accountPath("/registro", returnPath);

  const completedIds = useMemo(() => new Set(completed), [completed]);
  const selectedIds = useMemo(() => new Set(shortlist), [shortlist]);
  const earnedCredits = subjects.reduce((sum, s) => sum + (completedIds.has(s.id) ? s.ects : 0), 0);
  const selectedSubjects = shortlist.flatMap((id) => {
    const item = subjects.find((s) => s.id === id);
    return item ? [item] : [];
  });
  function matchesSubject(subject: Subject, query: string) {
    const name = normalizeSearch(`${subject.name} ${subject.code ?? ""}`);
    return normalizeSearch(query).split(/\s+/).every((word) => name.includes(word));
  }
  const [recordTerm, setRecordTerm] = useState("");
  const [recordStatus, setRecordStatus] = useState("all");
  const filtered = subjects.filter((s) => matchesSubject(s, term) &&
    (year === "todos" || String(s.year) === year) && (type === "todos" || s.type === type));
  const recordSubjects = subjects.filter((s) => matchesSubject(s, recordTerm) &&
    (recordStatus === "all" || completedIds.has(s.id) === (recordStatus === "completed")));
  const years = [...new Set(subjects.map((s) => s.year))].sort((a, b) => (a ?? 99) - (b ?? 99));
  const types = [...new Set(subjects.map((s) => s.type).filter((x): x is string => x !== null))].sort();
  const totalPriority = priorities.reduce((sum, p) => sum + (preferences[p.key] ?? 0), 0);
  const filled = fields.filter((f) => preferences[f.key] !== null).length;

  function markEdited() {
    setDirty(true);
    if (canSave) onDirtyChange(true);
    setFeedback(undefined);
  }
  function toggleCompleted(id: string) {
    setCompleted(completedIds.has(id) ? completed.filter((x) => x !== id) : [...completed, id]);
    markEdited();
  }
  function toggleShortlist(id: string) {
    setShortlist(selectedIds.has(id) ? shortlist.filter((x) => x !== id) : [...shortlist, id].slice(0, 3));
    markEdited();
  }
  function updatePreference(field: Field, value: number | null) {
    setPreferences({ ...preferences, [field]: value });
    markEdited();
  }
  function importLocalProgress() {
    const localCompleted = readIds(`aaahoraque:academic-state:${planId}`, allowedIds);
    const localShortlist = readIds(`aaahoraque:subjects-shortlist:${planId}`, allowedIds, 3);
    const localPreferences = readLocalPreferences(`aaahoraque:decision-preferences:${planId}`);
    if (!localCompleted.length && !localShortlist.length && !Object.values(localPreferences).some((value) => value !== null)) {
      setFeedback({ error: false, text: "Este navegador no tiene datos anteriores para este plan." });
      return;
    }
    setCompleted(localCompleted);
    setShortlist(localShortlist);
    setPreferences(localPreferences);
    setDirty(true);
    onDirtyChange(true);
    setFeedback({ error: false, text: "Revisa los datos importados y pulsa Guardar progreso para añadirlos a tu cuenta." });
  }
  async function save() {
    setPending(true);
    setFeedback(undefined);
    try {
      const result = await saveSubjectProgress(planId, { completed, shortlist, preferences, version });
      if ("error" in result) setFeedback({ error: true, text: result.error });
      else {
        setVersion(result.version);
        setDirty(false);
        onDirtyChange(false);
        setFeedback({ error: false, text: "Progreso guardado en tu cuenta." });
      }
    } catch {
      setFeedback({ error: true, text: "No se ha podido guardar el progreso. Inténtalo de nuevo." });
    } finally {
      setPending(false);
    }
  }
  const tabItems: { id: SubjectTab; title: string }[] = [
    { id: "catalogo", title: "Asignaturas" },
    { id: "expediente", title: "Mi expediente" },
    { id: "preferencias", title: "Mis prioridades" },
    { id: "comparar", title: `Comparar (${shortlist.length})` },
  ];

  function scoreField(field: { key: Field; label: string; help: string }) {
    return (
      <label key={field.key} className="flex flex-col gap-4 border-b border-[var(--color-border)] py-5 md:flex-row md:items-center md:justify-between">
        <span className="max-w-xl">
          <span className="block font-heading text-base text-[var(--color-fg)]">{field.label}</span>
          <span className="mt-1 block text-sm text-[var(--color-fg-dim)]">{field.help}</span>
        </span>
        <select
          className="min-w-36 border border-control-border bg-bg-card px-4 py-3 text-[var(--color-fg)] focus:border-subjects focus:outline-2 focus:outline-offset-2 focus:outline-subjects"
          aria-label={field.label}
          value={preferences[field.key] ?? ""}
          disabled={pending}
          onChange={(event) => updatePreference(field.key, event.target.value === "" ? null : Number(event.target.value))}
        >
          <option value="">Sin responder</option>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i} / 10</option>)}
        </select>
      </label>
    );
  }

  return (
    <section className={`space-y-5 ${canSave ? "pb-24" : ""}`} aria-label="Espacio de Asignaturas">
      <header className="rounded-2xl border border-border bg-[var(--color-bg-card)] p-5 sm:p-7">
        <h2 className="text-2xl font-semibold">{degreeName}</h2>
        <p className="mt-2 text-sm text-[var(--color-fg-dim)]">{[planName === degreeName ? null : planName, centerName].filter(Boolean).join(" · ")}</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-subjects">
          <li>{subjects.length} asignaturas</li>
          <li>{format.format(totalEcts)} ECTS del plan</li>
          {canSave && <li>{format.format(earnedCredits)} ECTS superados · declarados</li>}
        </ul>
        {synthetic && <p className="mt-4 rounded-lg bg-warning-bg p-3 text-sm text-warning-fg">Plan simulado. Sus asignaturas sirven para explorar la herramienta.</p>}
      </header>

      <nav aria-label="Secciones de Asignaturas" className="flex flex-wrap gap-2 rounded-xl border border-border bg-[var(--color-bg-card)] p-2">
        {tabItems.map((item) => (
          <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition sm:px-4 ${tab === item.id ? "bg-subjects-highlight text-subjects" : "text-[var(--color-fg-dim)] hover:bg-bg-card-hover"}`}>
            {item.title}
          </button>
        ))}
      </nav>

      <div className="rounded-2xl border border-border bg-[var(--color-bg-card)] p-5 sm:p-7">
          {tab === "catalogo" && (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h3 className="text-xl font-semibold">Asignaturas del plan</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Busca y filtra asignaturas. Puedes seleccionar hasta tres para compararlas.</p>
                </div>
                <button type="button" onClick={() => setTab("comparar")} className="border border-[var(--color-subjects)] px-5 py-3 text-sm font-semibold text-[var(--color-subjects)] hover:bg-[var(--color-subjects)]/10">
                  Ver comparación ({shortlist.length}) →
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px]">
                <label className="sr-only" htmlFor="subjects-search">Buscar asignaturas</label>
                <input id="subjects-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre o código" className="w-full border border-control-border bg-bg-card px-4 py-3 text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-subjects focus:outline-2 focus:outline-offset-2 focus:outline-subjects" />
                <label className="sr-only" htmlFor="subjects-year">Curso</label>
                <select id="subjects-year" value={year} onChange={(e) => setYear(e.target.value)} className="border border-control-border bg-bg-card px-4 py-3 text-[var(--color-fg)]">
                  <option value="todos">Todos los cursos</option>
                  {years.map((y) => <option key={y ?? "null"} value={String(y)}>{y === null ? "Sin curso" : `${y}.º curso`}</option>)}
                </select>
                <label className="sr-only" htmlFor="subjects-type">Tipo</label>
                <select id="subjects-type" value={type} onChange={(e) => setType(e.target.value)} className="border border-control-border bg-bg-card px-4 py-3 text-[var(--color-fg)]">
                  <option value="todos">Todos los tipos</option>
                  {types.map((t) => <option key={t} value={t}>{subjectType(t)}</option>)}
                </select>
              </div>
              <p className="font-mono text-xs text-[var(--color-muted)]">{filtered.length} ASIGNATURAS · {shortlist.length}/3 EN COMPARACIÓN</p>
              <div className="divide-y divide-[var(--color-border)]">
                {filtered.map((s) => (
                  <article key={s.id} className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="font-heading text-lg leading-snug">{s.name}</p>
                      <p className="mt-2 text-xs text-[var(--color-fg-dim)]">{s.year === null ? "Curso sin especificar" : `${s.year}.º curso`} · {subjectType(s.type)} · {semesterLabel(s.semester)} · {format.format(s.ects)} ECTS{s.code ? ` · ${s.code}` : ""}</p>
                    </div>
                    <button type="button" onClick={() => toggleShortlist(s.id)} disabled={pending || (!selectedIds.has(s.id) && shortlist.length >= 3)}
                      className={`min-h-11 border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${selectedIds.has(s.id) ? "border-[var(--color-subjects)] bg-[var(--color-subjects)]/15 text-[var(--color-subjects)]" : "border-[var(--color-border-light)] text-[var(--color-fg-dim)] hover:border-[var(--color-subjects)]"}`}>
                      {selectedIds.has(s.id) ? "✓ Seleccionada" : "Comparar +"}
                    </button>
                  </article>
                ))}
                {filtered.length === 0 && <p className="py-10 text-[var(--color-fg-dim)]">No hay asignaturas que coincidan con esos filtros.</p>}
              </div>
            </div>
          )}

          {(tab === "expediente" || tab === "preferencias") && !canSave && (
            <div className="space-y-5">
              <h3 className="font-display text-3xl">{tab === "expediente" ? "Mi expediente" : "Mis prioridades"}</h3>
              {synthetic ? <p>Selecciona un plan oficial para trabajar con tu expediente y guardar tus preferencias.</p> : <>
                <p>Entra con tu cuenta para añadir tus datos y recuperarlos desde otro dispositivo.</p>
                <div className="flex flex-wrap gap-5">
                  <Link href={loginHref} className="font-semibold text-[var(--color-subjects)] underline">Iniciar sesión</Link>
                  <Link href={registerHref} className="underline">Crear cuenta</Link>
                </div>
              </>}
            </div>
          )}
          {tab === "expediente" && canSave && (
            <div className="space-y-7">
              <div>
                <h3 className="text-xl font-semibold">Mi expediente</h3>
                <p className="mt-3 text-[var(--color-fg-dim)]">Marca las asignaturas que has superado. El expediente se basa en tus datos declarados.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-[var(--color-border-light)] p-5"><p className="text-3xl font-display text-[var(--color-subjects)]">{completed.length}</p><p className="mt-2 text-sm text-[var(--color-fg-dim)]">Asignaturas superadas declaradas</p></div>
                <div className="border border-[var(--color-border-light)] p-5"><p className="text-3xl font-display text-[var(--color-subjects)]">{format.format(earnedCredits)}</p><p className="mt-2 text-sm text-[var(--color-fg-dim)]">ECTS declarados como superados</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <input type="search" aria-label="Buscar en mi expediente" placeholder="Buscar por nombre o código"
                  value={recordTerm} onChange={(event) => setRecordTerm(event.target.value)}
                  className="min-h-11 rounded-lg border border-control-border bg-bg-darker px-3 text-sm" />
                <select aria-label="Estado en el expediente" value={recordStatus} onChange={(event) => setRecordStatus(event.target.value)}
                  className="min-h-11 rounded-lg border border-control-border bg-[var(--color-bg-darker)] px-3 text-sm">
                  <option value="all">Todas</option>
                  <option value="completed">Superadas</option>
                  <option value="pending">Sin marcar</option>
                </select>
              </div>
              {!recordSubjects.length && <p className="py-5 text-sm text-[var(--color-fg-dim)]">No hay asignaturas con estos filtros.</p>}
              {years.filter((y) => recordSubjects.some((subject) => subject.year === y)).map((y) => (
                <div key={y ?? "null"} className="border border-[var(--color-border)]">
                  <h4 className="bg-[var(--color-bg-darker)] px-5 py-4 font-heading text-[var(--color-fg)]">{y === null ? "Sin curso asignado" : `${y}.º curso`}</h4>
                  <div className="divide-y divide-[var(--color-border)]">
                    {recordSubjects.filter((s) => s.year === y).map((s) => (
                      <label key={s.id} className={`flex cursor-pointer items-center gap-4 px-5 py-4 ${completedIds.has(s.id) ? "bg-subjects-surface" : "hover:bg-bg-card-hover"}`}>
                        <input type="checkbox" checked={completedIds.has(s.id)} onChange={() => toggleCompleted(s.id)} disabled={pending} className="h-4 w-4 accent-subjects-fill" />
                        <span className="min-w-0 flex-1 text-sm">{s.name}</span>
                        <span className="shrink-0 font-mono text-xs text-[var(--color-fg-dim)]">{format.format(s.ects)} ECTS</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-[var(--color-muted)]">Al guardar, estas asignaturas se añaden al expediente declarado de este plan en tu cuenta.</p>
            </div>
          )}

          {tab === "preferencias" && canSave && (
            <div className="space-y-9">
              <div>
                <h3 className="text-xl font-semibold">Mis prioridades</h3>
                <p className="mt-3 text-[var(--color-fg-dim)]">Indica cómo prefieres aprender y qué criterios pesan más en tu elección.</p>
                <p className="mt-3 font-mono text-xs text-[var(--color-subjects)]">{filled} / {fields.length} RESPUESTAS</p>
              </div>
              <div><h4 className="font-heading text-xl">Cómo quieres aprender</h4><p className="mt-2 text-sm text-[var(--color-fg-dim)]">Escala personal de 0 a 10.</p>{learning.map(scoreField)}</div>
              <div>
                <h4 className="font-heading text-xl">Importancia de los criterios</h4>
                <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Son pesos relativos. No necesitas hacer que sumen diez o cien.</p>
                {priorities.map(scoreField)}
                {totalPriority > 0 && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {priorities.map((p) => (
                      <div key={p.key} className="border border-[var(--color-border-light)] p-4">
                        <p className="text-sm text-[var(--color-fg-dim)]">{p.label}</p>
                        <p className="mt-2 font-display text-2xl text-[var(--color-subjects)]">{format.format(((preferences[p.key] ?? 0) / totalPriority) * 100)} %</p>
                      </div>
                    ))}
                  </div>
                )}
                {priorities.every((p) => preferences[p.key] !== null) && totalPriority === 0 && <p className="mt-5 text-sm text-warning-fg">Asigna un valor positivo a algún criterio si deseas ponderarlos.</p>}
              </div>
            </div>
          )}

          {tab === "comparar" && (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h3 className="text-xl font-semibold">Comparación de asignaturas</h3>
                  <p className="mt-3 text-sm text-[var(--color-fg-dim)]">Consulta en paralelo los créditos, el tipo y el periodo de cada asignatura.</p>
                </div>
                <button type="button" onClick={() => setTab("catalogo")} className="border border-[var(--color-subjects)] px-5 py-3 text-sm text-[var(--color-subjects)] hover:bg-[var(--color-subjects)]/10">Elegir asignaturas →</button>
              </div>
              {selectedSubjects.length === 0 ? (
                <div className="border border-dashed border-[var(--color-border-light)] px-6 py-12 text-center text-[var(--color-fg-dim)]">Aún no has seleccionado alternativas. Vuelve a «Explorar» y añade hasta tres asignaturas.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {selectedSubjects.map((s) => (
                    <article key={s.id} className="flex flex-col border border-control-border bg-bg-card p-5">
                      <h4 className="mt-3 min-h-16 font-display text-xl leading-snug">{s.name}</h4>
                      <dl className="mt-5 flex-1 divide-y divide-[var(--color-border)] text-sm">
                        {[
                          ["ECTS", format.format(s.ects)], ["Curso", s.year == null ? "No especificado" : String(s.year)],
                          ["Tipo", subjectType(s.type)], ["Periodo", semesterLabel(s.semester)],
                          ["Situación", completedIds.has(s.id) ? "Superada (declarado)" : "No indicada como superada"],
                        ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-3"><dt className="text-[var(--color-fg-dim)]">{label}</dt><dd className="text-right">{value}</dd></div>)}
                      </dl>
                      <button type="button" onClick={() => toggleShortlist(s.id)} disabled={pending} className="mt-4 border border-[var(--color-border-light)] px-4 py-2 text-xs text-[var(--color-fg-dim)] hover:border-[var(--color-subjects)]">Quitar de la comparación</button>
                    </article>
                  ))}
                </div>
              )}
              {!signedIn && !synthetic && <p className="text-sm">Tu selección es temporal. <Link href={loginHref} className="underline">Inicia sesión</Link> para crear y guardar tus comparaciones.</p>}
              {shortlist.length > 0 && <p className="text-sm text-[var(--color-fg-dim)]">La comparación se basa en los datos disponibles del catálogo.</p>}
            </div>
          )}
        </div>
      {canSave && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-control-border bg-bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_#120a201a]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 md:px-9">
          <div className="min-w-0 text-sm">
            <p role={feedback?.error ? "alert" : "status"} className={feedback?.error ? "text-error-fg" : "text-[var(--color-fg-dim)]"}>
              {feedback?.text ?? (dirty ? "Cambios sin guardar" : version ? "Progreso guardado" : "Guarda tu progreso para retomarlo después")}
            </p>
            {version === 0 && !dirty && <button type="button" onClick={importLocalProgress} disabled={pending} className="mt-1 text-xs text-subjects underline">Importar datos de este navegador</button>}
          </div>
          <button type="button" onClick={save} disabled={pending || !dirty}
            className="min-h-11 rounded-lg bg-subjects-fill px-5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-subjects disabled:opacity-45">
            {pending ? "Guardando…" : "Guardar progreso"}
          </button>
        </div>
      </div>}
    </section>
  );
}
