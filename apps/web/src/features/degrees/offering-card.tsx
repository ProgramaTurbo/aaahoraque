import type { ReactNode } from "react";
import type { DegreeSummary } from "./types";

/** Matches the existing academic offering cards in /explorar/titulaciones. */
export function OfferingCard({ offering, degreeOfferingCount, selected, disabled, modalityLabel, onToggle, onInspect, inspected, children }: {
  offering: DegreeSummary;
  degreeOfferingCount?: number;
  selected: boolean;
  disabled: boolean;
  modalityLabel: string;
  onToggle: () => void;
  onInspect?: () => void;
  inspected?: boolean;
  children?: ReactNode;
}) {
  return <article onClick={onInspect ? (event) => {
    if (!(event.target as HTMLElement).closest("button, summary, a, input, select")) onInspect();
  } : undefined} className={`info-card info-card-degree flex min-w-0 flex-col gap-5 p-7${onInspect ? " cursor-pointer hover:ring-1 hover:ring-[var(--color-degree)]" : ""}${inspected ? " ring-2 ring-[var(--color-degree)]" : ""}${selected ? " ring-1 ring-[var(--color-degree)]" : ""}`}>
    <div className="flex flex-wrap gap-2 font-mono text-xs text-[var(--color-degree)]">
      {offering.degree.academicLevel && <span>{offering.degree.academicLevel}</span>}
      {degreeOfferingCount === undefined && offering.modality && <span>· {modalityLabel}</span>}
    </div>
    <h3 className="font-display text-2xl leading-tight">{onInspect
      ? <button type="button" onClick={onInspect} aria-expanded={inspected} aria-controls="offering-radar"
          className="cursor-pointer text-left hover:underline focus-visible:outline-2">{offering.degree.name}</button>
      : offering.degree.name}</h3>
    <div className="flex-1 space-y-2 text-sm text-[var(--color-fg-dim)]">
      {degreeOfferingCount === undefined ? <>
        <p className="font-medium">{offering.university.name}</p>
        {offering.center && <p>{offering.center.name}</p>}
      </> : <p>{degreeOfferingCount} {degreeOfferingCount === 1 ? "oferta en el catálogo" : "ofertas en el catálogo"}</p>}
    </div>
    {children}
    {degreeOfferingCount === undefined && <button type="button" onClick={onToggle} disabled={disabled} aria-pressed={selected}
      aria-label={`${selected ? "Quitar" : "Comparar"}: ${offering.degree.name}${degreeOfferingCount === undefined ? `, ${offering.university.name}, ${offering.center?.name ?? "centro sin especificar"}` : ""}`}
      className="link-underline link-underline-degree self-start text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">
      {selected ? "Quitar de la comparación" : "Añadir a la comparación →"}
    </button>}
  </article>;
}
