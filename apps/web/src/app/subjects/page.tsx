import DecisionDashboard from "@/features/subjects/decision-dashboard";

const sections = [
  {
    number: "01",
    title: "Descubre tu perfil",
    description:
      "Actividades y preguntas para identificar intereses, objetivos y preferencias de aprendizaje.",
    detail: "Recogida de información",
  },
  {
    number: "02",
    title: "Explora tus alternativas",
    description:
      "Consulta asignaturas, especializaciones y las restricciones académicas de tu plan.",
    detail: "Catálogo y viabilidad",
  },
  {
    number: "03",
    title: "Compara y comprende",
    description:
      "Analiza el rendimiento de cada alternativa según criterios académicos, profesionales y personales.",
    detail: "Evaluación multicriterio",
  },
  {
    number: "04",
    title: "Experimenta con escenarios",
    description:
      "Modifica prioridades y descubre cómo cambian las comparaciones y la estabilidad de los resultados.",
    detail: "Sensibilidad y simulación",
  },
];

export default function SubjectsPage() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-500">
          SUBJECTS DECISION · DASHBOARD ACADÉMICO
        </p>

        <h1 className="text-4xl font-bold tracking-tight">
          Tu mapa académico
        </h1>

        <p className="max-w-3xl text-lg text-zinc-600 dark:text-zinc-400">
          No se trata de encontrar una asignatura ganadora.
          Se trata de comprender qué alternativas tienes,
          qué te aporta cada una y cómo encajan en tu futuro.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Perfil del estudiante", "Pendiente de completar"],
          ["Situación académica", "Pendiente de vincular"],
          ["Última evaluación", "Sin análisis guardado"],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-3 font-semibold">{value}</p>
          </article>
        ))}
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">
            Tu proceso de decisión
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Cada etapa aporta información para analizar tus alternativas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.number}
              className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <p className="text-sm font-semibold text-zinc-500">
                {section.number}
              </p>

              <h3 className="mt-4 text-xl font-semibold">
                {section.title}
              </h3>

              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {section.description}
              </p>

              <p className="mt-6 text-xs text-zinc-500">
                {section.detail} · Próxima implementación
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <h2 className="text-xl font-semibold">
          Laboratorio de decisión
        </h2>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Aquí integraremos las gráficas comparativas, la ponderación
          interactiva de criterios, los compromisos entre alternativas,
          la sensibilidad y los escenarios calculados por FastAPI.
        </p>

        <p className="mt-4 text-xs text-zinc-500">
          Todavía no se muestran resultados: falta vincular el perfil
          y una evaluación real del motor.
        </p>
      </div>
      <DecisionDashboard />
    </section>
  );
}
