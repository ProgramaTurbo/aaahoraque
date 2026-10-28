"use client";

import { useEffect, useRef, useState } from "react";
import type { DegreeSummary as CatalogOffering } from "./types";
import { OfferingPlans } from "./offering-plans";
import { OfferingCard } from "./offering-card";
import { PageResultCharts, SelectedOfferingsChart } from "./result-charts";
import type { OrientationProfile } from "./orientation-profile";

const panel = "border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5";
const input = "mt-2 w-full border border-[var(--color-border-light)] bg-[var(--color-bg-card)] p-3";
const labels: Record<string, string> = { on_site: "Presencial", online: "Online", hybrid: "Híbrida" };
const modality = (o: CatalogOffering) => o.modality ? labels[o.modality] ?? o.modality : "Sin información";
const rows: [string, (o: CatalogOffering) => string][] = [
  ["Universidad", (o) => o.university.name],
  ["Centro", (o) => o.center?.name ?? "Sin información"],
  ["Modalidad", modality],
  ["Nivel académico", (o) => o.degree.academicLevel],
  ["Coste", () => "Sin información en esta vista"],
  ["Provincia del centro", (o) => o.province ?? "Sin información en esta vista"],
  ["Admisión", () => "Pendiente de verificar"],
  ["Afinidad orientativa", (o) => o.evaluation ? (o.evaluation.score === null ? "Sin puntuación comparable" : `${o.evaluation.score}/100 según los criterios evaluados`) : "Todavía no calculada"],
];

export function DegreesWorkspace({ profile }: { profile?: OrientationProfile }) {
  const [query, setQuery] = useState("");
  const [university, setUniversity] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CatalogOffering[]>([]);
  const ids = selected.map((o) => o.id);
  const [universities, setUniversities] = useState<[string, string][]>([]);
  const haveUniversities = useRef(false);
  const [result, setResult] = useState<{ data: CatalogOffering[]; hasMore: boolean; key: string; excluded?: number; total?: number; activeCriteria?: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const requestKey = JSON.stringify([query, university, page, attempt, profile]);
  const loading = result?.key !== requestKey && error !== requestKey;
  const filtered = result?.key === requestKey ? result.data : [];
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: query, university, page: String(page) });
      if (!haveUniversities.current) params.set("universities", "1");
      fetch(profile ? "/api/degrees/orientation" : `/api/degrees/catalog?${params}`, {
        signal: controller.signal,
        ...(profile ? { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, q: query, university, page, universities: !haveUniversities.current }) } : {}),
      })
        .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "No se pudieron cargar las ofertas"); return body; })
        .then((payload) => {
          if (controller.signal.aborted) return;
          setResult({ data: payload.data, hasMore: payload.hasMore, key: requestKey, excluded: payload.excluded, total: payload.total, activeCriteria: payload.activeCriteria });
          setError(null);
          if (payload.universities) {
            setUniversities(payload.universities.map((u: { id: string; name: string }) => [u.id, u.name]));
            haveUniversities.current = true;
          }
        })
        .catch((cause) => { if (!controller.signal.aborted) { setError(requestKey); setErrorMessage(cause instanceof Error ? cause.message : "No se pudieron cargar las ofertas"); } });
    }, query ? 300 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, university, page, requestKey, profile]);
  function toggle(id: string) {
    setSelected((current) => {
      if (current.some((o) => o.id === id)) return current.filter((o) => o.id !== id);
      const offering = filtered.find((o) => o.id === id);
      return offering && current.length < 3 ? [...current, offering] : current;
    });
  }
  return (
    <div className="space-y-8">
      <aside className={panel}>
        <h2 className="font-semibold">Información disponible</h2>
        <p className="mt-2 text-sm text-[var(--color-fg-dim)]">El catálogo puede incluir datos sintéticos de desarrollo. Esta vista no verifica su procedencia. Los costes y las condiciones de admisión están pendientes de verificar. La ubicación se basa en la provincia del centro, no en distancias al domicilio.</p>
      </aside>
      {profile && <aside className={panel}>
        <h2 className="text-xl font-semibold">Cómo leer tus resultados</h2>
        <p className="mt-3">La puntuación orientativa combina únicamente los criterios respondidos y calculables, con tus prioridades. No representa una probabilidad de éxito ni una garantía de acceso. La relación con los intereses se estima provisionalmente por el nombre de la titulación.</p>
        <p className="mt-3">Las opciones con datos incompletos aparecen después, sin puntuación global: no son necesariamente peores. La autoevaluación, el expediente y los objetivos profesionales todavía no puntúan.</p>
        {result?.key === requestKey && <p className="mt-3">{result.total} ofertas tras aplicar filtros. {result.excluded} descartadas por restricciones expresas. Las restantes tienen verificaciones pendientes.</p>}
      </aside>}
      <section aria-labelledby="explore-heading" className="space-y-5">
        <h2 id="explore-heading" className="text-2xl font-semibold">{profile ? "Opciones según tu perfil" : "1. Explora las ofertas"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label>Buscar titulación, universidad o centro<input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className={input} /></label>
          <label>Universidad<select value={university} onChange={(e) => { setUniversity(e.target.value); setPage(1); }} className={input}>
            <option value="">Todas las universidades</option>
            {universities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select></label>
        </div>
        <p role="status">Página {page} · {filtered.length} ofertas mostradas · {selected.length}/3 seleccionadas.</p>
        <p className="text-sm text-[var(--color-fg-dim)]">La selección se conserva al filtrar y se borra al salir de esta página. Al alcanzar tres alternativas, quita una para añadir otra.</p>
        {!loading && error !== requestKey && !filtered.length && <p>No hay ofertas con estos filtros. Prueba otra búsqueda o universidad.</p>}
        {profile && result?.key === requestKey && filtered.length > 0 && <PageResultCharts offerings={filtered} page={page} activeCriteria={result.activeCriteria} />}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((o) => <OfferingCard key={o.id} offering={o} selected={ids.includes(o.id)} disabled={!ids.includes(o.id) && ids.length >= 3} modalityLabel={modality(o)} onToggle={() => toggle(o.id)}>
            {profile && o.province && <p className="text-sm text-[var(--color-fg-dim)]">Provincia del centro: {o.province}</p>}
            {o.evaluation && <div className="mb-5 space-y-3 text-sm">
              <p className="font-semibold text-[var(--color-degree-bright)]">{o.evaluation.score === null ? "Sin puntuación comparable" : `Afinidad orientativa: ${o.evaluation.score}/100`}</p>
              {o.evaluation.score !== null && <meter min={0} max={100} value={o.evaluation.score} aria-label="Afinidad orientativa" className="w-full" />}
              <dl className="space-y-2">{Object.entries(o.evaluation.criteria).map(([key, value]) => <div key={key}>
                <dt>{({ interests: "Intereses (estimación)", location: "Ubicación", modality: "Modalidad" } as Record<string, string>)[key] ?? key}: {value}/100</dt>
                <dd><meter min={0} max={100} value={value} aria-label={`Valoración de ${key}`} className="w-full" /></dd>
              </div>)}</dl>
              <p>Criterios calculados: {o.evaluation.coverage.evaluated}/{o.evaluation.coverage.requested}. Verificación pendiente.</p>
              {o.evaluation.reasons.length > 0 && <ul className="list-disc pl-5">{o.evaluation.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
              <details><summary className="cursor-pointer underline">Qué falta comprobar</summary><ul className="mt-2 list-disc pl-5">{o.evaluation.pending.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>
            </div>}
          </OfferingCard>)}
        </div>
        {loading && <p role="status">Buscando ofertas…</p>}
        {error === requestKey && <p role="alert">{errorMessage} <button type="button" className="underline" onClick={() => setAttempt((n) => n + 1)}>Reintentar</button></p>}
        <nav aria-label="Páginas de ofertas" className="flex items-center gap-5">
          <button type="button" disabled={page === 1 || loading} onClick={() => setPage((n) => n - 1)} className="underline disabled:opacity-40">Anterior</button>
          <span>Página {page}</span>
          <button type="button" disabled={loading || result?.key !== requestKey || !result?.hasMore} onClick={() => setPage((n) => n + 1)} className="underline disabled:opacity-40">Siguiente</button>
        </nav>
      </section>
      <section aria-labelledby="compare-heading" className="space-y-5">
        <h2 id="compare-heading" className="text-2xl font-semibold">2. Compara tus alternativas</h2>
        {selected.length < 2 && <p>Selecciona al menos dos ofertas para explorar sus diferencias.</p>}
        {profile && <SelectedOfferingsChart offerings={selected} activeCriteria={result?.activeCriteria} />}
        {selected.length > 0 && <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="pb-4 text-left text-[var(--color-fg-dim)]">Características del catálogo. Revisa cada versión del plan por separado; sus créditos no se suman.</caption>
            <thead><tr><th scope="col" className="p-4">Característica</th>{selected.map((o) => <th key={o.id} scope="col" className="min-w-64 p-4 align-top">{o.degree.name}<button type="button" onClick={() => toggle(o.id)} aria-label={`Quitar ${o.degree.name}, ${o.university.name}`} className="mt-3 block font-normal underline">Quitar</button></th>)}</tr></thead>
            <tbody>
              {rows.map(([label, render]) => <tr key={label} className="border-t border-[var(--color-border)]"><th scope="row" className="p-4">{label}</th>{selected.map((o) => <td key={o.id} className="p-4">{render(o)}</td>)}</tr>)}
              <tr className="border-t border-[var(--color-border)]"><th scope="row" className="p-4 align-top">Planes y contenidos</th>{selected.map((o) => <td key={o.id} className="p-4 align-top"><OfferingPlans id={o.id} /></td>)}</tr>
            </tbody>
          </table>
        </div>}
      </section>
    </div>
  );
}
