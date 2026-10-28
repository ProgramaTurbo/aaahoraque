"use client";

import { useEffect, useState } from "react";

type Field =
  | "theory_preference"
  | "practice_preference"
  | "project_preference"
  | "teamwork_preference"
  | "difficulty_tolerance"
  | "workload_tolerance"
  | "academic_affinity"
  | "professional_alignment"
  | "learning_compatibility"
  | "effort_compatibility";

type Preferences = Record<Field, number | null>;

type Props = {
  planId: string;
};

const initialPreferences: Preferences = {
  theory_preference: null,
  practice_preference: null,
  project_preference: null,
  teamwork_preference: null,
  difficulty_tolerance: null,
  workload_tolerance: null,
  academic_affinity: null,
  professional_alignment: null,
  learning_compatibility: null,
  effort_compatibility: null,
};

const learningFields = [
  {
    key: "theory_preference",
    label: "Aprendizaje teórico",
    description: "Interés por los fundamentos y conceptos.",
  },
  {
    key: "practice_preference",
    label: "Aprendizaje práctico",
    description: "Preferencia por aplicar conocimientos mediante ejercicios.",
  },
  {
    key: "project_preference",
    label: "Trabajo por proyectos",
    description: "Interés por desarrollar soluciones o productos completos.",
  },
  {
    key: "teamwork_preference",
    label: "Trabajo en equipo",
    description: "Preferencia por colaborar con otras personas.",
  },
  {
    key: "difficulty_tolerance",
    label: "Exigencia académica asumible",
    description: "Nivel de dificultad que estás dispuesto a afrontar.",
  },
  {
    key: "workload_tolerance",
    label: "Carga de trabajo asumible",
    description: "Dedicación que consideras compatible con tu situación.",
  },
] as const;

const priorityFields = [
  {
    key: "academic_affinity",
    label: "Afinidad académica",
    description: "Cuánto te interesa el contenido de la asignatura.",
  },
  {
    key: "professional_alignment",
    label: "Alineación profesional",
    description: "Su relación con el futuro profesional que buscas.",
  },
  {
    key: "learning_compatibility",
    label: "Compatibilidad de aprendizaje",
    description: "Cómo encaja con tus preferencias de aprendizaje.",
  },
  {
    key: "effort_compatibility",
    label: "Compatibilidad con el esfuerzo",
    description: "Cómo encaja con la exigencia que puedes asumir.",
  },
] as const;

const allFields = [
  ...learningFields.map((field) => field.key),
  ...priorityFields.map((field) => field.key),
];

function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}

export function DecisionPreferences({ planId }: Props) {
  const storageKey = `aaahoraque:decision-preferences:${planId}`;

  const [preferences, setPreferences] =
    useState<Preferences>(initialPreferences);

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);

    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;

      const restored: Preferences = { ...initialPreferences };

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const values = parsed as Record<string, unknown>;

        for (const key of allFields) {
          if (isValidScore(values[key])) {
            restored[key] = values[key];
          }
        }
      }

      setPreferences(restored);
    } catch {
      setPreferences({ ...initialPreferences });
    }

    setLoaded(true);
  }, [storageKey]);

  function updatePreference(field: Field, value: number | null) {
    const next = {
      ...preferences,
      [field]: value,
    };

    setPreferences(next);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // El navegador puede restringir el almacenamiento local.
    }
  }

  const completed = allFields.filter(
    (key) => preferences[key] !== null
  ).length;

  const priorityTotal = priorityFields.reduce(
    (total, field) => total + (preferences[field.key] ?? 0),
    0
  );

  const prioritiesComplete = priorityFields.every(
    (field) => preferences[field.key] !== null
  );

  function renderField(
    field: {
      key: Field;
      label: string;
      description: string;
    }
  ) {
    return (
      <label
        key={field.key}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="space-y-1">
          <span className="block font-medium">{field.label}</span>

          <span className="block text-sm text-zinc-500">
            {field.description}
          </span>
        </span>

        <select
          value={preferences[field.key] ?? ""}
          onChange={(event) => {
            updatePreference(
              field.key,
              event.target.value === ""
                ? null
                : Number(event.target.value)
            );
          }}
          className="min-w-36 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        >
          <option value="">Sin indicar</option>

          {Array.from({ length: 11 }, (_, index) => (
            <option key={index} value={index}>
              {index} / 10
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-zinc-500">
          05 / Configura tu decisión
        </p>

        <h2 className="text-2xl font-semibold">
          ¿Qué es importante para ti?
        </h2>

        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Define tus preferencias personales. No existen respuestas
          correctas: necesitamos comprender qué esperas de las
          asignaturas para comparar alternativas según tus prioridades.
        </p>
      </header>

      {!loaded ? (
        <p className="text-sm text-zinc-500">
          Recuperando tus preferencias...
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              Preferencias cumplimentadas
            </p>

            <p className="mt-2 text-2xl font-bold">
              {completed} / {allFields.length}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">
                Tu forma de aprender y tu disponibilidad
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Utiliza una escala del 0 al 10. Cero expresa el nivel
                mínimo y diez el máximo.
              </p>
            </div>

            <div className="grid gap-3">
              {learningFields.map(renderField)}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">
                Importancia de cada criterio
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Estas puntuaciones representan pesos relativos:
                no es necesario que sumen diez ni cien.
              </p>
            </div>

            <div className="grid gap-3">
              {priorityFields.map(renderField)}
            </div>

            {prioritiesComplete && priorityTotal > 0 && (
              <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
                <h4 className="font-semibold">
                  Distribución normalizada de tus prioridades
                </h4>

                <div className="mt-4 space-y-3">
                  {priorityFields.map((field) => {
                    const percentage =
                      ((preferences[field.key] ?? 0) /
                        priorityTotal) *
                      100;

                    return (
                      <div
                        key={field.key}
                        className="flex justify-between gap-4 text-sm"
                      >
                        <span>{field.label}</span>

                        <strong>{percentage.toFixed(1)} %</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {prioritiesComplete && priorityTotal === 0 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Has indicado cero en todos los criterios.
                Para establecer tus prioridades, asigna
                un valor positivo al menos a uno de ellos.
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500">
            Tus respuestas se conservan en este navegador y están
            asociadas al plan seleccionado. Son preferencias
            declaradas por ti, no inferidas de expedientes académicos.
          </p>
        </>
      )}
    </section>
  );
}
