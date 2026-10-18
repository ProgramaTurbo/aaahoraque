import Link from "next/link";

const decisions = [
  {
    href: "/degrees",
    title: "¿Qué estudiar?",
    description: "Explora tus intereses y descubre qué caminos académicos puedes seguir.",
    note: "El universo creativo de Alejandra.",
  },
  {
    href: "/erasmus",
    title: "¿Dónde hacer Erasmus?",
    description: "Compara destinos, experiencias y oportunidades internacionales.",
    note: "Pasaporte en manos de Ángela.",
  },
  {
    href: "/subjects",
    title: "¿Qué asignaturas escoger?",
    description: "Analiza tus alternativas y construye tu propio camino académico.",
    note: "Laboratorio de decisiones.",
  },
];

export default function Home() {
  return (
    <section className="space-y-10">
      <div className="space-y-4">
        <p className="text-sm font-medium text-zinc-500">
          SISTEMA DE AYUDA A LA TOMA DE DECISIONES
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          ¿Y ahora qué?
        </h1>

        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Hay decisiones que merecen algo más que una respuesta.
          Explora tus posibilidades, compara alternativas y encuentra
          tus propios motivos para elegir.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {decisions.map((decision) => (
          <Link
            key={decision.href}
            href={decision.href}
            className="flex flex-col gap-5 rounded-xl border border-zinc-200 p-6 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <h2 className="text-xl font-semibold">{decision.title}</h2>

            <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">
              {decision.description}
            </p>

            <span className="text-xs text-zinc-500">{decision.note}</span>

            <span className="text-sm font-semibold">
              Explorar →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
