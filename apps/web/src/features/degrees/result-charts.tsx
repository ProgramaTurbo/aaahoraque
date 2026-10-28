"use client";
import { useState } from "react";
import type { DegreeSummary } from "./types";
import { chartCriteria, criterionChartValue, offeringChartLabel, overallChartValue, pageChartRows, type ChartValue } from "./chart-data";

const panel = "min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 md:p-7";
const colors = ["var(--color-degree-bright)", "var(--color-accent-bright)", "var(--color-subjects)"];

function ScoreBar({ result, label, color = colors[0] }: { result: ChartValue; label: string; color?: string }) {
  if (result.value === null) return <p className="text-sm text-[var(--color-fg-dim)]">{result.label}</p>;
  return <div className="space-y-2">
    <p className="text-sm font-semibold tabular-nums">{result.label}</p>
    <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.value} aria-valuetext={result.label} className="relative h-3 border border-[var(--color-border-light)] bg-[var(--color-bg-darker)]">
      <div aria-hidden="true" className="h-full" style={{ width: `${result.value}%`, backgroundColor: color }} />
    </div>
  </div>;
}

export function PageResultCharts({ offerings, page, activeCriteria }: { offerings: DegreeSummary[]; page: number; activeCriteria?: string[] }) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = offerings.find((o) => o.id === detailId) ?? offerings[0];
  if (!detail) return <p className={panel}>No hay ofertas en esta página para representar.</p>;
  const rows = pageChartRows(offerings);
  return <section aria-label="Gráficas de la página de resultados" className="space-y-5">
    <header>
      <h3 className="text-2xl font-semibold">Tus resultados, de un vistazo</h3>
      <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Solo las {offerings.length} ofertas de la página {page}. Escala 0–100; no representa probabilidad de éxito ni de admisión.</p>
    </header>
    <div className="grid gap-5 lg:grid-cols-2">
      <figure className={panel}>
        <figcaption className="text-lg font-semibold">Ranking visual · página {page}</figcaption>
        <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Orden del motor. Las puntuaciones iguales son empates. Las ofertas sin puntuación no se consideran peores.</p>
        <p aria-hidden="true" className="mt-4 flex justify-between font-mono text-xs text-[var(--color-fg-dim)]"><span>0</span><span>50</span><span>100</span></p>
        <ul className="mt-4 space-y-5">
          {rows.map((row, index) => <li key={row.id} className="border-t border-[var(--color-border)] pt-4">
            <button type="button" aria-pressed={detail.id === row.id} onClick={() => setDetailId(row.id)} className="mb-2 block w-full text-left hover:text-[var(--color-degree-bright)] focus-visible:outline-2 focus-visible:outline-[var(--color-degree-bright)]">
              <span className="block font-semibold">{offerings[index].degree.name}</span>
              <span className="mt-1 block text-xs text-[var(--color-fg-dim)]">{offerings[index].university.name} · {offerings[index].center?.name ?? "Centro sin especificar"}</span>
              <span className="mt-1 block text-xs text-[var(--color-degree-bright)]">{detail.id === row.id ? "Desglose seleccionado" : "Ver desglose por criterio"}</span>
            </button>
            <ScoreBar result={row} label={`Puntuación orientativa: ${row.offeringLabel}`} />
          </li>)}
        </ul>
      </figure>
      <figure className={`${panel} self-start lg:sticky lg:top-24`}>
        <figcaption className="text-lg font-semibold">Desglose por criterio</figcaption>
        <label className="mt-4 block text-sm">Oferta académica
          <select className="mt-2 w-full min-w-0 border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-3" value={detail.id} onChange={(event) => setDetailId(event.target.value)}>
            {offerings.map((o) => <option key={o.id} value={o.id}>{offeringChartLabel(o)}</option>)}
          </select>
        </label>
        <p className="mt-4 font-semibold">{detail.degree.name}</p>
        <p className="mt-1 text-sm text-[var(--color-fg-dim)]">{detail.university.name} · {detail.center?.name ?? "Centro sin especificar"}</p>
        <div className="mt-6 space-y-6">{chartCriteria.map(({ key, label }) => <div key={key}><h4 className="mb-2 text-sm font-semibold">{label}</h4><ScoreBar result={criterionChartValue(detail, key, activeCriteria)} label={`${label}: ${offeringChartLabel(detail)}`} /></div>)}</div>
        <p className="mt-6 text-sm text-[var(--color-fg-dim)]">Puntuaciones individuales, sin ponderar. Intereses se estima por el nombre del grado. Un criterio no utilizado o sin datos no se dibuja como cero.</p>
        {detail.evaluation && <p className="mt-3 text-sm">Criterios calculados: {detail.evaluation.coverage.evaluated}/{detail.evaluation.coverage.requested}. La cobertura no mide fiabilidad ni garantiza acceso.</p>}
      </figure>
    </div>
  </section>;
}

export function SelectedOfferingsChart({ offerings, activeCriteria }: { offerings: DegreeSummary[]; activeCriteria?: string[] }) {
  if (offerings.length < 2) return null;
  const groups = [
    { key: "overall", label: "Puntuación global orientativa", values: offerings.map(overallChartValue) },
    ...chartCriteria.map(({ key, label }) => ({ key, label, values: offerings.map((o) => criterionChartValue(o, key, activeCriteria)) })),
  ];
  return <figure className={panel}>
    <figcaption className="text-xl font-semibold">Comparación visual de tus {offerings.length} ofertas</figcaption>
    <p className="mt-2 text-sm text-[var(--color-fg-dim)]">Solo las ofertas seleccionadas, aunque procedan de páginas diferentes. Todas las barras usan la misma escala 0–100.</p>
    <ul className="mt-5 grid gap-4 md:grid-cols-3">{offerings.map((o, index) => <li key={o.id} className="min-w-0 border-l-4 pl-3" style={{ borderColor: colors[index] }}>
      <p className="font-semibold">{String.fromCharCode(65 + index)} · {o.degree.name}</p><p className="mt-1 text-sm text-[var(--color-fg-dim)]">{o.university.name} · {o.center?.name ?? "Centro sin especificar"}</p>
    </li>)}</ul>
    <div className="mt-7 grid gap-6 md:grid-cols-2">{groups.map((group) => <section key={group.key} aria-label={group.label} className="border-t border-[var(--color-border)] pt-4">
      <h4 className="mb-4 font-semibold">{group.label}</h4>
      <div className="space-y-4">{group.values.map((value, index) => <div key={offerings[index].id} className="grid grid-cols-[1.5rem_1fr] gap-3">
        <span aria-hidden="true" className="font-mono text-sm">{String.fromCharCode(65 + index)}</span>
        <ScoreBar result={value} color={colors[index]} label={`${group.label}: ${offeringChartLabel(offerings[index])}`} />
      </div>)}</div>
    </section>)}</div>
    <p className="mt-5 text-sm text-[var(--color-fg-dim)]">Las puntuaciones globales nulas no son cero; los criterios parciales pueden seguir comparándose. No se evalúa ni garantiza la admisión.</p>
  </figure>;
}
