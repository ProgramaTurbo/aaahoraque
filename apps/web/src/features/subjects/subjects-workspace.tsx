"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
};

type Tab = "catalogo" | "expediente" | "preferencias" | "comparar";
type Field =
  | "theory_preference"
  | "practice_preference"
  | "project_preference"
  | "teamwork_preference"
  | "difficulty_tolerance"
  | "workload_tolerance"
  | "academic_affinity"
  | "professional_alignment"
  | "learning_compatibility"
  | "effort_compatibility";
type Preferences = Record<Field, number | null>;

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
const emptyPreferences = (): Preferences => ({
  theory_preference: null,
  practice_preference: null,
  project_preference: null,
  teamwork_preference: null,
  difficulty_tolerance: null,
  workload_tolerance: null,
  academic_affinity: null,
  professional_alignment: null,
  learning_compatibility: null,
  effort_compatibility: null,
});
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
function readPreferences(key: string): Preferences {
  const result = emptyPreferences();
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const item = raw as Record<string, unknown>;
      for (const { key: field } of fields) {
        const value = item[field];
        if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10) {
          result[field] = value;
        }
      }
    }
  } catch { /* Sin preferencias previas */ }
  return result;
}
function persist(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch { /* Puede estar deshabilitado por el navegador */ }
}

export function SubjectsWorkspace({ planId, planName, degreeName, centerName, totalEcts, status, subjects }: Props) {
  const [tab, setTab] = useState<Tab>("catalogo");
  const [loaded, setLoaded] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);
  const [term, setTerm] = useState("");
  const [year, setYear] = useState("todos");
  const [type, setType] = useState("todos");
  const synthetic = status === "synthetic" || status === "demo";
  const allowedIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);
  const academicKey = `aaahoraque:academic-state:${planId}`;
  const preferenceKey = `aaahoraque:decision-preferences:${planId}`;
  const shortlistKey = `aaahoraque:subjects-shortlist:${planId}`;

  useEffect(() => {
    setLoaded(false);
    setTab("catalogo");
    setCompleted(readIds(academicKey, allowedIds));
    setShortlist(readIds(shortlistKey, allowedIds, 3));
    setPreferences(readPreferences(preferenceKey));
    setLoaded(true);
  }, [academicKey, shortlistKey, preferenceKey, allowedIds]);

  const completedIds = useMemo(() => new Set(completed), [completed]);
  const selectedIds = useMemo(() => new Set(shortlist), [shortlist]);
  const earnedCredits = subjects.reduce((sum, s) => sum + (completedIds.has(s.id) ? s.ects : 0), 0);
  const selectedSubjects = shortlist.flatMap((id) => {
    const item = subjects.find((s) => s.id === id);
    return item ? [item] : [];
  });
  const filtered = subjects.filter((s) => {
    const search = `${s.name} ${s.code ?? ""}`.toLocaleLowerCase("es");
    return search.includes(term.trim().toLocaleLowerCase("es")) &&
      (year === "todos" || String(s.year) === year) &&
      (type === "todos" || s.type === type);
  });
  const years = [...new Set(subjects.map((s) => s.year))].sort((a, b) => (a ?? 99) - (b ?? 99));
  const types = [...new Set(subjects.map((s) => s.type).filter((x): x is string => x !== null))].sort();
  const totalPriority = priorities.reduce((sum, p) => sum + (preferences[p.key] ?? 0), 0);
  const filled = fields.filter((f) => preferences[f.key] !== null).length;
  const readyToScore = false; // Se habilitará solo tras verificar perfiles, requisitos y procedencia.

  function toggleCompleted(id: string) {
    const next = completedIds.has(id) ? completed.filter((x) => x !== id) : [...completed, id];
    setCompleted(next);
    persist(academicKey, next);
  }
  function toggleShortlist(id: string) {
    const next = selectedIds.has(id) ? shortlist.filter((x) => x !== id) : [...shortlist, id].slice(0, 3);
    setShortlist(next);
    persist(shortlistKey, next);
  }
  function updatePreference(field: Field, value: number | null) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    persist(preferenceKey, next);
  }
  const tabItems: { id: Tab; number: string; title: string; detail: string }[] = [
    { id: "catalogo", number: "01", title: "Explorar", detail: `${subjects.length} asignaturas` },
    { id: "expediente", number: "02", title: "Mi expediente", detail: `${completed.length} superadas` },
    { id: "preferencias", number: "03", title: "Mis prioridades", detail: `${filled}/${fields.length} respuestas` },
    { id: "comparar", number: "04", title: "Comparar", detail: `${shortlist.length}/3 seleccionadas` },
  ];

  function scoreField(field: { key: Field; label: string; help: string }) {
    return (
      <label key={field.key} className="flex flex-col gap-4 border-b border-[var(--color-border)] py-5 md:flex-row md:items-center md:justify-between">
        <span className="max-w-xl">
          <span className="block font-heading text-base text-[var(--color-fg)]">{field.label}</span>
          <span className="mt-1 block text-sm text-[var(--color-fg-dim)]">{field.help}</span>
        </span>
        <select
          className="min-w-36 border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] px-4 py-3 text-[var(--color-fg)] focus:border-[var(--color-subjects)] focus:outline-none"
          aria-label={field.label}
          value={preferences[field.key] ?? ""}
          onChange={(event) => updatePreference(field.key, event.target.value === "" ? null : Number(event.target.value))}
        >
          <option value="">Sin responder</option>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i} / 10</option>)}
        </select>
      </label>
    );
  }

  return (
    <section className="space-y-8" aria-label="Herramienta de decisión de asignaturas">
      <header className="relative overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-bg-card)] px-6 py-9 md:px-10">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[var(--color-subjects)] opacity-[0.08] blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="section-marker section-marker-subjects">TU PLAN ACADÉMICO</span>
          <h2 className="font-display mt-5 max-w-4xl text-3xl leading-tight md:text-5xl">{degreeName}</h2>
          <p className="mt-3 text-[var(--color-fg-dim)]">{planName}{centerName ? ` · ${centerName}` : ""}</p>
          {synthetic ? (
            <div role="status" className="mt-6 border-l-2 border-amber-400 bg-amber-400/5 p-4 text-sm leading-relaxed text-amber-200">
              <strong>Plan generado para simulación.</strong> Los nombres y perfiles de las asignaturas no son oficiales. Puedes conocer el funcionamiento de la herramienta, pero estos datos no permiten orientar una matrícula real.
            </div>
          ) : (
            <div className="mt-6 border-l-2 border-[var(--color-subjects)] bg-[var(--color-subjects)]/5 p-4 text-sm text-[var(--color-fg-dim)]">
              Antes de decidir, consulta también la guía docente y los requisitos de matrícula vigentes de tu universidad.
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-4">
        {[
          { name: "Asignaturas del catálogo", value: String(subjects.length) },
          { name: synthetic ? "ECTS del plan simulado" : "ECTS del plan según catálogo", value: `${format.format(totalEcts)} ECTS` },
          { name: "Créditos declarados superados", value: loaded ? `${format.format(earnedCredits)} ECTS` : "—" },
          { name: "Alternativas en comparación", value: loaded ? `${shortlist.length} / 3` : "—" },
        ].map((metric) => (
          <div key={metric.name} className="bg-[var(--color-bg-card)] px-5 py-6">
            <p className="font-display text-2xl text-[var(--color-subjects)] md:text-3xl">{metric.value}</p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-fg-dim)]">{metric.name}</p>
          </div>
        ))}
      </div>

      <nav aria-label="Fases de tu decisión" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {tabItems.map((item) => (
          <button
            key={item.id} type="button" aria-pressed={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`group border px-4 py-4 text-left transition-colors ${tab === item.id
              ? "border-[var(--color-subjects)] bg-[var(--color-bg-card)]"
              : "border-[var(--color-border)] bg-[var(--color-bg-darker)] hover:border-[var(--color-border-light)]"}`}
          >
            <span className="font-mono text-xs text-[var(--color-subjects)]">{item.number} /</span>
            <span className="mt-2 block font-heading text-sm md:text-base">{item.title}</span>
            <span className="mt-1 block text-xs text-[var(--color-fg-dim)]">{loaded ? item.detail : "Cargando selección..."}</span>
          </button>
        ))}
      </nav>

      {!loaded ? <p className="py-10 text-[var(--color-fg-dim)]">Recuperando tu información de este navegador…</p> : (
        <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 md:p-9">
          {tab === "catalogo" && (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <span className="section-marker section-marker-subjects">01 / EXPLORAR</span>
                  <h3 className="font-display mt-4 text-3xl md:text-4xl">CONOCE LAS ALTERNATIVAS.</h3>
                  <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Busca y filtra asignaturas. Puedes seleccionar hasta tres para compararlas.</p>
                </div>
                <button type="button" onClick={() => setTab("comparar")} className="border border-[var(--color-subjects)] px-5 py-3 text-sm font-semibold text-[var(--color-subjects)] hover:bg-[var(--color-subjects)]/10">
                  Ver comparación ({shortlist.length}) →
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px]">
                <label className="sr-only" htmlFor="subjects-search">Buscar asignaturas</label>
                <input id="subjects-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Buscar por nombre o código" className="w-full border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] px-4 py-3 text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-subjects)] focus:outline-none" />
                <label className="sr-only" htmlFor="subjects-year">Curso</label>
                <select id="subjects-year" value={year} onChange={(e) => setYear(e.target.value)} className="border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] px-4 py-3 text-[var(--color-fg)]">
                  <option value="todos">Todos los cursos</option>
                  {years.map((y) => <option key={y ?? "null"} value={String(y)}>{y === null ? "Sin curso" : `${y}.º curso`}</option>)}
                </select>
                <label className="sr-only" htmlFor="subjects-type">Tipo</label>
                <select id="subjects-type" value={type} onChange={(e) => setType(e.target.value)} className="border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] px-4 py-3 text-[var(--color-fg)]">
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
                    <button type="button" onClick={() => toggleShortlist(s.id)} disabled={!selectedIds.has(s.id) && shortlist.length >= 3}
                      className={`min-h-11 border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${selectedIds.has(s.id) ? "border-[var(--color-subjects)] bg-[var(--color-subjects)]/15 text-[var(--color-subjects)]" : "border-[var(--color-border-light)] text-[var(--color-fg-dim)] hover:border-[var(--color-subjects)]"}`}>
                      {selectedIds.has(s.id) ? "✓ Seleccionada" : "Comparar +"}
                    </button>
                  </article>
                ))}
                {filtered.length === 0 && <p className="py-10 text-[var(--color-fg-dim)]">No hay asignaturas que coincidan con esos filtros.</p>}
              </div>
            </div>
          )}

          {tab === "expediente" && (
            <div className="space-y-7">
              <div>
                <span className="section-marker section-marker-subjects">02 / MI EXPEDIENTE</span>
                <h3 className="font-display mt-4 text-3xl md:text-4xl">TU PUNTO DE PARTIDA.</h3>
                <p className="mt-3 text-[var(--color-fg-dim)]">Marca únicamente las asignaturas que has aprobado. Son datos declarados por ti y no están certificados por tu universidad.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-[var(--color-border-light)] p-5"><p className="text-3xl font-display text-[var(--color-subjects)]">{completed.length}</p><p className="mt-2 text-sm text-[var(--color-fg-dim)]">Asignaturas superadas declaradas</p></div>
                <div className="border border-[var(--color-border-light)] p-5"><p className="text-3xl font-display text-[var(--color-subjects)]">{format.format(earnedCredits)}</p><p className="mt-2 text-sm text-[var(--color-fg-dim)]">ECTS declarados como superados</p></div>
              </div>
              {years.map((y) => (
                <div key={y ?? "null"} className="border border-[var(--color-border)]">
                  <h4 className="bg-[var(--color-bg-darker)] px-5 py-4 font-heading text-[var(--color-fg)]">{y === null ? "Sin curso asignado" : `${y}.º curso`}</h4>
                  <div className="divide-y divide-[var(--color-border)]">
                    {subjects.filter((s) => s.year === y).map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-white/[0.03]">
                        <input type="checkbox" checked={completedIds.has(s.id)} onChange={() => toggleCompleted(s.id)} className="h-4 w-4 accent-cyan-400" />
                        <span className="min-w-0 flex-1 text-sm">{s.name}</span>
                        <span className="shrink-0 font-mono text-xs text-[var(--color-fg-dim)]">{format.format(s.ects)} ECTS</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-[var(--color-muted)]">Esta información se guarda exclusivamente en este navegador y para este plan. No es un expediente académico oficial.</p>
            </div>
          )}

          {tab === "preferencias" && (
            <div className="space-y-9">
              <div>
                <span className="section-marker section-marker-subjects">03 / MIS PRIORIDADES</span>
                <h3 className="font-display mt-4 text-3xl md:text-4xl">DECIDE CON TUS CRITERIOS.</h3>
                <p className="mt-3 text-[var(--color-fg-dim)]">Tus respuestas pertenecen a tu perfil de decisión; no son características inventadas de las asignaturas.</p>
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
                {priorities.every((p) => preferences[p.key] !== null) && totalPriority === 0 && <p className="mt-5 text-sm text-amber-300">Asigna un valor positivo a algún criterio si deseas ponderarlos.</p>}
              </div>
              <p className="text-xs text-[var(--color-muted)]">Las preferencias se guardan en este navegador. No se envían todavía al motor ni se generan puntuaciones sin datos de origen verificable.</p>
            </div>
          )}

          {tab === "comparar" && (
            <div className="space-y-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <span className="section-marker section-marker-subjects">04 / COMPARACIÓN</span>
                  <h3 className="font-display mt-4 text-3xl md:text-4xl">COMPARA CON CRITERIO.</h3>
                  <p className="mt-3 text-sm text-[var(--color-fg-dim)]">Compara atributos documentados en el catálogo. La herramienta no elegirá por ti.</p>
                </div>
                <button type="button" onClick={() => setTab("catalogo")} className="border border-[var(--color-subjects)] px-5 py-3 text-sm text-[var(--color-subjects)] hover:bg-[var(--color-subjects)]/10">Elegir asignaturas →</button>
              </div>
              {selectedSubjects.length === 0 ? (
                <div className="border border-dashed border-[var(--color-border-light)] px-6 py-12 text-center text-[var(--color-fg-dim)]">Aún no has seleccionado alternativas. Vuelve a «Explorar» y añade hasta tres asignaturas.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {selectedSubjects.map((s) => (
                    <article key={s.id} className="flex flex-col border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] p-5">
                      <p className="font-mono text-xs text-[var(--color-subjects)]">ALTERNATIVA</p>
                      <h4 className="mt-3 min-h-16 font-display text-xl leading-snug">{s.name}</h4>
                      <dl className="mt-5 flex-1 divide-y divide-[var(--color-border)] text-sm">
                        {[
                          ["ECTS", format.format(s.ects)], ["Curso", s.year == null ? "No especificado" : String(s.year)],
                          ["Tipo", subjectType(s.type)], ["Periodo", semesterLabel(s.semester)],
                          ["Situación", completedIds.has(s.id) ? "Superada (declarado)" : "No indicada como superada"],
                        ].map(([label, value]) => <div key={label} className="flex justify-between gap-3 py-3"><dt className="text-[var(--color-fg-dim)]">{label}</dt><dd className="text-right">{value}</dd></div>)}
                      </dl>
                      <button type="button" onClick={() => toggleShortlist(s.id)} className="mt-4 border border-[var(--color-border-light)] px-4 py-2 text-xs text-[var(--color-fg-dim)] hover:border-[var(--color-subjects)]">Quitar de la comparación</button>
                    </article>
                  ))}
                </div>
              )}
              {!readyToScore && (
                <div className="border-l-2 border-amber-400 bg-amber-400/5 px-5 py-4 text-sm leading-relaxed text-amber-200">
                  <strong>Evaluación multicriterio no disponible todavía.</strong> El catálogo no dispone de perfiles académicos/profesionales y requisitos oficiales suficientemente verificados para calcular afinidades, esfuerzo o elegibilidad. No mostramos puntuaciones ficticias.
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setTab("preferencias")} className="border border-[var(--color-border-light)] px-5 py-3 text-sm hover:border-[var(--color-subjects)]">Revisar prioridades</button>
                <button type="button" onClick={() => setTab("expediente")} className="border border-[var(--color-border-light)] px-5 py-3 text-sm hover:border-[var(--color-subjects)]">Revisar expediente</button>
              </div>
            </div>
          )}
        </div>
      )}
      <footer className="flex flex-col justify-between gap-3 border-t border-[var(--color-border)] py-5 text-sm text-[var(--color-fg-dim)] md:flex-row md:items-center">
        <span>Tu decisión, con información trazable. {synthetic ? "Este plan es simulado." : "Verifica las condiciones oficiales de matrícula."}</span>
        <Link href="/explorar/titulaciones" className="font-semibold text-[var(--color-subjects)] hover:underline">Explorar titulaciones →</Link>
      </footer>
    </section>
  );
}
