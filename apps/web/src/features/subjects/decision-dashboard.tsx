"use client";

import { useState } from "react";

const criteriaLabels: Record<string, string> = {
  academic_affinity: "Afinidad académica",
  professional_alignment: "Orientación profesional",
  learning_compatibility: "Compatibilidad de aprendizaje",
  effort_compatibility: "Adecuación del esfuerzo",
};

const criteriaKeys = Object.keys(criteriaLabels);

type Alternative = {
  id: string;
  name: string;
  criteria: Record<string, number>;
  balance_score: number;
  explanations: Record<string, string[]>;
  eligibility: {
    eligible: boolean;
    violations: Array<{
      description?: string;
      message?: string;
      [key: string]: unknown;
    }>;
  };
};

type SensitivityItem = {
  base_weight?: number;
  robustness?: string;
  first_change?: {
    weight?: number;
    new_winner_name?: string;
    distance?: number;
  } | null;
};

type DemoData = {
  status: string;
  source: string;
  input: {
    student: {
      academic_interests: Record<string, number>;
      professional_interests: Record<string, number>;
      theory_preference: number;
      practice_preference: number;
      project_preference: number;
      teamwork_preference: number;
      difficulty_tolerance: number;
      workload_tolerance: number;
    };
    priorities: Record<string, number>;
    academic_state: {
      earned_credits: number;
      completed_subject_ids: string[];
    };
    subjects: Array<{
      id: string;
      name: string;
      area_profile: Record<string, number>;
      professional_profile: Record<string, number>;
      estimated_difficulty: number;
      estimated_workload: number;
      theoretical_component: number;
      practical_component: number;
      project_component: number;
      teamwork_component: number;
    }>;
  };
  analysis: {
    alternatives: Alternative[];
    decision_summary: {
      message: string;
    };
    sensitivity: Record<string, SensitivityItem>;
    tradeoffs: Array<Record<string, string>>;
  };
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function MetricBar({
  value,
  max = 10,
}: {
  value: number;
  max?: number;
}) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div
        className="h-full rounded-full bg-sky-600"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function DecisionDashboard() {
  const [data, setData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/subjects/demo", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ?? "No se ha podido realizar el análisis."
        );
      }

      setData(result as DemoData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error desconocido."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <section className="rounded-xl border p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">
            Laboratorio de decisión
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Ejecuta una evaluación con un estudiante sintético y
            tres asignaturas de demostración.
          </p>
        </div>

        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Analizando alternativas..." : "Explorar análisis DEMO"}
        </button>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </section>
    );
  }

  const { input, analysis } = data;
  const alternatives = analysis.alternatives;

  const interests = Object.entries(input.student.academic_interests)
    .sort((a, b) => b[1] - a[1]);

  const professions = Object.entries(input.student.professional_interests)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Datos DEMO sintéticos · No corresponden a un estudiante real.
        </p>

        <button
          type="button"
          onClick={runAnalysis}
          disabled={loading}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
        >
          {loading ? "Actualizando..." : "Repetir análisis"}
        </button>
      </div>

      {error && <p role="alert" className="text-red-600">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border p-5">
          <p className="text-sm text-zinc-500">Alternativas analizadas</p>
          <p className="mt-2 text-3xl font-semibold">{alternatives.length}</p>
        </article>

        <article className="rounded-xl border p-5">
          <p className="text-sm text-zinc-500">Alternativas viables</p>
          <p className="mt-2 text-3xl font-semibold">
            {alternatives.filter((a) => a.eligibility.eligible).length}
          </p>
        </article>

        <article className="rounded-xl border p-5">
          <p className="text-sm text-zinc-500">Créditos declarados</p>
          <p className="mt-2 text-3xl font-semibold">
            {input.academic_state.earned_credits} ECTS
          </p>
        </article>
      </section>

      <section className="rounded-xl border p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">01 · Radiografía de tu perfil</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Preferencias declaradas en el ejemplo, antes de evaluar asignaturas.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold">Intereses académicos</h3>
            {interests.map(([name, value]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm gap-3">
                  <span className="capitalize">{formatLabel(name)}</span>
                  <span className="tabular-nums">{value}/10</span>
                </div>
                <MetricBar value={value} />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Intereses profesionales</h3>
            {professions.map(([name, value]) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between text-sm gap-3">
                  <span className="capitalize">{formatLabel(name)}</span>
                  <span className="tabular-nums">{value}/10</span>
                </div>
                <MetricBar value={value} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Teoría", input.student.theory_preference],
            ["Práctica", input.student.practice_preference],
            ["Proyectos", input.student.project_preference],
            ["Trabajo en equipo", input.student.teamwork_preference],
            ["Tolerancia a dificultad", input.student.difficulty_tolerance],
            ["Tolerancia a carga", input.student.workload_tolerance],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-zinc-100 p-4 dark:bg-zinc-900">
              <div className="flex justify-between gap-2 text-sm mb-3">
                <span>{label}</span>
                <strong>{value}/10</strong>
              </div>
              <MetricBar value={Number(value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-semibold">02 · Comparación multicriterio</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Cada valor es una puntuación normalizada de 0 a 10
            calculada por FastAPI, no una probabilidad.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-3">Criterio</th>
                {alternatives.map((a) => (
                  <th scope="col" key={a.id} className="p-3">
                    {a.name}
                    <span className="block text-xs font-normal text-zinc-500">
                      {a.eligibility.eligible ? "Viable" : "No viable"}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteriaKeys.map((key) => (
                <tr key={key} className="border-b last:border-0">
                  <th scope="row" className="p-3 font-medium">
                    {criteriaLabels[key]}
                  </th>
                  {alternatives.map((a) => (
                    <td key={a.id} className="p-3">
                      <div className="space-y-2">
                        <span className="tabular-nums">
                          {a.criteria[key]?.toFixed(2) ?? "—"}/10
                        </span>
                        <MetricBar value={a.criteria[key] ?? 0} />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-6 space-y-5">
        <h2 className="text-2xl font-semibold">
          03 · Contenidos y orientación profesional
        </h2>
        <p className="text-sm text-zinc-500">
          Perfiles relativos del catálogo sintético (escala 0–1).
          No representan tasas de empleabilidad.
        </p>

        <div className="grid gap-5 lg:grid-cols-3">
          {input.subjects.map((subject) => (
            <article key={subject.id} className="rounded-lg border p-4 space-y-4">
              <h3 className="font-semibold">{subject.name}</h3>
              <p className="text-xs font-semibold text-zinc-500">Áreas académicas</p>
              {Object.entries(subject.area_profile).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="capitalize">{formatLabel(key)}</span>
                    <span>{Math.round(value * 100)} % relativo</span>
                  </div>
                  <MetricBar value={value} max={1} />
                </div>
              ))}

              <p className="text-xs font-semibold text-zinc-500">
                Relación con perfiles profesionales
              </p>
              {Object.entries(subject.professional_profile).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="capitalize">{formatLabel(key)}</span>
                    <span>{Math.round(value * 100)} % relativo</span>
                  </div>
                  <MetricBar value={value} max={1} />
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-6 space-y-5">
        <h2 className="text-2xl font-semibold">
          04 · Metodología y exigencia
        </h2>
        <p className="text-sm text-zinc-500">
          Valores estimados del conjunto de demostración, de 0 a 10.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm text-left">
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-3">Asignatura</th>
                <th scope="col" className="p-3">Teoría</th>
                <th scope="col" className="p-3">Práctica</th>
                <th scope="col" className="p-3">Proyectos</th>
                <th scope="col" className="p-3">Equipo</th>
                <th scope="col" className="p-3">Dificultad</th>
                <th scope="col" className="p-3">Carga</th>
              </tr>
            </thead>
            <tbody>
              {input.subjects.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <th scope="row" className="p-3 font-medium">{s.name}</th>
                  {[
                    s.theoretical_component,
                    s.practical_component,
                    s.project_component,
                    s.teamwork_component,
                    s.estimated_difficulty,
                    s.estimated_workload,
                  ].map((value, i) => (
                    <td key={i} className="p-3 tabular-nums">{value}/10</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border p-6 space-y-4">
        <h2 className="text-2xl font-semibold">05 · Viabilidad y explicaciones</h2>
        <p className="text-sm text-zinc-500">
          Una alternativa interesante puede no cumplir todavía los requisitos.
        </p>

        {alternatives.map((a) => (
          <details key={a.id} className="rounded-lg border p-4">
            <summary className="cursor-pointer font-semibold">
              {a.name} — {a.eligibility.eligible ? "Viable" : "Requisitos pendientes"}
            </summary>

            <div className="mt-4 space-y-4 text-sm">
              {!a.eligibility.eligible && (
                <div>
                  <strong>Restricciones detectadas</strong>
                  <ul className="mt-2 list-disc pl-5">
                    {a.eligibility.violations.map((v, i) => (
                      <li key={i}>
                        {v.description ?? v.message ?? JSON.stringify(v)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Object.entries(a.explanations).map(([key, messages]) => (
                <div key={key}>
                  <strong>{criteriaLabels[key] ?? formatLabel(key)}</strong>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {messages.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </section>

      <section className="rounded-xl border p-6 space-y-5">
        <h2 className="text-2xl font-semibold">06 · Prioridades y sensibilidad</h2>
        <p className="text-sm text-zinc-500">
          Distribución de pesos utilizada en el análisis inicial.
          En el siguiente incremento añadiremos controles para modificarlos.
        </p>

        {criteriaKeys.map((key) => {
          const weight = input.priorities[key] ?? 0;
          const sensitivity = analysis.sensitivity[key];

          return (
            <div key={key} className="space-y-2 border-b pb-4 last:border-0">
              <div className="flex justify-between gap-3 text-sm">
                <strong>{criteriaLabels[key]}</strong>
                <span className="tabular-nums">{weight} % del peso inicial</span>
              </div>
              <MetricBar value={weight} max={100} />

              <p className="text-xs text-zinc-500">
                {sensitivity?.first_change
                  ? `Cambio detectado al explorar un peso del ${sensitivity.first_change.weight} %. Nueva alternativa destacada: ${sensitivity.first_change.new_winner_name ?? "Consultar análisis"}.`
                  : "No se ha detectado un cambio de alternativa destacada en la exploración realizada."}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border p-6 space-y-3">
        <h2 className="text-2xl font-semibold">Lectura del análisis</h2>
        <p className="text-sm">{analysis.decision_summary.message}</p>
        <p className="text-xs text-zinc-500">
          Esta interpretación utiliza las prioridades del ejemplo y no
          sustituye la decisión personal del estudiante.
        </p>
      </section>
    </div>
  );
}
