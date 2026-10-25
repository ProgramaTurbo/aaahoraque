import Link from "next/link";
import { AcademicState } from "@/features/subjects/academic-state";
import { DecisionPreferences } from "@/features/subjects/decision-preferences";

import {
  getSubjectUniversities,
  getSubjectPlans,
  getPlanSubjects,
} from "@/lib/subjects/catalog";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  university?: string;
  plan?: string;
}>;

const formatNumber = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

function subjectTypeLabel(type: string | null) {
  const labels: Record<string, string> = {
    mandatory: "Obligatoria",
    optional: "Optativa",
    basic: "Formación básica",
    internship: "Prácticas",
    final_project: "Trabajo final",
  };

  return type ? labels[type] ?? type : "Sin clasificar";
}

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const universities = await getSubjectUniversities();

  const selectedUniversity = universities.find(
    (university) => university.id === params.university
  );

  const plans = selectedUniversity
    ? await getSubjectPlans(selectedUniversity.id)
    : [];

  const selectedPlan = plans.find(
    (plan) => plan.id === params.plan
  );

  const subjects = selectedPlan
    ? await getPlanSubjects(selectedPlan.id)
    : [];

  const totalSubjectEcts = subjects.reduce(
    (total, subject) => total + subject.ects,
    0
  );

  return (
    <main className="space-y-10 pb-16">
      <header className="space-y-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← AAAhoraQue
        </Link>

        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Tu decisión académica
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Tu mapa académico
        </h1>

        <p className="max-w-3xl text-lg text-zinc-600 dark:text-zinc-400">
          Empieza por situarte en tu plan de estudios. A partir de sus
          asignaturas podremos explorar tus posibilidades y comparar
          caminos que encajen con tus objetivos.
        </p>
      </header>

      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-zinc-500">
            01 / Contexto académico
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            ¿Dónde estás estudiando?
          </h2>
        </div>

        <form
          action="/subjects"
          method="GET"
          className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
        >
          <label
            htmlFor="university"
            className="block font-medium"
          >
            Universidad
          </label>

          <select
            id="university"
            name="university"
            required
            defaultValue={selectedUniversity?.id ?? ""}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          >
            <option value="" disabled>
              Selecciona tu universidad
            </option>

            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-white dark:text-zinc-900"
          >
            Continuar →
          </button>
        </form>
      </section>

      {selectedUniversity && (
        <section className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-zinc-500">
              02 / Titulación
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              ¿Cuál es tu plan de estudios?
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              {selectedUniversity.name}
            </p>
          </div>

          <form
            action="/subjects"
            method="GET"
            className="space-y-4 rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <input
              type="hidden"
              name="university"
              value={selectedUniversity.id}
            />

            <label htmlFor="plan" className="block font-medium">
              Titulación y plan
            </label>

            <select
              id="plan"
              name="plan"
              required
              defaultValue={selectedPlan?.id ?? ""}
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            >
              <option value="" disabled>
                Selecciona tu titulación
              </option>

              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.degreeName}
                  {plan.centerName ? ` · ${plan.centerName}` : ""}
                  {` · ${plan.planName}`}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-white dark:text-zinc-900"
            >
              Explorar plan →
            </button>
          </form>
        </section>
      )}

      {selectedPlan && (
        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-zinc-500">
              03 / Tu plan académico
            </p>

            <h2 className="text-2xl font-semibold">
              {selectedPlan.degreeName}
            </h2>

            <p className="text-zinc-600 dark:text-zinc-400">
              {selectedPlan.planName}
              {selectedPlan.centerName
                ? ` · ${selectedPlan.centerName}`
                : ""}
            </p>
          </div>

          {selectedPlan.status === "synthetic" && (
            <p className="text-xs text-zinc-500">
              La estructura de asignaturas de este plan se ha generado
              para el modelo académico de AAAhoraQue y puede diferir
              de la guía docente oficial.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Asignaturas disponibles",
                value: subjects.length.toString(),
              },
              {
                label: "Créditos del plan",
                value: `${formatNumber.format(selectedPlan.totalEcts)} ECTS`,
              },
              {
                label: "Créditos ofertados",
                value: `${formatNumber.format(totalSubjectEcts)} ECTS`,
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
              >
                <p className="text-sm text-zinc-500">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-bold">
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold">
              Asignaturas de tu plan
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="bg-zinc-100 dark:bg-zinc-900">
                  <tr>
                    <th className="p-4">Asignatura</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Curso</th>
                    <th className="p-4 text-right">ECTS</th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <td className="p-4 font-medium">
                        {subject.name}
                      </td>
                      <td className="p-4 text-zinc-500">
                        {subjectTypeLabel(subject.type)}
                      </td>
                      <td className="p-4 text-right">
                        {subject.year ?? "—"}
                      </td>
                      <td className="p-4 text-right">
                        {formatNumber.format(subject.ects)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AcademicState
            planId={selectedPlan.id}
            subjects={subjects}
            isSynthetic={selectedPlan.status === "synthetic"}
          />

          <DecisionPreferences planId={selectedPlan.id} />
        </section>
      )}
    </main>
  );
}
