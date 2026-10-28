"use client";

import { useEffect, useState } from "react";

type Subject = {
  id: string;
  name: string;
  ects: number;
  year: number | null;
  type: string | null;
};

type Props = {
  planId: string;
  subjects: Subject[];
  isSynthetic: boolean;
};

const formatter = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 2,
});

export function AcademicState({
  planId,
  subjects,
  isSynthetic,
}: Props) {
  const storageKey = `aaahoraque:academic-state:${planId}`;

  const [completed, setCompleted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed: unknown = saved ? JSON.parse(saved) : [];

      const validIds = new Set(subjects.map((subject) => subject.id));

      const restored = Array.isArray(parsed)
        ? parsed.filter(
            (id): id is string =>
              typeof id === "string" && validIds.has(id)
          )
        : [];

      setCompleted([...new Set(restored)]);
    } catch {
      setCompleted([]);
    }

    setLoaded(true);
  }, [storageKey, subjects]);

  function toggleSubject(id: string) {
    const next = completed.includes(id)
      ? completed.filter((item) => item !== id)
      : [...completed, id];

    setCompleted(next);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // El almacenamiento local puede estar deshabilitado.
    }
  }

  const earnedCredits = subjects
    .filter((subject) => completed.includes(subject.id))
    .reduce((total, subject) => total + subject.ects, 0);

  const completedCount = completed.length;

  const grouped = [...new Set(subjects.map((subject) => subject.year))]
    .sort((a, b) => (a ?? 99) - (b ?? 99));

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-zinc-500">
          04 / Mi situación académica
        </p>

        <h2 className="text-2xl font-semibold">
          ¿Qué asignaturas has superado?
        </h2>

        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Selecciona únicamente las asignaturas que hayas aprobado.
          Los créditos obtenidos se calculan a partir de tu selección.
        </p>

        {isSynthetic && (
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Catálogo generado mediante simulación académica. Esta
            selección sirve para preparar tu perfil, pero no equivale
            a una comprobación oficial de tu expediente.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Asignaturas marcadas como superadas
          </p>
          <p className="mt-3 text-3xl font-bold">
            {loaded ? completedCount : "—"}
          </p>
        </article>

        <article className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Créditos declarados como superados
          </p>
          <p className="mt-3 text-3xl font-bold">
            {loaded ? `${formatter.format(earnedCredits)} ECTS` : "—"}
          </p>
        </article>
      </div>

      {!loaded ? (
        <p className="text-sm text-zinc-500">
          Recuperando tu selección...
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((year) => (
            <div
              key={year ?? "unknown"}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <h3 className="bg-zinc-100 px-5 py-4 font-semibold dark:bg-zinc-900">
                {year === null ? "Curso no especificado" : `${year}.º curso`}
              </h3>

              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {subjects
                  .filter((subject) => subject.year === year)
                  .map((subject) => (
                    <label
                      key={subject.id}
                      className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    >
                      <input
                        type="checkbox"
                        checked={completed.includes(subject.id)}
                        onChange={() => toggleSubject(subject.id)}
                        className="h-4 w-4 accent-zinc-900"
                      />

                      <span className="min-w-0 flex-1 font-medium">
                        {subject.name}
                      </span>

                      <span className="shrink-0 text-sm text-zinc-500">
                        {formatter.format(subject.ects)} ECTS
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Tu selección se conserva en este navegador para este plan de
        estudios. No se ha contrastado con los registros de tu universidad.
      </p>
    </section>
  );
}
