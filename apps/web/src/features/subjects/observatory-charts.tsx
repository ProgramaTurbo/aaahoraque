import { creditsFormat } from "@/lib/subjects/decision";

export function ObservatoryEmpty({ message }: { message: string }) {
  return <p className="flex min-h-24 items-center justify-center border border-dashed border-control-border px-4 py-3 text-center text-sm text-[var(--color-fg-dim)]">{message}</p>;
}

type Bar = { id: string; name: string; value: number | null; n?: number };

export function ObservatoryBars({ values, label, unit = "", maximum, maxRows = 12, highlight = [], emptyMessage = "Datos insuficientes con estos filtros." }: {
  values: Bar[]; label: string; unit?: string; maximum?: number; maxRows?: number; highlight?: string[]; emptyMessage?: string;
}) {
  const usable = values.filter((item): item is Bar & { value: number } => item.value !== null);
  if (!usable.length) return <ObservatoryEmpty message={emptyMessage} />;
  const scale = maximum ?? Math.max(...usable.map((item) => item.value), 0.01);
  return <div className="space-y-2.5">
    <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1" aria-label={label}>
      {usable.slice(0, maxRows < 0 ? undefined : maxRows).map((item) => <li key={item.id}
        title={item.n === undefined ? undefined : `Observaciones: ${item.n}`}>
        <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
          <span className={highlight.includes(item.id) ? "font-semibold text-subjects" : "text-fg"}>{item.name}</span>
          <span className="shrink-0 font-mono tabular-nums">{creditsFormat.format(item.value)}{unit}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-sm bg-bg-darker" aria-hidden="true">
          <div className={`h-full ${highlight.includes(item.id) ? "bg-subjects-fill" : "bg-chart-aqua"}`}
            style={{ width: `${Math.min(100, item.value * 100 / scale)}%` }} />
        </div>
      </li>)}
    </ul>
    {maxRows > 0 && usable.length > maxRows && <p className="text-xs text-[var(--color-fg-dim)]">
      Se muestran {maxRows} de {usable.length}. Usa los filtros o selecciona asignaturas para acotar.
    </p>}
  </div>;
}

export function GuideExtract({ text, sourceUrl, sourceLabel = "Abrir guía oficial" }: {
  text: string; sourceUrl?: string; sourceLabel?: string;
}) {
  return <div className="rounded-sm bg-bg-darker p-4 text-sm leading-relaxed text-[var(--color-fg-dim)]">
    {text && <p className="max-h-52 overflow-auto whitespace-pre-line">{text}</p>}
    {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
      className={`inline-block font-medium text-subjects hover:underline ${text ? "mt-3" : ""}`}>{sourceLabel} ↗</a>}
  </div>;
}
