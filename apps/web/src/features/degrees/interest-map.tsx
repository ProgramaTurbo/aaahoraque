import { areas, deriveOrientationProfile, type OrientationProfile } from "./orientation-profile";

// Editorial positions for the eight questionnaire areas, independent of the answers.
const positions = {
  technology: [78, 54],
  engineering: [73, 25],
  health: [24, 30],
  science: [71, 77],
  business: [56, 68],
  social: [20, 57],
  humanities: [33, 81],
  arts: [43, 22],
} satisfies Record<(typeof areas)[number][0], [number, number]>;

export function InterestMap({ profile, activeArea, onSelectArea }: {
  profile: OrientationProfile; activeArea?: string; onSelectArea: (area: string) => void;
}) {
  const derived = deriveOrientationProfile(profile);
  const top = new Set(derived.rankedAreas.filter(({ value }) => value > 0).slice(0, 3).map(({ id }) => id));
  const highest = derived.rankedAreas[0]?.value ?? 0;
  const leading = derived.rankedAreas.filter(({ value }) => value > 0 && value === highest);
  return (
    <figure aria-labelledby="interest-map-title" className="info-card info-card-degree select-none space-y-4 p-4 sm:p-7">
      <figcaption>
        <h2 id="interest-map-title" className="font-display text-2xl">Tu mapa de intereses</h2>
        <p className="mt-2 text-sm">El color muestra tu interés declarado por cada área. Esta puntuación es la que utiliza el ranking.</p>
        {leading.length > 0 && <p className="mt-2 text-sm font-semibold">Mayor interés declarado: {leading.map(({ id }) => areas.find(([key]) => key === id)?.[1]).join(" · ")}</p>}
      </figcaption>
      <div className="mx-auto max-w-4xl text-center text-xs sm:text-sm">
        <p className="mb-2 uppercase tracking-wider">Práctica y creación</p>
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center gap-1 sm:grid-cols-[8rem_minmax(0,1fr)_8rem] sm:gap-2">
          <span className="text-right uppercase tracking-wider">Personas</span>
          <div className="relative aspect-square">
            <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox="0 0 100 100">
              {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((line) => (
                <path
                  key={line}
                  d={`M ${line} 3 V 97 M 3 ${line} H 97`}
                  stroke="currentColor"
                  strokeWidth={line === 50 ? 0.35 : 0.2}
                  opacity={line === 50 ? 0.4 : 0.2}
                  fill="none"
                />
              ))}
            </svg>
            {areas.map(([key, label]) => {
              const [x, y] = positions[key];
              const measure = derived.generalInterests[key];
              const score = measure.value;
              const valueLabel = score === null ? measure.state === "unknown" ? "No sabe valorarlo" : "Sin responder" : score + "/100";
              const color = top.has(key) ? "border-green-600 bg-green-500/40"
                : score === null ? "border-dashed border-current/40"
                : score > 25 ? "border-orange-600 bg-orange-500/40"
                : "border-gray-500 bg-gray-400/40";
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activeArea === key}
                  onClick={() => onSelectArea(key)}
                  aria-label={`${label}, ${valueLabel}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className="group absolute grid size-11 cursor-pointer aria-pressed:ring-2 hover:z-10 focus-visible:z-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-offset-2 focus-visible:outline-2"
                >
                  <span aria-hidden="true" className={`size-6 rounded-full border-2 sm:size-8 ${color}`} />
                  <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 hidden w-max max-w-36 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-md group-hover:block group-focus-visible:block">
                    {label} · {valueLabel}
                    <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-left uppercase tracking-wider">Técnica y cálculo</span>
        </div>
        <p className="mt-2 uppercase tracking-wider">Información y análisis</p>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
        <li className="text-green-600 dark:text-green-400">● Tres mayores intereses</li>
        <li className="text-orange-600 dark:text-orange-400">● Otras áreas con interés</li>
        <li className="text-gray-500 dark:text-gray-400">● Interés bajo (hasta 25/100)</li>
        <li>◌ Desconocido / sin responder</li>
      </ul>
      <p className="text-center text-xs">La posición de cada área es orientativa. El resaltado refleja tus preferencias del test.</p>
    </figure>
  );
}
