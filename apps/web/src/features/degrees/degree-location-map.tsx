import type { OrientationProfile } from "./orientation-profile";
import { useState } from "react";
import provinces from "./spain-provinces.json";
import type { DegreeSummary } from "./types";

function provinceKey(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
}

const provinceNames = new Map<string, string>();
for (const { name } of provinces) {
  for (const alias of name.split("/")) provinceNames.set(provinceKey(alias), name);
}
for (const [alias, name] of Object.entries({
  "La Coruña": "A Coruña", "Orense": "Ourense", "Gerona": "Girona", "Lérida": "Lleida",
  "Vizcaya": "Bizkaia", "Guipúzcoa": "Gipuzkoa", "Baleares": "Illes Balears",
})) provinceNames.set(provinceKey(alias), name);

function findProvince(value?: string | null) {
  return value?.split("/").map((name) => provinceNames.get(provinceKey(name))).find(Boolean);
}

const formatDistance = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function provinceDistance(from: string, to: string) {
  const start = provinces.find(({ name }) => name === from);
  const end = provinces.find(({ name }) => name === to);
  if (!start || !end) return undefined;

  const radians = Math.PI / 180;
  const latitudeDelta = (end.latitude - start.latitude) * radians;
  const longitudeDelta = (end.longitude - start.longitude) * radians;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(start.latitude * radians) * Math.cos(end.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function DegreeLocationMap({ offerings, originProvince, mobility, allowedProvinces }: {
  offerings: DegreeSummary[];
  originProvince?: string | null;
  mobility: OrientationProfile["mobility"];
  allowedProvinces: string[];
}) {
  const [selected, setSelected] = useState<string>();
  const origin = findProvince(originProvince);
  const preferredProvinces = new Set(
    (mobility === "prefer_province" || mobility === "require_province"
      ? [origin]
      : allowedProvinces.map(findProvince)).filter((name): name is string => Boolean(name)),
  );
  const hasTerritorialPreference = mobility !== "unknown" && mobility !== "anywhere";
  const canEvaluateMobility = hasTerritorialPreference && preferredProvinces.size > 0;
  const byProvince = new Map<string, DegreeSummary[]>();
  let unmapped = 0;
  for (const offer of offerings) {
    const province = findProvince(offer.province);
    if (!province) {
      unmapped++;
      continue;
    }
    const group = byProvince.get(province) ?? [];
    group.push(offer);
    byProvince.set(province, group);
  }
  const locations = [...new Set([...byProvince.keys(), ...(origin ? [origin] : [])])].sort((a, b) => a.localeCompare(b, "es"));
  const active = selected ?? origin ?? locations[0];
  const distance = origin && active ? provinceDistance(origin, active) : undefined;
  const activeOffers = active ? byProvince.get(active) ?? [] : [];

  return <section aria-labelledby="degree-map-title" className="info-card info-card-degree space-y-4 p-4 sm:p-7">
    <h2 id="degree-map-title" className="font-display text-2xl">Dónde puedes estudiar</h2>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div>
        <svg viewBox="0 0 680 530" className="w-full" aria-hidden="true">
          {provinces.map(({ name, path }) => {
            const isOrigin = name === origin;
            const offers = byProvince.get(name);
            const selectable = isOrigin || Boolean(offers);
            const mobilityFill = canEvaluateMobility
              ? preferredProvinces.has(name) ? "fill-green-500" : "fill-yellow-400"
              : "fill-[var(--color-degree-bright)]";
            const fill = offers ? mobilityFill : "fill-current/10";
            const stroke = name === active ? "stroke-current" : "stroke-[var(--color-bg-card)]";
            return <path key={name} d={path} fillRule="evenodd" strokeWidth={name === active ? 2 : 0.8}
              className={`${fill} ${stroke} ${selectable ? "cursor-pointer hover:opacity-70" : ""}`}
              onClick={selectable ? () => setSelected(name) : undefined}>
              <title>{name}{isOrigin ? " · Tu provincia" : ""}{offers ? ` · ${offers.length} ofertas` : ""}</title>
            </path>;
          })}
          {origin && (() => {
            const province = provinces.find(({ name }) => name === origin);
            if (!province) return null;
            const isCanary = origin === "Las Palmas" || origin === "Santa Cruz de Tenerife";
            const x = isCanary ? 18 + (province.longitude + 18.3) * 24 : 20 + (province.longitude + 9.7) * 46;
            const y = isCanary ? 405 + (29.6 - province.latitude) * 29 : 16 + (44.1 - province.latitude) * 59;
            return <circle cx={x} cy={y} r={5} className="pointer-events-none fill-current stroke-[var(--color-bg-card)]" strokeWidth={2} />;
          })()}
          <text x="18" y="517" fill="currentColor" fontSize="15">Canarias</text>
        </svg>
        <p className="flex flex-wrap gap-4 text-sm">
          {canEvaluateMobility ? <>
            <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-green-500" />Dentro de tu zona elegida</span>
            <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-yellow-400" />Otras ubicaciones</span>
          </> : <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm bg-[var(--color-degree-bright)]" />Provincias con ofertas</span>}
          {origin && <span><span aria-hidden="true" className="mr-1 inline-block size-3 rounded-full bg-current" />Tu provincia · {origin}</span>}
        </p>
      </div>
      <div className="space-y-3">
        {locations.length > 0 && <label className="block text-sm font-medium">
          Consulta una provincia
          <select value={active} onChange={(event) => setSelected(event.target.value)}
            className="mt-2 block w-full border border-[var(--color-border)] bg-[var(--color-bg-card)] p-2">
            {locations.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>}
    {active && <section aria-labelledby="province-data-title" className="space-y-4 border-t border-[var(--color-border)] pt-4">
      <h3 id="province-data-title" className="text-lg font-semibold">Datos académicos · {active}{distance !== undefined && <span className="text-sm font-normal">{" "}(a {formatDistance.format(distance)} km de {origin}, en línea recta)</span>}</h3>
      {activeOffers.length > 0 ? <ul className="max-h-[32rem] space-y-3 overflow-y-auto">
        {activeOffers.map((offer) => (
          <li key={offer.id} className="space-y-1 border-b border-[var(--color-border)] py-3 text-sm">
            <p className="font-semibold">{offer.degree.name} · {offer.university.name}</p>
          </li>
        ))}
      </ul> : <p className="text-sm">El catálogo no recoge ofertas de estos grados en esta provincia.</p>}
    </section>}
        {unmapped > 0 && <p className="text-sm">{unmapped} {unmapped === 1 ? "oferta sin provincia identificada" : "ofertas sin provincia identificada"}.</p>}
      </div>
    </div>
    <a href="https://centrodedescargas.cnig.es/CentroDescargas/limites-municipales-provinciales-autonomicos" className="text-xs underline">
      Obra derivada de BDLJE · IGN España · CC BY 4.0
    </a>
  </section>;
}
