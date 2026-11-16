"use client";

import { useState, type ReactNode } from "react";
import { normalizeSearch } from "./catalog-search";
import { GuideExtract, ObservatoryBars, ObservatoryEmpty } from "./observatory-charts";
import {
  creditsFormat, isOutsidePeriod, selectionCredits, semesterName, subjectTypes,
  type DecisionDraft, type DecisionSubject, type OfficialEvidence, type OfficialSubjectGrades,
} from "@/lib/subjects/decision";

export const comparisonLimit = 4;

const sections = [
  ["plan", "Plan y créditos"], ["contenidos", "Contenidos"], ["evaluacion", "Evaluación"], ["resultados", "Resultados"],
] as const;
type Section = typeof sections[number][0];
type Priority = { label: string; value: number };

type Props = {
  subjects: DecisionSubject[];
  totalCredits: number;
  completed: Set<string>;
  evidence: OfficialEvidence[];
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

const panel = "min-w-0 border border-border bg-bg-card p-4 sm:p-5";
const field = "mt-1 block min-h-10 w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-sm text-fg focus-visible:outline-2 focus-visible:outline-subjects";
const muted = "text-sm text-[var(--color-fg-dim)]";
const secondary = "rounded-lg border border-control-border px-3 py-2 text-sm font-semibold hover:bg-bg-card-hover disabled:opacity-50";
const primary = "rounded-lg bg-subjects-fill px-4 py-2.5 text-sm font-semibold text-subjects-on-fill hover:bg-subjects-fill-hover disabled:opacity-50";
const link = "font-semibold text-subjects underline underline-offset-2";

function ects(value: number) {
  return `${creditsFormat.format(value)} ECTS`;
}

function availabilityNote(subject: DecisionSubject) {
  return subject.knownUnavailable ? " · No ofertada según el catálogo" : "";
}

export function StudentObservatory({
  subjects, totalCredits, completed, evidence, compared, setCompared, initialSubjectId, draft,
  favorites, priorities, pending, onFavorite, onDraft, onScenario,
}: Props) {
  const [section, setSection] = useState<Section>("plan");
  const [state, setState] = useState("pending");
  const [year, setYear] = useState("all");
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [focusId, setFocusId] = useState(initialSubjectId);
  const [resultCourse, setResultCourse] = useState<string>();
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const evidenceById = new Map(evidence.map((item) => [item.subjectId, item]));
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
  const periods = [...new Set(subjects.map((item) => item.semester))];
  const terms = normalizeSearch(search).split(/\s+/).filter(Boolean);
  const filtered = subjects.filter((item) => {
    if ((state === "pending" && completed.has(item.id)) || (state === "completed" && !completed.has(item.id))) return false;
    if (year !== "all" && String(item.year ?? "none") !== year) return false;
    if (period !== "all" && (item.semester ?? "none") !== period) return false;
    if (type !== "all" && (item.type ?? "none") !== type) return false;
    const index = normalizeSearch(`${item.name} ${item.code ?? ""}`);
    return terms.every((term) => index.includes(term));
  });

  const focus = (focusId ? byId.get(focusId) : undefined) ?? selected[0] ?? filtered[0];
  const focusEvidence = focus ? evidenceById.get(focus.id) : undefined;
  const visible = selected.length ? selected : filtered;
  const courses = [...new Set(visible.flatMap((item) => evidenceById.get(item.id)?.grades.map((row) => row.course) ?? []))].sort().reverse();
  const activeCourse = resultCourse && courses.includes(resultCourse) ? resultCourse : courses[0];
  const resultFor = (id: string) => evidenceById.get(id)?.grades.find((row) => row.course === activeCourse);
  const withResults = section === "resultados" && activeCourse ? visible.filter((item) => resultFor(item.id)) : [];
  const distributions = selected.length ? selected : withResults.slice(0, 4);

  function resetFilters() {
    setState("pending");
    setYear("all");
    setPeriod("all");
    setType("all");
    setSearch("");
    setFocusId(undefined);
    setResultCourse(undefined);
  }

  function toggleCompared(id: string) {
    if (compared.includes(id)) {
      setCompared(compared.filter((item) => item !== id));
      return;
    }
    if (compared.length < comparisonLimit) {
      setCompared([...compared, id]);
      setFocusId(id);
    }
  }

  return <div className="space-y-5">
    <dl className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
      {[
        ["Sin marcar como superadas", String(pendingCount), "Asignaturas del catálogo"],
        ["ECTS superados", creditsFormat.format(earned), "Según tu expediente"],
        ["ECTS por completar", totalCredits > 0 ? creditsFormat.format(creditsRemaining) : "Sin total", "Respecto al total del plan"],
        ["ECTS seleccionados", creditsFormat.format(selectionCredits(selected)), `${selected.length} de ${comparisonLimit} en comparación`],
      ].map(([label, value, detail]) => <div key={label} className="space-y-1 bg-bg-card p-3 sm:p-5">
        <dt className="text-sm font-medium">{label}</dt>
        <dd className="font-display text-2xl text-subjects sm:text-4xl">{value}</dd>
        <dd className="text-xs text-[var(--color-fg-dim)]">{detail}</dd>
      </div>)}
    </dl>

    <section className={panel} aria-labelledby="pending-subjects">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="pending-subjects" className="font-heading text-xl font-semibold">Asignaturas de mi plan</h2>
          <p className={`${muted} mt-1`}>Marca hasta cuatro para verlas juntas en los indicadores.</p>
          {types.includes("optional") && <p className="mt-1 text-xs text-[var(--color-fg-dim)]">Las optativas sin marcar son alternativas del catálogo.</p>}
        </div>
        <button type="button" onClick={resetFilters} className={secondary}>Restablecer filtros</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <label className="text-sm font-medium sm:col-span-2 xl:col-span-1">Buscar asignatura
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={field} placeholder="Nombre o código" />
        </label>
        <Filter label="Estado" value={state} onChange={setState} options={[
          ["pending", "Sin marcar como superadas"], ["completed", "Superadas"], ["all", "Todas"],
        ]} />
        <Filter label="Curso" value={year} onChange={setYear}
          options={[["all", "Todos los cursos"], ...years.map((item): [string, string] => [String(item ?? "none"), item === null ? "Sin indicar" : `${item}.º curso`])]} />
        <Filter label="Periodo" value={period} onChange={setPeriod}
          options={[["all", "Todos los periodos"], ...periods.map((item): [string, string] => [item ?? "none", semesterName(item)])]} />
        <Filter label="Tipo" value={type} onChange={setType}
          options={[["all", "Todos los tipos"], ...types.map((item): [string, string] => [item ?? "none", subjectTypes[item ?? ""] ?? item ?? "Sin indicar"])]} />
      </div>

      <div className="mt-4 grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className={`flex flex-wrap justify-between gap-x-3 gap-y-1 border-b border-border pb-2 ${muted}`}>
            <span role="status">{filtered.length} {filtered.length === 1 ? "asignatura" : "asignaturas"}</span>
            {selected.length > 0
              ? <a href="#indicators" className={link}>{selected.length}/{comparisonLimit} en comparación ↓</a>
              : <span>0/{comparisonLimit} en comparación</span>}
          </div>
          {filtered.length ? <ul className="max-h-[25rem] divide-y divide-border overflow-auto">
            {filtered.map((item) => <li key={item.id}
              className={`flex items-center gap-3 py-2 pl-1 pr-2 ${focus?.id === item.id ? "bg-subjects-surface" : "hover:bg-bg-card-hover"}`}>
              <input type="checkbox" aria-label={`Comparar ${item.name}`}
                className="size-4 shrink-0 accent-subjects-fill disabled:opacity-40" checked={compared.includes(item.id)}
                disabled={!compared.includes(item.id) && compared.length >= comparisonLimit} onChange={() => toggleCompared(item.id)} />
              <button type="button" onClick={() => setFocusId(item.id)} aria-pressed={focus?.id === item.id}
                className="min-w-0 flex-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-subjects">
                <span className="block text-sm font-semibold">{item.name}</span>
                <span className="block text-xs text-[var(--color-fg-dim)]">
                  {[item.code, item.year !== null ? `${item.year}.º curso` : null, semesterName(item.semester)].filter(Boolean).join(" · ") + availabilityNote(item)}
                </span>
              </button>
              <span className="shrink-0 text-xs tabular-nums">{ects(item.ects)}</span>
            </li>)}
          </ul> : <div className="mt-3"><ObservatoryEmpty message={subjects.length ? "No hay asignaturas con estos filtros." : "Este plan todavía no tiene asignaturas en el catálogo."} /></div>}
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
              {availabilityNote(focus)}</p>
            {focusEvidence?.guide && <a className={`${link} block text-sm`} href={focusEvidence.guide.sourceUrl}>Guía docente {focusEvidence.guide.course}</a>}
            {focus.sourceUrl && <a className={`${link} block text-sm`} href={focus.sourceUrl}>Fuente del catálogo</a>}
            {draft.subjectIds.includes(focus.id) ? <p className={muted}>Ya figura en tu borrador.</p> :
              !completed.has(focus.id) && !focus.knownUnavailable && <p className={muted}>
                Al añadirla, el borrador quedaría en {ects(selectionCredits([...draftItems, focus]))}.
                {isOutsidePeriod(focus, draft.period) && " Figura en otro semestre."}
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
      {selected.length > 0 ? <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className={muted}>Comparando</span>
        {selected.map((item) => <button type="button" key={item.id}
          aria-label={`Quitar ${item.name} de la comparación`} onClick={() => toggleCompared(item.id)}
          className="max-w-full rounded-full border border-subjects-border bg-subjects-surface px-2.5 py-1 font-medium text-subjects">
          {item.name} ×
        </button>)}
        {selected.length > 1 && <button type="button" className={link} onClick={() => setCompared([])}>Limpiar selección</button>}
      </div> : <p className={`${muted} mt-2`}>Ves los datos del listado filtrado. Marca asignaturas para acotar la comparación.</p>}
      {priorities.length > 0 && <p className={`${muted} mt-3`}>Tus prioridades más altas · {priorities.map((item) =>
        `${item.label} ${item.value}/10`).join(" · ")}</p>}
      <nav aria-label="Categorías de indicadores" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sections.map(([id, label]) => <button key={id} type="button" aria-pressed={section === id}
          onClick={() => setSection(id)} className="border border-control-border px-3 py-2 text-left text-sm font-semibold hover:bg-bg-card-hover aria-pressed:border-subjects aria-pressed:bg-subjects-highlight aria-pressed:text-subjects">
          {label}
        </button>)}
      </nav>
    </section>

    {section === "plan" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Indicator title="Créditos por asignatura" source="Catálogo oficial">
        <ObservatoryBars label="Créditos por asignatura" unit=" ECTS" highlight={compared}
          values={visible.map((item) => ({ id: item.id, name: item.name, value: item.ects }))} />
      </Indicator>
      <Indicator title="Distribución por periodo" source={selected.length ? "Selección" : "Listado filtrado"}>
        <ObservatoryBars label="Asignaturas por periodo" values={periods.map((value) => ({
          id: value ?? "none", name: semesterName(value), value: visible.filter((item) => item.semester === value).length,
        }))} />
      </Indicator>
      {selected.length > 0 && <div className="min-w-0 lg:col-span-2">
        <Indicator title="Comparación del plan" source="Catálogo y expediente">
          <div className="max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de comparación del plan">
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

    {(section === "contenidos" || section === "evaluacion") && <GuideIndicators
      items={selected.length ? selected : focus ? [focus] : []} evidence={evidenceById} section={section} />}

    {section === "resultados" && <div className="space-y-4">
      <section className={panel}>
        <div className="max-w-xs">
          {activeCourse && <Filter label="Curso de los resultados oficiales" value={activeCourse} onChange={setResultCourse}
            options={courses.map((course) => [course, course])} />}
        </div>
        <p className={`${muted} ${activeCourse ? "mt-3" : ""}`}>{activeCourse
          ? "Los porcentajes se calculan sobre los registros del curso indicado e incluyen a quienes no se presentaron."
          : "No hay resultados históricos oficiales para estas asignaturas."}</p>
      </section>
      {activeCourse && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([
          ["Tasa de aprobados", (row: OfficialSubjectGrades) => row.passed],
          ["Tasa de no presentados", (row: OfficialSubjectGrades) => row.notPresented],
        ] as const).map(([label, count]) => <Indicator key={label} title={label} source={activeCourse}>
          <ObservatoryBars label={label} unit=" %" maximum={100} highlight={compared} values={visible.map((item) => {
            const row = resultFor(item.id);
            return { id: item.id, name: item.name, value: row ? count(row) * 100 / row.total : null, n: row?.total };
          })} />
        </Indicator>)}
        <div className="min-w-0 lg:col-span-2"><Indicator title="Distribución de calificaciones" source="Resultados oficiales agregados">
          {selected.length === 0 && withResults.length > distributions.length && <p className={`${muted} mb-3`}>
            Se muestran {distributions.length} de {withResults.length}. Marca las asignaturas que quieras comparar.
          </p>}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

function Indicator({ title, source, children }: { title: string; source: string; children: ReactNode }) {
  return <section className={panel}>
    <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <span className="text-xs font-semibold text-subjects">{source}</span>
    </header>
    {children}
  </section>;
}

function GuideIndicators({ items, evidence, section }: {
  items: DecisionSubject[]; evidence: Map<string, OfficialEvidence>; section: "contenidos" | "evaluacion";
}) {
  if (!items.length) return <ObservatoryEmpty message="Selecciona una asignatura para consultar su guía docente." />;
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {items.map((item) => {
      const guide = evidence.get(item.id)?.guide;
      const entries = section === "contenidos"
        ? [["Temario", guide?.program], ["Resultados de aprendizaje", guide?.outcomes]]
        : [["Sistema de evaluación", guide?.assessment], ["Actividades de aprendizaje", guide?.activities]];
      return <Indicator key={item.id} title={item.name} source={guide ? `Guía oficial · ${guide.course}` : "Guía docente"}>
        {guide && entries.some(([, value]) => Boolean(value?.trim())) ? <div className="space-y-3">
          {guide.multicenter && <p className={muted}>Guía compartida por varios centros. Consulta qué apartados aplican a tu centro.</p>}
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
    <div className="flex h-3 overflow-hidden rounded-sm bg-bg-darker" aria-hidden="true">
      {values.map(([label, value, color]) => <div key={label} className={color} style={{ width: `${value * 100 / row.total}%` }} />)}
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
      {values.map(([label, value, color]) => <div key={label} className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`size-2 shrink-0 ${color}`} /><dt>{label}</dt><dd className="font-semibold">{value}</dd>
      </div>)}
    </dl>
  </>;
}
