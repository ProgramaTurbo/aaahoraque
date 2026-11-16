"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { addFavorite, removeFavorite } from "@/app/panel/favorite-actions";
import type { getFavorites } from "@/lib/account/favorites";
import { decisionPath } from "@/lib/subjects/decision";

const field = "w-full rounded-lg border border-control-border bg-bg-card px-3 py-2.5 text-fg";
const button = "rounded-lg border border-control-border px-3 py-2 text-sm font-semibold hover:bg-bg-card-hover disabled:opacity-50";
const muted = "text-sm text-[var(--color-fg-dim)]";
type Offering = { id: string; degree: { name: string }; university: { name: string }; center: { name: string } | null };

export function Favorites({ favorites }: { favorites: Awaited<ReturnType<typeof getFavorites>> }) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ query: string; results: Offering[]; error: boolean; more: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/degrees/catalog?${new URLSearchParams({ q: term })}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catálogo no disponible");
        const data = await response.json();
        if (!controller.signal.aborted) setSearch({ query: term, results: data.data, error: false, more: data.hasMore });
      } catch {
        if (!controller.signal.aborted) setSearch({ query: term, results: [], error: true, more: false });
      }
    }, 250);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [term]);
  const currentSearch = term.length >= 2 && search?.query === term ? search : null;

  function run(action: () => Promise<{ error?: string; saved?: boolean; removed?: boolean }>, success: string, onSuccess?: () => void) {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(result.error ?? success);
        if (!result.error) onSuccess?.();
      } catch {
        setMessage("No se ha podido guardar el cambio. Vuelve a intentarlo.");
      }
    });
  }

  function saveDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    run(() => addFavorite({ kind: "destination", name: String(data.get("destination")), url: String(data.get("url")) }),
      "Destino guardado.", () => form.reset());
  }

  function remove(id: string, name: string) {
    return <button type="button" disabled={pending} onClick={() => run(() => removeFavorite(id), "Favorito retirado.")}
      aria-label={`Quitar ${name} de favoritos`} className={button}>Quitar</button>;
  }

  return <div className="mt-4 space-y-6">
    <div className="grid gap-7 lg:grid-cols-3">
      <div>
        <h3 className="mb-2 font-semibold">Titulaciones</h3>
        <label className={muted}>Buscar una titulación
          <input type="search" className={`${field} mt-1.5`} value={query} onChange={(event) => setQuery(event.target.value)}
            maxLength={200} placeholder="Nombre, universidad o centro" />
        </label>
        {term.length >= 2 && !currentSearch && <p role="status" className={`${muted} mt-2`}>Buscando…</p>}
        {currentSearch && <ul aria-label="Resultados de titulaciones" className="mt-2 max-h-64 divide-y divide-border overflow-auto rounded-lg border border-border">
          {currentSearch.results.map((item) => <li key={item.id} className="flex items-start justify-between gap-3 p-2">
            <div><p className="text-sm font-medium">{item.degree.name}</p>
              <p className={muted}>{item.university.name}{item.center ? ` · ${item.center.name}` : ""}</p></div>
            <button type="button" disabled={pending} className={button} aria-label={`Guardar ${item.degree.name} en favoritos`}
              onClick={() => run(() => addFavorite({ kind: "offering", id: item.id }), "Titulación guardada.", () => setQuery(""))}>Guardar</button>
          </li>)}
          {currentSearch.results.length === 0 && <li className={`${muted} p-2`}>{currentSearch.error ? "Catálogo no disponible." : "Sin coincidencias."}</li>}
          {currentSearch.more && <li className={`${muted} p-2`}>Escribe más para acotar la búsqueda.</li>}
        </ul>}
        <ul className="mt-3 divide-y divide-border">
          {favorites.offerings.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div><Link className="font-medium text-subjects hover:underline" href={item.sourceUrl ?? `/explorar/titulaciones?q=${encodeURIComponent(item.name)}`}>{item.name}</Link>
              <p className={muted}>{item.university}{item.center ? ` · ${item.center}` : ""}</p></div>
            {remove(item.id, item.name)}
          </li>)}
        </ul>
        {favorites.offerings.length === 0 && <p className={muted}>Sin titulaciones guardadas.</p>}
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Asignaturas</h3>
        {favorites.courses.length === 0 && <p className={muted}>Guarda asignaturas desde la ayuda a la decisión de cualquier plan oficial.</p>}
        <ul className="divide-y divide-border">
          {favorites.courses.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div><Link className="font-medium text-subjects hover:underline" href={`${decisionPath(item.planId)}&asignatura=${item.subjectId}`}>{item.name}</Link>
              <p className={muted}>{item.detail}</p></div>
            {remove(item.id, item.name)}
          </li>)}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Destinos de movilidad</h3>
        <form onSubmit={saveDestination} className="space-y-2">
          <label className={`${muted} block`}>Destino<input className={`${field} mt-1`} name="destination" placeholder="Universidad o ciudad" maxLength={120} required /></label>
          <label className={`${muted} block`}>Enlace opcional<input className={`${field} mt-1`} name="url" type="url" placeholder="https://" maxLength={2048} /></label>
          <button type="submit" className={button} disabled={pending}>Añadir destino</button>
        </form>
        <ul className="mt-2 divide-y divide-border">
          {favorites.destinations.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            {item.url ? <a href={item.url} className="break-words font-medium text-subjects hover:underline">{item.name}</a> : <span>{item.name}</span>}
            {remove(item.id, item.name)}
          </li>)}
        </ul>
      </div>
    </div>
    {message && <p role="status" className={muted}>{message}</p>}
  </div>;
}
