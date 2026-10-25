import Link from "next/link";
import { getSyntheticPerformance } from "@/lib/data/performance";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("es-ES");

export default async function PerformancePage() {
  const { summary, difficultSubjects, methodology } =
    await getSyntheticPerformance();

  const indicators = [
    {
      title: "Resultados analizados",
      value: number.format(summary.total),
    },
    {
      title: "Estudiantes simulados",
      value: number.format(summary.students),
    },
    {
      title: "Nota media",
      value: `${summary.averageGrade.toFixed(2)} / 10`,
    },
    {
      title: "Tasa de aprobados",
      value: `${summary.passRate.toFixed(2)} %`,
    },
  ];

  return (
    <main className="space-y-10 pb-16">
      <header className="space-y-4">
        <Link
          href="/data"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← Laboratorio de datos
        </Link>

        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Análisis académico · Simulación
        </p>

        <h1 className="text-4xl font-bold tracking-tight">
          Rendimiento académico
        </h1>

        <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
          Exploramos los resultados sintéticos para desarrollar modelos
          de análisis y orientación académica.
        </p>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Todos los resultados de esta página son artificiales. No
          representan estadísticas oficiales ni notas de estudiantes reales.
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicators.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-500">{item.title}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Resultados aprobados</p>
          <p className="mt-2 text-3xl font-bold">
            {number.format(summary.passed)}
          </p>
        </article>

        <article className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">Resultados suspensos</p>
          <p className="mt-2 text-3xl font-bold">
            {number.format(summary.failed)}
          </p>
        </article>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold">
            Asignaturas con menor tasa de aprobados
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Ordenadas por rendimiento simulado. Mínimo de{" "}
            {methodology.minimumSamples} observaciones por asignatura.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-900">
              <tr>
                <th className="p-4">Asignatura</th>
                <th className="p-4 text-right">Muestras</th>
                <th className="p-4 text-right">Nota media</th>
                <th className="p-4 text-right">Aprobados</th>
              </tr>
            </thead>

            <tbody>
              {difficultSubjects.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-right">
                    {number.format(item.samples)}
                  </td>
                  <td className="p-4 text-right">
                    {item.averageGrade.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-semibold">
                    {item.passRate.toFixed(2)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {difficultSubjects.length === 0 && (
            <p className="p-6 text-sm text-zinc-500">
              No existen asignaturas que cumplan el tamaño mínimo
              de muestra establecido.
            </p>
          )}
        </div>
      </section>

      <footer className="text-sm text-zinc-500">
        Criterio: {methodology.criterion}. {methodology.disclaimer}
      </footer>
    </main>
  );
}
