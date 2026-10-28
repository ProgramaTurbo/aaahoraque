import Link from "next/link";

import { getDataStats } from "@/lib/data/stats";

export const dynamic = "force-dynamic";

const formatter = new Intl.NumberFormat("es-ES");

export default async function DataPage() {
  const stats = await getDataStats();

  const catalog = [
    { label: "Universidades", value: stats.universities },
    { label: "Centros académicos", value: stats.centers },
    { label: "Titulaciones", value: stats.degrees },
    { label: "Ofertas académicas", value: stats.offerings },
  ];

  const academic = [
    { label: "Planes de estudio", value: stats.plans },
    { label: "Asignaturas", value: stats.subjects },
  ];

  const synthetic = [
    { label: "Estudiantes sintéticos", value: stats.students },
    { label: "Resultados sintéticos", value: stats.results },
  ];

  function renderCards(items: typeof catalog) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {formatter.format(item.value)}
            </p>
          </article>
        ))}
      </div>
    );
  }

  return (
    <main className="space-y-12 pb-16">
      <header className="space-y-5">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          ← Volver a AAAhoraQue
        </Link>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Laboratorio de datos
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Explorador académico
          </h1>

          <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
            Consulta el universo de información que utilizamos para
            orientar las decisiones académicas. Estas estadísticas se
            recuperan directamente de PostgreSQL.
          </p>
        </div>
      </header>

      <Link
        href="/data/catalog"
        className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-6 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <div>
          <h2 className="text-xl font-semibold">Explorador académico</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Busca titulaciones, universidades y centros del catálogo.
          </p>
        </div>
        <span className="text-2xl">→</span>
      </Link>

      <Link
        href="/data/performance"
        className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-6 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <div>
          <h2 className="text-xl font-semibold">Rendimiento simulado</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Explora estadísticas agregadas de los expedientes sintéticos.
          </p>
        </div>
        <span className="text-2xl">→</span>
      </Link>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Catálogo universitario</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Información importada de ISTAC y QEDU, con registros
            provisionales y de demostración.
          </p>
        </div>
        {renderCards(catalog)}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Estructura académica</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Incluye planes y asignaturas generados sintéticamente
            para desarrollar el sistema.
          </p>
        </div>
        {renderCards(academic)}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">Simulación académica</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Datos completamente artificiales. No representan
            estudiantes reales ni estadísticas oficiales de rendimiento.
          </p>
        </div>
        {renderCards(synthetic)}
      </section>

      <footer className="rounded-2xl border border-zinc-200 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <strong className="text-zinc-900 dark:text-white">
          Procedencia de los datos.
        </strong>{" "}
        Distinguimos el catálogo importado de los conjuntos sintéticos
        utilizados para diseñar, probar y evaluar nuestro sistema de
        ayuda a la toma de decisiones.
      </footer>
    </main>
  );
}
