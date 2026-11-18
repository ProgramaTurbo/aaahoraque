"use client";

import { useMemo, type ReactNode } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { creditsFormat, type DecisionSubject } from "@/lib/subjects/decision";
import { mergeSample, type ObservatoryHistory, type SampleStats } from "@/lib/subjects/observatory-history";
import { ObservatoryBars, ObservatoryEmpty } from "./observatory-charts";

const colors = ["var(--color-subjects)", "var(--color-chart-violet)", "var(--color-chart-green)", "var(--color-chart-amber)", "var(--color-chart-rose)", "var(--color-chart-slate)"];
const muted = "text-sm text-[var(--color-fg-dim)]";
const digits = creditsFormat.format;
const ratio = (value: number, n: number) => n > 0 ? value / n : null;
const percent = (value: number, n: number) => n > 0 ? 100 * value / n : null;
const interests: Record<string, string> = {
  datos: "Datos", computacion: "Computación", software: "Software", infraestructura: "Infraestructura", general: "General",
};
const tooltipStyle = { background: "var(--color-bg-card)", borderColor: "var(--color-border)", color: "var(--color-fg)" };

export function IndicatorCard({ title, source, children }: { title: string; source: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-border bg-bg-card p-4 sm:p-5">
    <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${source === "Simulado" ? "bg-warning-bg text-warning-fg" : "bg-subjects-surface text-subjects"}`}>{source}</span>
    </header>
    {children}
  </section>;
}

export function HistoricalIndicators({ section, items, history, course, comparing }: {
  section: "resultados" | "experiencias" | "esfuerzo" | "relaciones";
  items: DecisionSubject[]; history: ObservatoryHistory; course: string; comparing: boolean;
}) {
  const grouped = useMemo(() => {
    const index = new Map<string, typeof history.stats>();
    for (const row of history.stats) {
      const records = index.get(row.subjectId);
      if (records) records.push(row);
      else index.set(row.subjectId, [row]);
    }
    return index;
  }, [history]);
  const values = items.map((item) => {
    const rows = grouped.get(item.id) ?? [];
    return { item, rows: rows.filter((row) => course === "all" || row.course === course) };
  }).map((entry) => ({ ...entry, stats: mergeSample(entry.rows) }));
  const selectedIds = comparing ? items.map((item) => item.id) : [];

  if (!values.some(({ stats }) => stats.n)) return <ObservatoryEmpty message="No hay datos simulados para estas asignaturas y este curso académico." />;

  function metric(title: string, unit: string, max: number | undefined, explain: string, value: (stats: SampleStats) => number | null, count: (stats: SampleStats) => number) {
    return <IndicatorCard title={title} source="Simulado">
      <ObservatoryBars label={title} unit={unit} maximum={max} maxRows={comparing ? -1 : undefined} highlight={selectedIds} showCounts
        values={values.map(({ item, stats }) => ({ id: item.id, name: item.name, value: value(stats), n: count(stats) }))} />
      <p className={`${muted} mt-3`}>{explain}</p>
      {comparing && values.some(({ stats }) => value(stats) === null) && <p className={`${muted} mt-2`}>
        Sin datos para este indicador · {values.filter(({ stats }) => value(stats) === null).map(({ item }) => item.name).join(" · ")}
      </p>}
    </IndicatorCard>;
  }

  const ids = new Set(items.map((item) => item.id));
  const reasons = new Map<string, number>();
  for (const row of history.reasons) {
    if (!ids.has(row.subjectId) || (course !== "all" && row.course !== course)) continue;
    reasons.set(row.reason, (reasons.get(row.reason) ?? 0) + row.count);
  }
  const reasonTotal = [...reasons.values()].reduce((sum, value) => sum + value, 0);
  const groupInterests = new Map<string, { sum: number; n: number }>();
  for (const { rows } of values) for (const row of rows) {
    const entry = groupInterests.get(row.interest) ?? { sum: 0, n: 0 };
    groupInterests.set(row.interest, { sum: entry.sum + row.satisfaction, n: entry.n + row.satisfactionN });
  }

  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
    {section === "resultados" && <>
      {metric("Nota media", " / 10", 10, "Media de las calificaciones registradas. Excluye a quienes no se presentaron.", (s) => ratio(s.gradeSum, s.graded), (s) => s.graded)}
      {metric("Tasa de aprobados en la muestra", " %", 100, "Aprobados sobre el total de registros, incluidos los no presentados.", (s) => percent(s.passed, s.n), (s) => s.n)}
      <IndicatorCard title="Distribución de notas simuladas" source="Simulado">
        <div className="max-h-[32rem] space-y-4 overflow-auto">
          {(comparing ? values : values.filter(({ stats }) => stats.graded).slice(0, 4)).map(({ item, stats }) =>
            <div key={item.id}>
              <p className="text-sm font-semibold">{item.name}</p>
              {stats.graded ? <StackedDistribution total={stats.graded} entries={[
                { label: "Suspenso", count: stats.low, color: "bg-chart-rose" }, { label: "5 a <7", count: stats.pass, color: "bg-chart-green" },
                { label: "7 a <9", count: stats.merit, color: "bg-chart-aqua" }, { label: "9 a 10", count: stats.high, color: "bg-chart-violet" },
              ]} /> : <p className={muted}>Sin calificaciones registradas.</p>}
            </div>)}
        </div>
        <p className={`${muted} mt-3`}>Solo calificaciones registradas. Selecciona asignaturas para comparar sus distribuciones.</p>
      </IndicatorCard>
      <Trend title="Evolución de la nota media" items={items} history={history} comparing={comparing} metric="grade" />
      {metric("Sobresalientes", " %", 100, "Notas de 9 o más sobre las calificaciones registradas.", (s) => percent(s.high, s.graded), (s) => s.graded)}
      {metric("No presentados en la muestra", " %", 100, "No presentados sobre todos los registros.", (s) => percent(s.absent, s.n), (s) => s.n)}
      {metric("Dispersión de las notas", " puntos", 5, "Desviación típica de las calificaciones registradas. Un valor mayor refleja más variación.", (s) => s.graded >= 2 ? Math.sqrt(Math.max(0, s.gradeSquares / s.graded - (s.gradeSum / s.graded) ** 2)) : null, (s) => s.graded)}
      {metric("Registros de la muestra", "", undefined, "Número de registros por asignatura en el periodo elegido.", (s) => s.n || null, (s) => s.n)}
    </>}
    {section === "experiencias" && <>
      {metric("Satisfacción", " / 5", 5, "Valoración media entre los registros con respuesta.", (s) => ratio(s.satisfaction, s.satisfactionN), (s) => s.satisfactionN)}
      {metric("Volvería a elegirla", " %", 100, "Respuestas afirmativas entre quienes contestaron esta pregunta.", (s) => percent(s.again, s.againN), (s) => s.againN)}
      <IndicatorCard title="Motivos de elección" source="Simulado">
        <ObservatoryBars label="Motivos de elección" unit=" %" maximum={100} showCounts values={[...reasons].sort((a, b) => b[1] - a[1])
          .map(([reason, count]) => ({ id: reason, name: reason.replaceAll("_", " "), value: percent(count, reasonTotal), n: count }))} />
        <p className={`${muted} mt-3`}>Distribución de los {digits(reasonTotal)} motivos registrados para las asignaturas en vista.</p>
      </IndicatorCard>
      <IndicatorCard title="Satisfacción por interés previo" source="Simulado">
        <ObservatoryBars label="Satisfacción por interés previo" unit=" / 5" maximum={5} showCounts values={[...groupInterests]
          .map(([interest, score]) => ({ id: interest, name: interests[interest] ?? interest, value: ratio(score.sum, score.n), n: score.n }))} />
        <p className={`${muted} mt-3`}>Agrupa los registros por el interés previo del perfil simulado.</p>
      </IndicatorCard>
      {metric("Elecciones en la muestra", "", undefined, "Número de registros por asignatura en el periodo elegido.", (s) => s.n || null, (s) => s.n)}
      <Trend title="Elecciones por curso académico" items={items} history={history} comparing={comparing} metric="count" />
    </>}
    {section === "esfuerzo" && <>
      {metric("Dedicación semanal", " h", undefined, "Media de horas semanales de los registros simulados.", (s) => ratio(s.hours, s.n), (s) => s.n)}
      {metric("Dificultad percibida", " / 5", 5, "Media de dificultad entre los registros con respuesta.", (s) => ratio(s.difficulty, s.difficultyN), (s) => s.difficultyN)}
    </>}
    {section === "relaciones" && <>
      <Relationship title="Dificultad y nota media" xLabel="Dificultad (1–5)" yLabel="Nota (0–10)" xMax={5} yMax={10} data={values.flatMap(({ item, stats }) => {
        const x = ratio(stats.difficulty, stats.difficultyN);
        const y = ratio(stats.gradeSum, stats.graded);
        return x === null || y === null ? [] : [{ name: item.name, x, y }];
      })} />
      <Relationship title="Dedicación y satisfacción" xLabel="Horas semanales" yLabel="Satisfacción (1–5)" yMax={5} data={values.flatMap(({ item, stats }) => {
        const x = ratio(stats.hours, stats.n);
        const y = ratio(stats.satisfaction, stats.satisfactionN);
        return x === null || y === null ? [] : [{ name: item.name, x, y }];
      })} />
      <Relationship title="Nota media y satisfacción" xLabel="Nota (0–10)" yLabel="Satisfacción (1–5)" xMax={10} yMax={5} data={values.flatMap(({ item, stats }) => {
        const x = ratio(stats.gradeSum, stats.graded);
        const y = ratio(stats.satisfaction, stats.satisfactionN);
        return x === null || y === null ? [] : [{ name: item.name, x, y }];
      })} />
      {comparing && <IndicatorCard title="Dedicación conjunta de la selección" source="Simulado">
        {values.every(({ stats }) => stats.n) ? <p className="text-2xl font-semibold">{digits(values.reduce((sum, { stats }) => sum + stats.hours / stats.n, 0))} h/semana</p>
          : <p className={muted}>Faltan observaciones para alguna asignatura seleccionada.</p>}
        <p className={`${muted} mt-2`}>Suma de las medias por asignatura. Las horas reales dependerán de tu matrícula y de cómo organices el estudio.</p>
      </IndicatorCard>}
    </>}
  </div>;
}

export function StackedDistribution({ total, entries }: { total: number; entries: { label: string; count: number; color: string }[] }) {
  if (total <= 0) return null;
  return <div className="mt-2 space-y-2">
    <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-bg-darker">
      {entries.map((entry) => <div key={entry.label} className={entry.color} style={{ width: `${entry.count * 100 / total}%` }} />)}
    </div>
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {entries.map((entry) => <li key={entry.label} className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`size-2 rounded-full ${entry.color}`} />{entry.label} <strong>{digits(entry.count)}</strong>
      </li>)}
    </ul>
  </div>;
}

function Trend({ title, items, history, comparing, metric }: {
  title: string; items: DecisionSubject[]; history: ObservatoryHistory; comparing: boolean; metric: "grade" | "count";
}) {
  if (!comparing) return <IndicatorCard title={title} source="Simulado"><p className={muted}>Selecciona asignaturas para ver su evolución.</p></IndicatorCard>;
  const keys = items.map((item, index) => ({ ...item, key: `serie${index}`, color: colors[index % colors.length] }));
  const itemIds = new Set(items.map((item) => item.id));
  const rows = history.stats.filter((row) => itemIds.has(row.subjectId));
  const years = [...new Set(rows.map((row) => row.course))].sort();
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = `${row.course}:${row.subjectId}`;
    const found = grouped.get(key);
    if (found) found.push(row);
    else grouped.set(key, [row]);
  }
  const data = years.map((course) => ({
    course, ...Object.fromEntries(keys.map((item) => {
      const stats = mergeSample(grouped.get(`${course}:${item.id}`) ?? []);
      return [item.key, metric === "grade" ? ratio(stats.gradeSum, stats.graded) : stats.n || null];
    })),
  }));
  return <IndicatorCard title={title} source="Simulado">
    {years.length < 2 ? <p className={muted}>Se necesitan datos de al menos dos cursos académicos.</p> : keys.length > colors.length ?
      <div className="max-h-80 overflow-auto" role="region" aria-label={title} tabIndex={0}>
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs">Valores por asignatura y curso académico</caption>
          <thead><tr className="border-b border-border"><th className="p-2" scope="col">Asignatura</th>
            {years.map((year) => <th className="whitespace-nowrap p-2" scope="col" key={year}>{year}</th>)}
          </tr></thead>
          <tbody>{keys.map((item) => <tr key={item.id} className="border-b border-border">
            <th className="min-w-40 p-2 font-medium" scope="row">{item.name}</th>
            {data.map((row) => {
              const value = (row as Record<string, unknown>)[item.key];
              return <td className="p-2 tabular-nums" key={row.course}>{typeof value === "number" ? digits(value) : "—"}</td>;
            })}
          </tr>)}</tbody>
        </table>
      </div> : <>
      <p className={`${muted} mb-3`}>Serie completa de las asignaturas seleccionadas.</p>
      <div className="h-60 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="course" tick={{ fill: "var(--color-fg)", fontSize: 11 }} />
            <YAxis width={44} domain={metric === "grade" ? [0, 10] : [0, "auto"]} tick={{ fill: "var(--color-fg)", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "var(--color-fg)" }} />
            {keys.map((item) => <Line key={item.id} dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {keys.map((item) => <li key={item.id} className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full" style={{ background: item.color }} />{item.name}</li>)}
      </ul>
    </>}
  </IndicatorCard>;
}

function Relationship({ title, xLabel, yLabel, xMax, yMax, data }: {
  title: string; xLabel: string; yLabel: string; xMax?: number; yMax: number; data: { name: string; x: number; y: number }[];
}) {
  return <IndicatorCard title={title} source="Simulado">
    {data.length < 2 ? <p className={muted}>Se necesitan al menos dos asignaturas con ambos indicadores.</p> : <>
      <div className="h-56 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 14, bottom: 6, left: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={xLabel} domain={[0, xMax ?? "auto"]} tick={{ fill: "var(--color-fg)", fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name={yLabel} width={40} domain={[0, yMax]} tick={{ fill: "var(--color-fg)", fontSize: 11 }} />
            <Tooltip content={({ active, payload }) => {
              const item = payload?.[0]?.payload as typeof data[number] | undefined;
              return active && item ? <div className="rounded-lg border border-border bg-bg-card p-2 text-xs text-fg">
                <p className="font-semibold">{item.name}</p><p>{xLabel} · {digits(item.x)}</p><p>{yLabel} · {digits(item.y)}</p>
              </div> : null;
            }} />
            <Scatter data={data} fill="var(--color-subjects)" isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className={muted}>Eje horizontal · {xLabel}. Eje vertical · {yLabel}. Cada punto representa una asignatura.</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">Ver valores</summary>
        <ul className="mt-2 space-y-1">{data.map((item, index) => <li key={index}>{item.name} · {digits(item.x)} · {digits(item.y)}</li>)}</ul>
      </details>
    </>}
  </IndicatorCard>;
}
