"use client";

import { useState } from "react";
import { normalizeSearch } from "./catalog-search";
import { FormationComparison } from "./formation-indicators";
import { HistoricalIndicators, IndicatorCard as Indicator, StackedDistribution } from "./historical-indicators";
import type { ObservatoryHistory } from "@/lib/subjects/observatory-history";
import type { SubjectPreferenceField } from "@/lib/subjects/progress";
import { GuideExtract, ObservatoryBars, ObservatoryEmpty } from "./observatory-charts";
import {
  creditsFormat, isOutsidePeriod, selectionCredits, semesterName, subjectTypes,
  type DecisionDraft, type DecisionSubject, type OfficialEvidence, type OfficialSubjectGrades,
} from "@/lib/subjects/decision";

const sections = [
  ["resultados", "Resultados"], ["experiencias", "Experiencias"], ["esfuerzo", "Esfuerzo"],
  ["organizacion", "Organización"], ["formacion", "Formación"], ["relaciones", "Relaciones"],
] as const;
type Section = typeof sections[number][0];
type Priority = { key: SubjectPreferenceField; label: string; value: number };

type Props = {
  subjects: DecisionSubject[];
  totalCredits: number;
  completed: Set<string>;
  evidence: OfficialEvidence[];
  history: ObservatoryHistory;
  compared: string[];
  setCompared: (ids: string[]) => void;
  initialSubjectId?: string;
  draft: DecisionDraft;
  favorites: Map<string, string>;
  priorities: Priority[];
  pending: boolean;
  onFavorite: (id: string) => void;
  onDraft: (id: string) => void;
  onScenario: () => void;
};

const panel = "min-w-0 rounded-2xl border border-border bg-bg-card p-4 sm:p-5";
const field = "mt-1 block min-h-10 w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-subjects";
const muted = "text-sm text-[var(--color-fg-dim)]";
const secondary = "rounded-lg border border-control-border px-3 py-2 text-sm font-semibold hover:bg-bg-card-hover disabled:opacity-50";
const primary = "rounded-lg bg-subjects-fill px-4 py-2.5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover disabled:opacity-50";
const link = "font-semibold text-subjects underline underline-offset-2";

function ects(value: number) {
  return `${creditsFormat.format(value)} ECTS`;
}

function availabilityNote(subject: DecisionSubject) {
  return subject.knownUnavailable ? "No ofertada según el catálogo" : "Oferta por confirmar";
}

const semesterOrder = (period: string | null) => period === "1" ? 0 : period === "2" ? 1 : period === "annual" ? 2 : 3;
const effortPriorities = new Set<SubjectPreferenceField>([
  "practice_preference", "project_preference", "teamwork_preference", "workload_tolerance", "difficulty_tolerance",
  "learning_compatibility", "effort_compatibility",
]);

function suggestedYear(subjects: DecisionSubject[], completed: Set<string>) {
  const passedYears = subjects.flatMap((subject) => completed.has(subject.id) && subject.year !== null ? [subject.year] : []);
  if (!passedYears.length) return "all";
  const latest = Math.max(...passedYears);
  const pending = subjects.filter((subject) => !completed.has(subject.id) && !subject.knownUnavailable && subject.year !== null);
  const coreStillPending = pending.some((subject) => subject.year === latest && subject.type !== "optional");
  if (coreStillPending) return String(latest);
  const futureYears = pending.flatMap(({ year }) => year !== null && year > latest ? [year] : []);
  if (futureYears.length) return String(Math.min(...futureYears));
  return pending.some((subject) => subject.year === latest) ? String(latest) : "all";
}

export function StudentObservatory({
  subjects, totalCredits, completed, evidence, history, compared, setCompared, initialSubjectId, draft,
  favorites, priorities, pending, onFavorite, onDraft, onScenario,
}: Props) {
  const [section, setSection] = useState<Section>(() => {
    const priority = priorities[0]?.key;
    return priority ? effortPriorities.has(priority) ? "esfuerzo" : "formacion" : "organizacion";
  });
  const initialYear = suggestedYear(subjects, completed);
  const [state, setState] = useState("pending");
  const [year, setYear] = useState(initialYear);
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState("all");
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState(initialSubjectId);
  const [resultCourse, setResultCourse] = useState("all");
  const [showSample, setShowSample] = useState(false);
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const evidenceById = new Map(evidence.map((item) => [item.subjectId, item]));
  const comparedIds = new Set(compared);
  const selected = compared.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const earned = selectionCredits(subjects.filter((item) => completed.has(item.id)));
  const creditsRemaining = Math.max(0, Math.round((totalCredits - earned) * 100) / 100);
  const pendingCount = subjects.filter((item) => !completed.has(item.id)).length;
  const draftItems = subjects.filter((item) => draft.subjectIds.includes(item.id));
  const years = [...new Set(subjects.map((item) => item.year))].sort((a, b) => (a ?? Infinity) - (b ?? Infinity));
  const types = [...new Set(subjects.map((item) => item.type))];
  const periods = [...new Set(subjects.map((item) => item.semester))].sort((a, b) => semesterOrder(a) - semesterOrder(b));
  const earlierPending = year === "all" || year === "none" ? [] : subjects.filter((subject) =>
    subject.year !== null && subject.year < Number(year) && (subject.type === "mandatory" || subject.type === "basic") && !completed.has(subject.id));
  const mentions = [...new Set(history.mentions.map((item) => item.name))].sort((a, b) => a.localeCompare(b, "es"));
  const mentionSubjectIds = selectedMentions.length ? new Set(history.mentions
    .filter((item) => selectedMentions.includes(item.name)).map((item) => item.subjectId)) : null;
  const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const filtered = subjects.filter((item) => {
    if ((state === "pending" && completed.has(item.id)) || (state === "completed" && !completed.has(item.id))) return false;
    if (year !== "all" && String(item.year ?? "none") !== year) return false;
    if (period !== "all" && (item.semester ?? "none") !== period) return false;
    if (type !== "all" && (item.type ?? "none") !== type) return false;
    if (mentionSubjectIds && !mentionSubjectIds.has(item.id)) return false;
    const index = normalizeSearch(`${item.name} ${item.code ?? ""}`);
    return terms.every((term) => index.includes(term));
  });

  const focus = (focusId ? byId.get(focusId) : undefined) ?? selected[0] ?? filtered[0];
  const focusEvidence = focus ? evidenceById.get(focus.id) : undefined;
  const visible = selected.length ? selected : filtered;
  const officialCourses = [...new Set(evidence.flatMap((item) => item.grades.map((row) => row.course)))].sort().reverse();
  const sampleAvailable = history.stats.length > 0;
  const historyCourses = [...new Set([
    ...officialCourses, ...(showSample ? history.stats.map((row) => row.course) : []),
  ])].sort().reverse();
  const latestForVisible = [...new Set(visible.flatMap((item) => evidenceById.get(item.id)?.grades.map((row) => row.course) ?? []))].sort().at(-1);
  const activeCourse = resultCourse === "all" ? latestForVisible : resultCourse;
  const resultFor = (id: string) => evidenceById.get(id)?.grades.find((row) => row.course === activeCourse);
  const withResults = activeCourse ? visible.filter((item) => resultFor(item.id)) : [];
  const distributions = selected.length ? selected : withResults.slice(0, 4);
  const sharedHistoryFilter = section === "resultados" || sampleAvailable && (section === "experiencias" || section === "esfuerzo" || section === "relaciones");

  function resetFilters() {
    setState("pending");
    setYear(initialYear);
    setPeriod("all");
    setType("all");
    setSelectedMentions([]);
    setSearch("");
    setFocusId(undefined);
  }

  function toggleCompared(id: string) {
    if (comparedIds.has(id)) {
      setCompared(compared.filter((item) => item !== id));
      return;
    }
    setCompared([...compared, id]);
    setFocusId(id);
  }

  return <div className="space-y-5">
    <dl className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
      {[
        ["Sin marcar como superadas", String(pendingCount), "Asignaturas del catálogo"],
        ["ECTS superados", creditsFormat.format(earned), "Según tu expediente"],
        ["ECTS por completar", totalCredits > 0 ? creditsFormat.format(creditsRemaining) : "Sin total", "Respecto al total del plan"],
        ["ECTS seleccionados", creditsFormat.format(selectionCredits(selected)), `${selected.length} en comparación`],
      ].map(([label, value, detail]) => <div key={label} className="space-y-1 bg-bg-card p-3 sm:p-5">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="font-display text-2xl text-subjects sm:text-4xl">{value}</dd>
        <dd className="text-xs text-[var(--color-fg-dim)]">{detail}</dd>
      </div>)}
    </dl>

    <section className={panel} aria-labelledby="pending-subjects">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="pending-subjects" className="font-heading text-2xl font-semibold">Prepara tus próximas asignaturas</h2>
          <p className={`${muted} mt-1`}>Filtra el catálogo y marca las asignaturas que quieras comparar.</p>
        </div>
        <button type="button" onClick={resetFilters} className={secondary}>Restablecer filtros</button>
      </div>
      {earlierPending.length > 0 && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg">
        <p>{earlierPending.length === 1 ? "Tienes una asignatura obligatoria o básica pendiente de cursos anteriores." : `Tienes ${earlierPending.length} asignaturas obligatorias o básicas pendientes de cursos anteriores.`}</p>
        <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { setYear("all"); setState("pending"); setPeriod("all"); setType("all"); setSelectedMentions([]); setSearch(""); }}>Ver todos los cursos</button>
      </div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <label className="text-sm font-medium sm:col-span-2 xl:col-span-1">Buscar asignatura
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={field} placeholder="Nombre o código" />
        </label>
        <Filter label="Estado" value={state} onChange={setState} options={[
          ["pending", "Sin marcar como superadas"], ["completed", "Superadas"], ["all", "Todas"],
        ]} />
        <Filter label="Curso del plan" value={year} onChange={setYear}
          options={[["all", "Todos los cursos"], ...years.map((item): [string, string] => [String(item ?? "none"), item === null ? "Sin indicar" : `${item}.º curso`])]} />
        <Filter label="Periodo" value={period} onChange={setPeriod}
          options={[["all", "Todos los periodos"], ...periods.map((item): [string, string] => [item ?? "none", semesterName(item)])]} />
        <Filter label="Tipo" value={type} onChange={setType}
          options={[["all", "Todos los tipos"], ...types.map((item): [string, string] => [item ?? "none", subjectTypes[item ?? ""] ?? item ?? "Sin indicar"])]} />
      </div>
      {mentions.length > 0 && <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Ramas del plan</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!selectedMentions.length} onClick={() => setSelectedMentions([])}
            className={`${secondary} aria-pressed:border-subjects aria-pressed:bg-subjects-highlight aria-pressed:text-subjects`}>Todas las ramas</button>
          {mentions.map((name) => <button key={name} type="button" aria-pressed={selectedMentions.includes(name)}
            onClick={() => setSelectedMentions((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])}
            className={`${secondary} aria-pressed:border-subjects aria-pressed:bg-subjects-highlight aria-pressed:text-subjects`}>{name}</button>)}
        </div>
      </fieldset>}

      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className={`flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-border pb-2 ${muted}`}>
            <span role="status">{filtered.length} {filtered.length === 1 ? "asignatura" : "asignaturas"}</span>
            <div className="flex flex-wrap items-center gap-3">
              {filtered.some((item) => !comparedIds.has(item.id)) && <button type="button" className={link}
                onClick={() => setCompared([...new Set([...compared, ...filtered.map((item) => item.id)])])}>Comparar todas las visibles</button>}
              {selected.length > 0 && <a href="#indicators" className={link}>{selected.length} en comparación ↓</a>}
            </div>
          </div>
          {filtered.length ? <div className="max-h-[33rem] space-y-3 overflow-auto py-2">
            {periods.map((semester) => {
              const group = filtered.filter((item) => item.semester === semester);
              if (!group.length) return null;
              return <section key={semester ?? "none"} className="rounded-lg border border-border">
                <h3 className="sticky top-0 z-10 border-b border-border bg-bg-darker px-3 py-2 text-sm font-semibold">
                  {semesterName(semester)} <span className="ml-2 font-normal text-[var(--color-fg-dim)]">{group.length}</span>
                </h3>
                <ul className="divide-y divide-border">
                  {[...group].sort((a, b) => Number(a.type === "optional") - Number(b.type === "optional")).map((item) =>
                    <li key={item.id} className={`flex items-center gap-2 px-3 py-2 ${focus?.id === item.id ? "bg-subjects-surface" : "hover:bg-bg-card-hover"}`}>
                      <label className="grid size-10 shrink-0 cursor-pointer place-items-center">
                        <input type="checkbox" aria-label={`Comparar ${item.name}`} checked={comparedIds.has(item.id)}
                          className="size-4 accent-subjects-fill" onChange={() => toggleCompared(item.id)} />
                      </label>
                      <button type="button" onClick={() => setFocusId(item.id)} aria-pressed={focus?.id === item.id}
                        className="min-w-0 flex-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-subjects">
                        <span className="block text-sm font-semibold">{item.name}</span>
                        <span className="block text-xs text-[var(--color-fg-dim)]">
                          {[item.year !== null ? `${item.year}.º curso` : null, subjectTypes[item.type ?? ""], item.code,
                            item.knownUnavailable ? availabilityNote(item) : null].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                      <span className="shrink-0 text-xs tabular-nums">{ects(item.ects)}</span>
                    </li>)}
                </ul>
              </section>;
            })}
          </div> : <div className="mt-3"><ObservatoryEmpty message={subjects.length ? "No hay asignaturas con estos filtros." : "Este plan todavía no tiene asignaturas en el catálogo."} /></div>}
        </div>
        <div className="min-w-0 border border-border bg-bg-darker p-4">
          <h3 className="font-heading text-lg font-semibold">Ficha de asignatura</h3>
          {focus ? <div className="mt-3 space-y-3">
            <div>
              <p className="font-semibold text-subjects">{focus.name}</p>
              <p className={`${muted} mt-1`}>{[focus.code, ects(focus.ects), subjectTypes[focus.type ?? ""] ?? focus.type,
                focus.year !== null ? `${focus.year}.º curso` : null, semesterName(focus.semester)].filter(Boolean).join(" · ")}</p>
            </div>
            <p className={muted}>{completed.has(focus.id) ? "Superada según tu expediente" : "Sin marcar como superada"}
               · {availabilityNote(focus)}</p>
            {focusEvidence?.guide && <a className={`${link} block text-sm`} href={focusEvidence.guide.sourceUrl}>Guía docente {focusEvidence.guide.course}</a>}
            {focus.sourceUrl && <a className={`${link} block text-sm`} href={focus.sourceUrl}>Fuente del catálogo</a>}
            {draft.subjectIds.includes(focus.id) ? <p className={muted}>Ya figura en tu borrador.</p> :
              !completed.has(focus.id) && !focus.knownUnavailable && <p className={muted}>
                Al añadirla, el borrador quedaría en {ects(selectionCredits([...draftItems, focus]))}.
                {draftItems.length > 0 && isOutsidePeriod(focus, draft.period) && " Figura en otro semestre."}
              </p>}
            <div className="flex flex-wrap gap-2">
              {!completed.has(focus.id) && !focus.knownUnavailable && <button type="button" onClick={() => onDraft(focus.id)} className={primary}>
                {draft.subjectIds.includes(focus.id) ? "Ver en mi borrador" : "Añadir al semestre"}
              </button>}
              <button type="button" className={secondary} disabled={pending} onClick={() => onFavorite(focus.id)} aria-pressed={favorites.has(focus.id)}>
                {favorites.has(focus.id) ? "Quitar de favoritos" : "Guardar en favoritos"}
              </button>
            </div>
          </div> : <p className={`${muted} mt-2`}>Elige una asignatura de la lista.</p>}
        </div>
      </div>
    </section>

    <section className={panel} aria-labelledby="indicators">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="indicators" className="scroll-mt-28 font-heading text-xl font-semibold">Indicadores para decidir</h2>
        <button type="button" disabled={selected.length < 2 || pending} className={secondary} onClick={onScenario}>Crear escenario con la selección</button>
      </div>
      {selected.length > 0 ? <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className={muted}>{selected.length} en comparación</p>
          <button type="button" className={link} onClick={() => setCompared([])}>Limpiar selección</button>
        </div>
        <ul className="flex max-h-48 flex-wrap items-center gap-2 overflow-auto py-1 text-sm" aria-label="Asignaturas comparadas">
          {selected.map((item) => <li key={item.id} className="max-w-full">
            <button type="button" aria-label={`Quitar ${item.name} de la comparación`} onClick={() => toggleCompared(item.id)}
              className="max-w-full rounded-full border border-subjects-border bg-subjects-surface px-2.5 py-1 font-medium text-subjects">
              {item.name} · {semesterName(item.semester)} ×
            </button>
          </li>)}
        </ul>
      </div> : <p className={`${muted} mt-2`}>Ves los datos del listado filtrado. Marca asignaturas para acotar la comparación.</p>}
      {priorities.length > 0 && <p className={`${muted} mt-3`}>Tus prioridades más altas · {priorities.map((item) =>
        `${item.label} ${item.value}/10`).join(" · ")}</p>}
      <nav aria-label="Categorías de indicadores" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {sections.map(([id, label]) => <button key={id} type="button" aria-pressed={section === id}
          onClick={() => setSection(id)} className="border border-control-border px-3 py-2 text-left text-sm font-semibold hover:bg-bg-card-hover aria-pressed:border-subjects aria-pressed:bg-subjects-highlight aria-pressed:text-subjects">
          {label}
        </button>)}
      </nav>
      {sharedHistoryFilter && <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-border pt-4">
        {historyCourses.length > 0 && <Filter label="Curso académico de los datos" value={historyCourses.includes(resultCourse) ? resultCourse : "all"}
          onChange={setResultCourse} options={[["all", "Vista general"], ...historyCourses.map((course): [string, string] => [course, course])]} />}
        {sampleAvailable && <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="size-4 accent-subjects-fill" checked={showSample} onChange={(event) => {
            setShowSample(event.target.checked);
            if (!event.target.checked && !officialCourses.includes(resultCourse)) setResultCourse("all");
          }} />
          Ver datos simulados
        </label>}
      </div>}
    </section>

    {section === "organizacion" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Indicator title="Créditos por asignatura" source="Catálogo oficial">
        <ObservatoryBars label="Créditos por asignatura" unit=" ECTS" maxRows={selected.length ? -1 : undefined} highlight={compared}
          values={visible.map((item) => ({ id: item.id, name: item.name, value: item.ects }))} />
      </Indicator>
      <Indicator title="Distribución por periodo" source={selected.length ? "Selección" : "Listado filtrado"}>
        <ObservatoryBars label="Asignaturas por periodo" values={periods.map((value) => ({
          id: value ?? "none", name: semesterName(value), value: visible.length ? visible.filter((item) => item.semester === value).length : null,
        }))} />
      </Indicator>
      <Indicator title="Tu borrador" source="Catálogo y expediente">
        <p className="text-2xl font-semibold">{ects(selectionCredits(draftItems))} <span className={muted}>de {ects(draft.target || 0)} de objetivo</span></p>
        {draft.target > 0 && <progress className="my-3 h-2 w-full accent-subjects-fill" aria-label="Créditos del borrador"
          max={draft.target} value={Math.min(draft.target, selectionCredits(draftItems))} />}
        <p className={muted}>Consulta la ficha para añadir una asignatura al semestre.</p>
      </Indicator>
      <Indicator title="Oferta de las asignaturas" source="Catálogo oficial">
        <p className="text-sm">{visible.filter((item) => item.knownUnavailable).length} marcadas como no ofertadas · {visible.filter((item) => !item.knownUnavailable).length} con oferta por confirmar</p>
        <p className={`${muted} mt-2`}>El catálogo indica el semestre. Para comprobar grupos, solapes y fechas de examen hace falta el horario publicado.</p>
      </Indicator>
      {selected.length > 0 && <div className="min-w-0 lg:col-span-2">
        <Indicator title="Comparación del plan" source="Catálogo y expediente">
          <div className="max-h-[32rem] max-w-full overflow-auto" tabIndex={0} role="region" aria-label="Tabla de comparación del plan">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="border-b border-border">
                {["Asignatura", "ECTS", "Curso", "Periodo", "Tipo", "Estado"].map((label) => <th className="p-2" scope="col" key={label}>{label}</th>)}
              </tr></thead>
              <tbody>{selected.map((item) => <tr key={item.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-2 font-medium">{item.name}</th>
                <td className="p-2">{creditsFormat.format(item.ects)}</td><td className="p-2">{item.year ?? "Sin indicar"}</td>
                <td className="p-2">{semesterName(item.semester)}</td><td className="p-2">{subjectTypes[item.type ?? ""] ?? item.type ?? "Sin indicar"}</td>
                <td className="p-2">{completed.has(item.id) ? "Superada" : item.knownUnavailable ? "No ofertada" : "Sin marcar"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </Indicator>
      </div>}
    </div>}

    {(section === "formacion" || section === "esfuerzo") && <GuideIndicators
      items={selected.length ? selected : focus ? [focus] : []} evidence={evidenceById} section={section} priorities={priorities} />}

    {section === "formacion" && <FormationComparison items={selected.length ? selected : focus ? [focus] : []} evidence={evidenceById} />}
    {section === "relaciones" && <>
      <MentionComparison selected={selected} history={history} />
      <FormationComparison items={selected} evidence={evidenceById} overlap />
    </>}

    {section === "resultados" && <div className="space-y-4">
      <p className={`${muted} px-1`}>{withResults.length
        ? `Resultados oficiales · ${activeCourse}. Las tasas se calculan sobre el total publicado, incluidos los no presentados.`
        : "No hay resultados históricos oficiales para estas asignaturas en el periodo elegido."}</p>
      {withResults.length > 0 && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([
          ["Tasa de aprobados", (row: OfficialSubjectGrades) => row.passed],
          ["Tasa de no presentados", (row: OfficialSubjectGrades) => row.notPresented],
        ] as const).map(([label, count]) => <Indicator key={label} title={label} source={`Oficial · ${activeCourse}`}>
          <ObservatoryBars label={label} unit=" %" maximum={100} maxRows={selected.length ? -1 : undefined} highlight={compared} showCounts values={visible.map((item) => {
            const row = resultFor(item.id);
            return { id: item.id, name: item.name, value: row ? count(row) * 100 / row.total : null, n: row?.total };
          })} />
        </Indicator>)}
        <div className="min-w-0 lg:col-span-2"><Indicator title="Distribución de calificaciones" source="Oficial">
          {selected.length === 0 && withResults.length > distributions.length && <p className={`${muted} mb-3`}>
            Se muestran {distributions.length} de {withResults.length}. Marca las asignaturas que quieras comparar.
          </p>}
          <div className="grid max-h-[40rem] grid-cols-1 gap-3 overflow-auto md:grid-cols-2">
            {distributions.map((item) => {
              const row = resultFor(item.id);
              return <div key={item.id} className="min-w-0 space-y-2 border border-border p-3">
                <h4 className="font-semibold">{item.name}</h4>
                {row ? <GradeDistribution row={row} /> : <p className={muted}>Sin resultados oficiales para {activeCourse}.</p>}
              </div>;
            })}
          </div>
        </Indicator></div>
      </div>}
    </div>}
    {(section === "resultados" || section === "experiencias" || section === "esfuerzo" || section === "relaciones") &&
      (showSample && sampleAvailable ? <HistoricalIndicators section={section} items={visible} history={history}
        course={resultCourse} comparing={selected.length > 0} /> : section === "experiencias" && <ObservatoryEmpty
        message={sampleAvailable ? "Activa «Ver datos simulados» para explorar la satisfacción y los motivos de elección de la muestra."
          : "Este plan no tiene datos de experiencias disponibles."} />)}
  </div>;
}

function Filter({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (value: string) => void;
}) {
  return <label className="block min-w-0 text-sm font-medium">{label}
    <select className={field} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
  </label>;
}

function GuideIndicators({ items, evidence, section, priorities }: {
  items: DecisionSubject[]; evidence: Map<string, OfficialEvidence>; section: "formacion" | "esfuerzo"; priorities: Priority[];
}) {
  if (!items.length) return <ObservatoryEmpty message="Selecciona una asignatura para consultar su guía docente." />;
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {items.map((item) => {
      const guide = evidence.get(item.id)?.guide;
      const entries = section === "formacion"
        ? [["Temario", guide?.program], ["Resultados de aprendizaje", guide?.outcomes], ["Orientaciones de la guía", guide?.basic]]
        : [["Sistema de evaluación", guide?.assessment], ["Actividades de aprendizaje", guide?.activities]];
      const signals = section === "esfuerzo" && guide ? [
        { key: "practice_preference", label: "Prácticas", expression: /práctic/i },
        { key: "project_preference", label: "Proyectos", expression: /proyecto/i },
        { key: "teamwork_preference", label: "Trabajo en grupo", expression: /en (grupo|equipo)/i },
        { key: "", label: "Evaluación continua", expression: /evaluación continua/i },
      ].filter(({ expression }) => expression.test(`${guide.assessment} ${guide.activities}`))
        .sort((a, b) => (priorities.find((item) => item.key === b.key)?.value ?? 0) - (priorities.find((item) => item.key === a.key)?.value ?? 0))
        : [];
      return <Indicator key={item.id} title={item.name} source={guide ? `Guía oficial · ${guide.course}` : "Guía docente"}>
        {guide && entries.some(([, value]) => Boolean(value?.trim())) ? <div className="space-y-3">
          {guide.multicenter && <p className={muted}>Guía compartida por varios centros. Consulta qué apartados aplican a tu centro.</p>}
          {signals.length > 0 && <p className={muted}>La guía menciona {signals.map(({ label }) => label.toLocaleLowerCase("es")).join(" · ")}.</p>}
          {entries.map(([label, value]) => value?.trim() && <details key={label} open={label === "Temario" || label === "Sistema de evaluación"}
            className="border border-border p-2.5">
            <summary className="cursor-pointer font-semibold">{label}</summary>
            <div className="mt-2"><GuideExtract text={value} /></div>
          </details>)}
          <a href={guide.sourceUrl} className={`${link} inline-block text-sm`}>Consultar guía docente completa</a>
        </div> : <p className={muted}>El catálogo no dispone de este extracto.
          {guide && <> <a className={link} href={guide.sourceUrl}>Consultar guía oficial</a></>}
        </p>}
      </Indicator>;
    })}
  </div>;
}

function GradeDistribution({ row }: { row: OfficialSubjectGrades }) {
  const values = [
    ["No presentados", row.notPresented, "bg-chart-slate"], ["Suspensos", row.failed, "bg-chart-rose"],
    ["Aprobados", row.pass, "bg-chart-green"], ["Notables", row.merit, "bg-chart-aqua"],
    ["Sobresalientes", row.distinction, "bg-chart-violet"], ["Matrículas de honor", row.honours, "bg-chart-amber"],
  ] as const;
  return <>
    <p className={muted}>{row.passed} aprobados de {row.total} (incluye no presentados) · <a href={row.sourceUrl} className={link}>Fuente oficial</a></p>
    <StackedDistribution total={row.total} entries={values.map(([label, count, color]) => ({ label, count, color }))} />
  </>;
}


function MentionComparison({ selected, history }: { selected: DecisionSubject[]; history: ObservatoryHistory }) {
  const ids = new Set(selected.map((item) => item.id));
  const bySubject = new Map<string, ObservatoryHistory["mentions"]>();
  const counts = new Map<string, number>();
  for (const item of history.mentions) {
    if (!ids.has(item.subjectId)) continue;
    const memberships = bySubject.get(item.subjectId) ?? [];
    memberships.push(item);
    bySubject.set(item.subjectId, memberships);
    counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
  }
  return <Indicator title="Menciones del plan" source="Catálogo oficial">
    {selected.length < 2 ? <p className={muted}>Selecciona al menos dos asignaturas para ver qué menciones comparten.</p> :
      <div className="space-y-4">
        {selected.map((subject) => {
          const memberships = bySubject.get(subject.id) ?? [];
          return <div key={subject.id} className="space-y-2">
            <p className="text-sm font-semibold">{subject.name}</p>
            {memberships.length ? <ul className="flex flex-wrap gap-2">
              {memberships.map((item) => {
                const shared = (counts.get(item.name) ?? 0) > 1;
                return <li key={item.name}><a href={item.sourceUrl} className={`inline-block rounded-full border px-2.5 py-1 text-xs underline underline-offset-2 ${shared ? "border-subjects bg-subjects-surface font-semibold text-subjects" : "border-border"}`}>
                  {item.name} · {item.course}{shared ? " · compartida" : ""}
                </a></li>;
              })}
            </ul> : <p className={muted}>Sin relación con una mención documentada en los datos cargados.</p>}
          </div>;
        })}
      </div>}
  </Indicator>;
}
