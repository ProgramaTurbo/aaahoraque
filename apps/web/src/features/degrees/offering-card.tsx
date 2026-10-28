import type { ReactNode } from "react";
import type { DegreeSummary } from "./types";

/** Matches the existing academic offering cards in /explorar/titulaciones. */
export function OfferingCard({ offering, selected, disabled, modalityLabel, onToggle, children }: {
  offering: DegreeSummary;
  selected: boolean;
  disabled: boolean;
  modalityLabel: string;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return <article className={`info-card info-card-degree flex min-w-0 flex-col gap-5 p-7${selected ? " ring-1 ring-[var(--color-degree)]" : ""}`}>
    <div className="flex flex-wrap gap-2 font-mono text-xs text-[var(--color-degree)]">
      {offering.degree.academicLevel && <span>{offering.degree.academicLevel}</span>}
      {offering.modality && <span>· {modalityLabel}</span>}
    </div>
    <h3 className="font-display text-2xl leading-tight">{offering.degree.name}</h3>
    <div className="flex-1 space-y-2 text-sm text-[var(--color-fg-dim)]">
      <p className="font-medium">{offering.university.name}</p>
      {offering.center && <p>{offering.center.name}</p>}
    </div>
    {children}
    <button type="button" onClick={onToggle} disabled={disabled} aria-pressed={selected}
      aria-label={`${selected ? "Quitar" : "Comparar"}: ${offering.degree.name}, ${offering.university.name}, ${offering.center?.name ?? "centro sin especificar"}`}
      className="link-underline link-underline-degree self-start text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">
      {selected ? "Quitar de la comparación" : "Añadir a la comparación →"}
    </button>
  </article>;
}
