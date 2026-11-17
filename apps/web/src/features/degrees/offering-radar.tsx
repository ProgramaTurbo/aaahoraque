import { chartCriteria, criterionChartValue } from "./chart-data";
import type { DegreeSummary } from "./types";

function point(index: number, value: number) {
  const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
  return { x: 180 + Math.cos(angle) * value, y: 165 + Math.sin(angle) * value };
}

export function OfferingRadar({ offering, activeCriteria }: { offering: DegreeSummary; activeCriteria?: string[] }) {
  const values = chartCriteria.map(({ key }) => criterionChartValue(offering, key, activeCriteria));
  const complete = values.every(({ value }) => value !== null);
  return <figure className="info-card info-card-degree space-y-4 p-5" aria-label={`Perfil de afinidad de ${offering.degree.name}`}>
    <figcaption>
      <h3 className="font-display text-xl">{offering.degree.name}</h3>
      <p className="mt-1 text-sm">Perfil de afinidad de su mejor oferta · {offering.university.name}</p>
    </figcaption>
    <svg viewBox="0 0 360 315" className="mx-auto w-full max-w-lg" aria-hidden="true">
      {[25, 50, 75, 100].map((level) => <polygon key={level}
        points={[0, 1, 2].map((index) => { const p = point(index, level); return `${p.x},${p.y}`; }).join(" ")}
        fill={level === 100 ? "currentColor" : "none"} fillOpacity={0.06} stroke="currentColor" strokeOpacity={0.2} />)}
      {chartCriteria.map(({ key, label }, index) => {
        const end = point(index, 100);
        const caption = point(index, 132);
        return <g key={key}>
          <line x1={180} y1={165} x2={end.x} y2={end.y} stroke="currentColor" strokeOpacity={0.3} />
          <text x={caption.x} y={caption.y} textAnchor="middle" fill="currentColor" fontSize={12}>{label}</text>
        </g>;
      })}
      {complete && <polygon points={values.map(({ value }, index) => {
        const p = value === null ? { x: 180, y: 165 } : point(index, value);
        return `${p.x},${p.y}`;
      }).join(" ")} className="fill-[var(--color-degree-bright)]/50 stroke-[var(--color-degree-bright)]" strokeWidth={2} />}
      {!complete && <polyline points={values.flatMap(({ value }, index) => {
        if (value === null) return [];
        const p = point(index, value); return [`${p.x},${p.y}`];
      }).join(" ")} fill="none" className="stroke-[var(--color-degree-bright)]" strokeWidth={2} />}
      {values.map(({ value }, index) => {
        if (value === null) return null;
        const p = point(index, value);
        return <circle key={chartCriteria[index].key} cx={p.x} cy={p.y} r={4} className="fill-[var(--color-degree-bright)]" />;
      })}
    </svg>
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      {chartCriteria.map(({ key, label }, index) => <div key={key}><dt>{label}</dt><dd className="font-semibold">{values[index].label}</dd></div>)}
    </dl>
    {!complete && <p className="text-xs">Perfil parcial. Solo se unen los criterios evaluados. El área se rellena cuando los tres criterios tienen valor.</p>}
    <p className="text-xs">Escala de 0 a 100. Puntuaciones por criterio antes de aplicar los pesos.</p>
  </figure>;
}
