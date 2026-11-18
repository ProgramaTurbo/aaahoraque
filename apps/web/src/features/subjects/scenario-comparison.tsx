"use client";

import { useState } from "react";
import { creditsFormat, isOutsidePeriod, periodNames, selectionCredits, semesterName, type DecisionDraft, type DecisionSubject, type OfficialEvidence, type Period } from "@/lib/subjects/decision";
import { mergeSample, type ObservatoryHistory } from "@/lib/subjects/observatory-history";
import { preferenceLabels, subjectPreferenceFields, type SubjectPreferences } from "@/lib/subjects/progress";
import { IndicatorCard, StackedDistribution } from "./historical-indicators";
import { ObservatoryBars } from "./observatory-charts";

export type ScenarioToCompare = DecisionDraft & { id: string; name: string | null; preferences: SubjectPreferences | null };

const muted = "text-sm text-[var(--color-fg-dim)]";
const field = "mt-1 block w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-fg";
const number = creditsFormat.format;
const percent = (count: number, n: number) => n ? 100 * count / n : null;
const semesters = [
  ["1", "Primer semestre", "bg-chart-aqua"],
  ["2", "Segundo semestre", "bg-chart-violet"],
  ["annual", "Anuales", "bg-chart-green"],
  [null, "Periodo sin confirmar", "bg-chart-slate"],
] as const;

export function ScenarioComparison({ scenarios, subjects, completed, history, evidence }: {
  scenarios: ScenarioToCompare[];
  subjects: DecisionSubject[];
  completed: Set<string>;
  history: ObservatoryHistory;
  evidence: OfficialEvidence[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const [year, setYear] = useState("all");
  const [panel, setPanel] = useState<"organizacion" | "resultados" | "esfuerzo" | "asignaturas">("organizacion");
  const [academicCourse, setAcademicCourse] = useState("");
  const [showSample, setShowSample] = useState(false);
  const selectedIds = new Set(scenarios.flatMap(({ subjectIds }) => subjectIds));
  const selected = subjects.filter((subject) => selectedIds.has(subject.id));
  const catalogYears = [...new Set(selected.flatMap((subject) => subject.year === null ? [] : [subject.year]))].sort((a, b) => a - b);
  const activeYear = catalogYears.includes(Number(year)) ? year : "all";
  const subjectIds = new Set(selected.filter((subject) => activeYear === "all" || subject.year === Number(activeYear))
    .filter((subject) => period === "annual" || subject.semester === period || subject.semester === "annual").map((subject) => subject.id));
  const bySubject = new Map(selected.map((subject) => [subject.id, subject]));
  const results = evidence.filter((item) => subjectIds.has(item.subjectId));
  const sample = history.stats.filter((row) => subjectIds.has(row.subjectId));
  const officialCourses = [...new Set(results.flatMap((item) => item.grades.map((row) => row.course)))].sort().reverse();
  const sampleCourses = [...new Set(sample.map((row) => row.course))].sort().reverse();
  const courses = [...new Set([...officialCourses, ...(showSample ? sampleCourses : [])])].sort().reverse();
  const course = courses.includes(academicCourse) ? academicCourse : officialCourses[0] ?? courses[0];
  const evidenceById = new Map(results.map((item) => [item.subjectId, item.grades.find((row) => row.course === course)]));
  const sampleById = new Map<string, ObservatoryHistory["stats"]>();
  if (showSample) for (const row of sample) {
    if (row.course !== course) continue;
    const existing = sampleById.get(row.subjectId);
    if (existing) existing.push(row);
    else sampleById.set(row.subjectId, [row]);
  }
  const metrics = scenarios.map((scenario) => {
    const items = scenario.subjectIds.flatMap((id) => subjectIds.has(id) ? bySubject.get(id) ?? [] : []);
    const credits = selectionCredits(items);
    const gradeRows = items.flatMap((item) => evidenceById.get(item.id) ?? []);
    const grades = {
      total: gradeRows.reduce((sum, row) => sum + row.total, 0),
      passed: gradeRows.reduce((sum, row) => sum + row.passed, 0),
      absent: gradeRows.reduce((sum, row) => sum + row.notPresented, 0),
    };
    const sampleRows = items.map((item) => ({ item, data: mergeSample(sampleById.get(item.id) ?? []) }));
    const sampleTotal = mergeSample(items.flatMap((item) => sampleById.get(item.id) ?? []));
    return {
      scenario, items, credits, gradeRows, grades, sampleRows, sampleTotal,
      totalCredits: selectionCredits(scenario.subjectIds.flatMap((id) => bySubject.get(id) ?? [])),
      noOffer: items.filter((item) => item.knownUnavailable).length,
      passed: items.filter((item) => completed.has(item.id)).length,
      outside: items.filter((item) => isOutsidePeriod(item, scenario.period)).length,
    };
  });

  const itemsByScenario = new Map<string, number>();
  for (const { items } of metrics) for (const item of items) {
    itemsByScenario.set(item.id, (itemsByScenario.get(item.id) ?? 0) + 1);
  }
  const comparedPriorities = subjectPreferenceFields.filter((key) =>
    new Set(scenarios.map((scenario) => scenario.preferences?.[key] ?? null)).size > 1);
  const tabs = [["organizacion", "Organización"], ["resultados", "Resultados"], ["esfuerzo", "Esfuerzo y experiencias"], ["asignaturas", "Asignaturas y prioridades"]] as const;

  function metricBars(title: string, source: string, getValue: (row: typeof metrics[number]) => { value: number | null; n?: number }, unit = "", maximum?: number) {
    const bars = metrics.map((row) => ({ id: row.scenario.id, name: row.scenario.name ?? "Escenario", ...getValue(row) }));
    const missing = bars.filter((row) => row.value === null);
    return <IndicatorCard title={title} source={source}>
      <ObservatoryBars label={title} values={bars} unit={unit} maximum={maximum} maxRows={-1} showCounts />
      {missing.length > 0 && missing.length < bars.length && <p className={`${muted} mt-2`}>Sin datos · {missing.map((item) => item.name).join(" · ")}</p>}
    </IndicatorCard>;
  }

  return <div className="mt-5 space-y-4 border-t border-border pt-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-semibold">Periodo de la comparación
        <select className={field} value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
          {Object.entries(periodNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {catalogYears.length > 0 && <label className="text-sm font-semibold">Curso del plan que quieres comparar
        <select className={field} value={activeYear} onChange={(event) => setYear(event.target.value)}>
          <option value="all">Todos los cursos del plan</option>
          {catalogYears.map((item) => <option key={item} value={item}>{item}.º curso</option>)}
        </select>
      </label>}
      {courses.length > 0 && (panel === "resultados" || panel === "esfuerzo") && <label className="text-sm font-semibold">Curso académico de los datos
        <select className={field} value={course} onChange={(event) => setAcademicCourse(event.target.value)}>
          {courses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>}
    </div>
    {period !== "annual" && <p className={muted}>Las asignaturas anuales se incluyen en ambos semestres con sus ECTS completos. Las de periodo desconocido aparecen en la vista de curso completo.</p>}
    <nav aria-label="Indicadores de escenarios" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tabs.map(([id, label]) => <button key={id} type="button" aria-pressed={id === panel} onClick={() => setPanel(id)}
        className="rounded-lg border border-control-border px-3 py-2 text-left text-sm font-semibold hover:bg-bg-card-hover aria-pressed:border-subjects aria-pressed:bg-subjects-highlight aria-pressed:text-subjects">{label}</button>)}
    </nav>
    {(panel === "resultados" || panel === "esfuerzo") && sampleCourses.length > 0 && <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={showSample} className="size-4 accent-subjects-fill" onChange={(event) => setShowSample(event.target.checked)} />
      Ver datos simulados en escenarios
    </label>}

    {panel === "organizacion" && <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      {metricBars("Créditos en el periodo filtrado", "Catálogo oficial", (row) => ({ value: row.credits }), " ECTS")}
      <IndicatorCard title="Cómo se reparten los créditos" source="Catálogo oficial">
        <div className="max-h-80 space-y-4 overflow-auto">
          {metrics.map(({ scenario, items, credits }) => <div key={scenario.id}>
            <p className="font-semibold">{scenario.name}</p>
            {items.length ? <StackedDistribution total={credits} entries={semesters.map(([value, label, color]) => ({
              label: `${label} · ECTS`, color,
              count: selectionCredits(items.filter((item) => value === null ? !["1", "2", "annual"].includes(item.semester ?? "") : item.semester === value)),
            }))} /> : <p className={muted}>Sin asignaturas en este filtro.</p>}
          </div>)}
        </div>
      </IndicatorCard>
      <div className="min-w-0 lg:col-span-2">
        <IndicatorCard title="Qué conviene revisar" source="Catálogo y expediente">
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map(({ scenario, totalCredits, passed, noOffer, outside }) => <article key={scenario.id} className="rounded-lg border border-border p-3">
              <h4 className="font-semibold">{scenario.name}</h4>
              <p className={muted}>{periodNames[scenario.period]} · {number(totalCredits)} de {number(scenario.target)} ECTS del objetivo del escenario completo</p>
              <p className={`${muted} mt-2`}>{passed} ya superadas · {noOffer} marcadas como no ofertadas · {outside} en otro semestre respecto al escenario guardado</p>
            </article>)}
          </div>
        </IndicatorCard>
      </div>
    </div>}

    {panel === "resultados" && <>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {metricBars("Tasa de aprobados", "Oficial", ({ grades }) => ({ value: percent(grades.passed, grades.total), n: grades.total }), " %", 100)}
        {metricBars("Tasa de no presentados", "Oficial", ({ grades }) => ({ value: percent(grades.absent, grades.total), n: grades.total }), " %", 100)}
        {showSample && metricBars("Tasa de aprobados en la muestra", "Simulado", ({ sampleTotal }) => ({ value: percent(sampleTotal.passed, sampleTotal.n), n: sampleTotal.n }), " %", 100)}
      </div>
      <p className={muted}>Tasas sobre los registros de las asignaturas con datos, incluidos los no presentados. Una persona puede aparecer en varias asignaturas del mismo escenario.</p>
      <ul className="space-y-2 text-sm">{metrics.map(({ scenario, gradeRows, items, sampleRows }) => <li key={scenario.id}>
        <strong>{scenario.name}</strong> · cobertura oficial {gradeRows.length}/{items.length}
        {showSample && ` · cobertura simulada ${sampleRows.filter(({ data }) => data.n > 0).length}/${items.length}`}
        {[...new Set(gradeRows.map((row) => row.sourceUrl))].map((url, index) => <a key={url} href={url} className="ml-2 text-subjects underline">Fuente oficial {index + 1}</a>)}
      </li>)}</ul>
    </>}

    {panel === "esfuerzo" && <>
      {!showSample && <p className={muted}>{sampleCourses.length ? "Activa los datos simulados para comparar la dedicación semanal y la satisfacción." : "Este filtro no tiene datos de esfuerzo o experiencias."}</p>}
      {showSample && <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {([["1", "primer semestre"], ["2", "segundo semestre"]] as const)
          .filter(([semester]) => period === "annual" || period === semester)
          .map(([semester, label]) => <div key={semester}>{metricBars(`Dedicación semanal · ${label}`, "Simulado", ({ sampleRows }) => {
            const rows = sampleRows.filter(({ item }) => item.semester === semester || item.semester === "annual");
            return { value: rows.length && rows.every(({ data }) => data.n > 0)
              ? rows.reduce((sum, { data }) => sum + data.hours / data.n, 0) : null };
          }, " h/sem")}</div>)}
        {metricBars("Dificultad percibida", "Simulado", ({ sampleTotal }) => ({
          value: sampleTotal.difficultyN ? sampleTotal.difficulty / sampleTotal.difficultyN : null, n: sampleTotal.difficultyN,
        }), " / 5", 5)}
        {metricBars("Satisfacción", "Simulado", ({ sampleTotal }) => ({
          value: sampleTotal.satisfactionN ? sampleTotal.satisfaction / sampleTotal.satisfactionN : null, n: sampleTotal.satisfactionN,
        }), " / 5", 5)}
      </div>}
      {showSample && <p className={muted}>La carga semanal suma las medias simuladas de cada asignatura del semestre. El cálculo necesita datos de todas esas asignaturas.</p>}
    </>}

    {panel === "asignaturas" && <>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map(({ scenario, items }) => <article className="min-w-0 rounded-xl border border-border p-3" key={scenario.id}>
          <h4 className="font-semibold">{scenario.name}</h4>
          {items.length ? <ul className="mt-2 max-h-80 space-y-2 overflow-auto text-sm">
            {items.map((item) => {
              const count = itemsByScenario.get(item.id) ?? 0;
              return <li key={item.id}>{item.name} <span className={muted}>· {semesterName(item.semester)}{count === 1 ? " · exclusiva" : ` · en ${count} escenarios`}</span></li>;
            })}
          </ul> : <p className={muted}>Sin asignaturas en este filtro.</p>}
        </article>)}
      </div>
      {comparedPriorities.length > 0 && <div className="max-w-full overflow-auto" role="region" aria-label="Prioridades que cambian" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">Prioridades que cambian</caption>
          <thead><tr className="border-b border-border">
            <th scope="col" className="p-2">Prioridad</th>
            {scenarios.map((scenario) => <th key={scenario.id} scope="col" className="p-2">{scenario.name}</th>)}
          </tr></thead>
          <tbody>{comparedPriorities.map((key) => <tr key={key} className="border-b border-border">
            <th scope="row" className="p-2 font-medium">{preferenceLabels[key]}</th>
            {scenarios.map((scenario) => <td key={scenario.id} className="p-2">{scenario.preferences?.[key] ?? "Sin responder"}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
    </>}
  </div>;
}
