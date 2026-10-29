
"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

type Destino = {
  id: number;
  ciudad: string;
  pais: string;
  universidad: string;
  coste: number;
  ects: number;
  idioma: string;
  nivel: string;
  motivo: string;
};

const destinos: Destino[] = [
  {
    id: 1,
    ciudad: "Cracovia",
    pais: "Polonia",
    universidad: "Universidad de Cracovia",
    coste: 350,
    ects: 24,
    idioma: "Inglés",
    nivel: "B1",
    motivo: "La opción más económica.",
  },
  {
    id: 2,
    ciudad: "Coímbra",
    pais: "Portugal",
    universidad: "Universidad de Coímbra",
    coste: 450,
    ects: 27,
    idioma: "Inglés",
    nivel: "B2",
    motivo: "Buen equilibrio entre coste y estudios.",
  },
  {
    id: 3,
    ciudad: "Bolonia",
    pais: "Italia",
    universidad: "Universidad de Bolonia",
    coste: 750,
    ects: 30,
    idioma: "Inglés",
    nivel: "B2",
    motivo: "La opción con más ECTS reconocibles.",
  },
];

export default function ErasmusPage() {
  const [presupuesto, setPresupuesto] = useState(600);
  const [nivelIngles, setNivelIngles] = useState("B1");
  const [ects, setEcts] = useState(30);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [destinoElegido, setDestinoElegido] = useState<number | null>(
    null
  );

  const niveles = ["A1", "A2", "B1", "B2", "C1", "C2"];

  function cumpleIdioma(nivelRequerido: string) {
    return (
      niveles.indexOf(nivelIngles) >=
      niveles.indexOf(nivelRequerido)
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Erasmus · Apoyo a la decisión
        </p>

        <h1 className="text-4xl font-bold tracking-tight">
          Encuentra tu destino Erasmus
        </h1>

        <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
          Cuéntanos qué necesitas y te ayudaremos a comparar
          destinos. La decisión final siempre será tuya.
        </p>
      </header>

      <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <h2 className="text-2xl font-semibold">
            1. Tu perfil
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Completa estos datos para explorar tus opciones.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <label className="space-y-2">
            <span className="block text-sm font-medium">
              Presupuesto mensual (€)
            </span>
            <input
              type="number"
              min="0"
              value={presupuesto}
              onChange={(e) =>
                setPresupuesto(Number(e.target.value))
              }
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium">
              Nivel de inglés
            </span>
            <select
              value={nivelIngles}
              onChange={(e) => setNivelIngles(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {niveles.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivel}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium">
              ECTS que quieres reconocer
            </span>
            <input
              type="number"
              min="1"
              max="60"
              value={ects}
              onChange={(e) => setEcts(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            setMostrarResultados(true);
            setDestinoElegido(null);
          }}
          className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Ver mis opciones Erasmus
        </button>
      </section>

      {mostrarResultados && (
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">
              2. Tus tres alternativas
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Compara sus ventajas e inconvenientes antes de elegir.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {destinos.map((destino) => {
              const idiomaValido = cumpleIdioma(destino.nivel);
              const dentroPresupuesto =
                destino.coste <= presupuesto;
              const ectsSuficientes = destino.ects >= ects;
              const compatibilidadAcademica =
                ects > 0
                  ? Math.min(100, (destino.ects / ects) * 100)
                  : 0;
              const seleccionado =
                destinoElegido === destino.id;

              return (
                <article
                  key={destino.id}
                  className={`flex flex-col rounded-2xl border p-6 shadow-sm transition ${seleccionado
                    ? "border-blue-600 ring-2 ring-blue-600"
                    : "border-zinc-200 dark:border-zinc-800"
                    }`}
                >
                  <p className="text-sm text-zinc-500">
                    {destino.pais}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {destino.ciudad}
                  </h3>

                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {destino.universidad}
                  </p>

                  <p className="mt-5 rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {destino.motivo}
                  </p>

                  <dl className="mt-6 space-y-4 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt>Coste mensual neto</dt>
                      <dd className="font-semibold">
                        {destino.coste} €
                      </dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt>ECTS reconocibles</dt>
                      <dd className="font-semibold">
                        {destino.ects}
                      </dd>
                    </div>

                    <div className="flex justify-between gap-3">
                      <dt>Idioma requerido</dt>
                      <dd className="font-semibold">
                        {destino.idioma} {destino.nivel}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Compatibilidad académica</dt>
                      <dd className="font-semibold">
                        {compatibilidadAcademica.toFixed(0)} %
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 space-y-2 text-sm">
                    <p
                      className={
                        idiomaValido
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400"
                      }
                    >
                      {idiomaValido
                        ? "✓ Cumples el requisito de idioma"
                        : "⚠ Necesitas mejorar tu idioma"}
                    </p>

                    {!dentroPresupuesto && (
                      <p className="text-amber-700 dark:text-amber-400">
                        ⚠ Supera tu presupuesto mensual
                      </p>
                    )}

                    {!ectsSuficientes && (
                      <p className="text-amber-700 dark:text-amber-400">
                        ⚠ No alcanza todos tus ECTS deseados
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-8">
                    <button
                      type="button"
                      onClick={() =>
                        setDestinoElegido(destino.id)
                      }
                      className={`w-full rounded-xl px-4 py-3 font-semibold transition ${seleccionado
                        ? "bg-green-600 text-white"
                        : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                        }`}
                    >
                      {seleccionado
                        ? "✓ Destino seleccionado"
                        : "Elegir este destino"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {destinoElegido !== null && (
            <div className="rounded-xl border border-green-300 bg-green-50 p-5 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
              <h3 className="font-semibold">
                Has seleccionado{" "}
                {
                  destinos.find(
                    (d) => d.id === destinoElegido
                  )?.ciudad
                }
              </h3>
              <p className="mt-1 text-sm">
                Esta elección es provisional y puedes cambiarla
                cuando quieras.
              </p>
            </div>
          )}

          {/* GRÁFICOS COMPARATIVOS */}
          <div className="mt-10 space-y-8">
            <div>
              <h2 className="text-2xl font-semibold">
                3. Comparación visual de destinos
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Analiza los indicadores de tus tres alternativas.
              </p>
            </div>

            {/* GRÁFICO 1: BARRAS VERTICALES */}
            <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="mb-2 text-xl font-semibold">
                Coste mensual neto
              </h3>
              <p className="mb-6 text-sm text-zinc-500">
                Compara cuánto cuesta vivir en cada destino.
              </p>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={destinos.map((d) => ({
                      ciudad: d.ciudad,
                      coste: d.coste,
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ciudad" />
                    <YAxis unit=" €" />
                    <Tooltip
                      formatter={(value) => [`${value} €`, "Coste mensual"]}
                    />
                    <Bar
                      dataKey="coste"
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="mt-3 text-sm text-zinc-500">
                Cuanto menor sea la barra, más económico es el destino.
              </p>
            </div>

            {/* GRÁFICO 2: CÍRCULOS DE COMPATIBILIDAD */}
            <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="mb-2 text-xl font-semibold">
                Compatibilidad académica
              </h3>
              <p className="mb-6 text-sm text-zinc-500">
                Porcentaje de tus ECTS deseados que podrías reconocer.
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                {destinos.map((destino) => {
                  const reconocibles =
                    ects > 0 ? Math.min(destino.ects, ects) : 0;

                  const pendientes =
                    ects > 0 ? Math.max(ects - destino.ects, 0) : 0;

                  const porcentaje =
                    ects > 0 ? (reconocibles / ects) * 100 : 0;

                  const datosCirculo = [
                    { name: "Reconocibles", value: reconocibles },
                    { name: "Pendientes", value: pendientes },
                  ];

                  return (
                    <div
                      key={destino.id}
                      className="rounded-xl bg-zinc-50 p-4 text-center dark:bg-zinc-900"
                    >
                      <h4 className="font-semibold">{destino.ciudad}</h4>

                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={datosCirculo}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={75}
                              paddingAngle={pendientes > 0 ? 2 : 0}
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#e5e7eb" />
                            </Pie>

                            <Tooltip
                              formatter={(value) => [`${value} ECTS`]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <p className="text-3xl font-bold text-emerald-600">
                        {porcentaje.toFixed(0)} %
                      </p>

                      <p className="mt-1 text-sm text-zinc-500">
                        {reconocibles} de {ects} ECTS
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-6 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  ECTS reconocibles
                </span>

                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-zinc-300" />
                  ECTS pendientes
                </span>
              </div>
            </div>


            {/* GRÁFICO 3: MARGEN PRESUPUESTARIO */}
            <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
              <h3 className="mb-2 text-xl font-semibold">
                ¿Cuánto dinero te sobra o te falta?
              </h3>

              <p className="mb-6 text-sm text-zinc-500">
                Comparación del coste de cada destino con tu presupuesto
                mensual de {presupuesto} €.
              </p>

              <div className="space-y-7">
                {destinos.map((destino) => {
                  const margen = presupuesto - destino.coste;

                  const margenMaximo = Math.max(
                    ...destinos.map((d) =>
                      Math.abs(presupuesto - d.coste)
                    ),
                    1
                  );

                  const porcentaje =
                    (Math.abs(margen) / margenMaximo) * 100;

                  return (
                    <div key={destino.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {destino.ciudad}
                        </span>

                        <span
                          className={`font-bold ${margen >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                            }`}
                        >
                          {margen > 0 ? "+" : ""}
                          {margen} €/mes
                        </span>
                      </div>

                      {/* Barras a ambos lados del cero */}
                      <div className="flex h-7 items-stretch gap-1">
                        {/* Lado izquierdo: déficit */}
                        <div className="flex w-1/2 justify-end overflow-hidden rounded-l-lg bg-zinc-100 dark:bg-zinc-800">
                          {margen < 0 && (
                            <div
                              className="h-full rounded-l-lg bg-red-500 transition-all duration-500"
                              style={{ width: `${porcentaje}%` }}
                            />
                          )}
                        </div>

                        {/* Línea central: cero */}
                        <div className="w-0.5 shrink-0 bg-zinc-500" />

                        {/* Lado derecho: dinero sobrante */}
                        <div className="w-1/2 overflow-hidden rounded-r-lg bg-zinc-100 dark:bg-zinc-800">
                          {margen > 0 && (
                            <div
                              className="h-full rounded-r-lg bg-emerald-500 transition-all duration-500"
                              style={{ width: `${porcentaje}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Falta dinero
                </span>

                <span className="text-zinc-500">0 €</span>

                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  Sobra dinero
                </span>
              </div>

              <p className="mt-5 text-xs text-zinc-500">
                Las barras representan la diferencia entre tu presupuesto
                mensual y el coste estimado de cada destino. La escala se
                ajusta al mayor margen absoluto mostrado.
              </p>
            </div>
          </div>
        </section>
      )}

      <p className="text-xs text-zinc-500">
        Prototipo con destinos y datos ficticios. Todavía no
        está conectado al motor de recomendaciones.
      </p>
    </main>
  );
}
