import { useState } from "react";
import { creditsFormat, type DecisionSubject, type OfficialEvidence } from "@/lib/subjects/decision";
import { IndicatorCard } from "./historical-indicators";

const muted = "text-sm text-[var(--color-fg-dim)]";
const topics = [
  ["Datos e IA", /bases de datos|minería de datos|almacenes de datos|aprendizaje automático|redes neuronales|inteligencia artificial|machine learning/iu],
  ["Software", /ingeniería del software|arquitectura de software|pruebas de software|desarrollo de aplicaciones/iu],
  ["Sistemas y redes", /redes de computadores|sistemas distribuidos|sistemas operativos|infraestructura|cloud computing/iu],
  ["Ciberseguridad", /ciberseguridad|criptografía|seguridad informática|seguridad de redes/iu],
  ["Gráficos e interacción", /gráficos por computador|realidad virtual|interacción persona|visión por computador/iu],
] as const;
const technologies = ["Python", "Java", "JavaScript", "SQL", "Docker", "Linux", "Git", "PostgreSQL", "React", "Kubernetes", "MATLAB", "OpenGL", "TensorFlow"];
const commonWords = new Set(["sobre", "entre", "mediante", "estos", "estas", "forma", "temario", "contenidos", "asignatura", "evaluación", "estudio", "introducción", "básicos", "objetivos", "aprendizaje"]);

function guideWords(program: string) {
  return new Set((program.toLocaleLowerCase("es").match(/\p{L}{5,}/gu) ?? []).filter((word) => !commonWords.has(word)));
}

export function FormationComparison({ items, evidence, overlap = false }: {
  items: DecisionSubject[]; evidence: Map<string, OfficialEvidence>; overlap?: boolean;
}) {
  const [referenceId, setReferenceId] = useState("");
  const guides = items.map((item) => ({ item, guide: evidence.get(item.id)?.guide }));
  if (overlap) {
    if (items.length < 2) return null;
    const reference = guides.find(({ item }) => item.id === referenceId) ?? guides[0];
    const a = guideWords(reference.guide?.program ?? "");
    const pairs = guides.filter(({ item }) => item.id !== reference.item.id).map((right) => {
      const b = guideWords(right.guide?.program ?? "");
      const common = [...a].filter((word) => b.has(word));
      return { left: reference.item, right: right.item, common, union: a.size + b.size - common.length, comparable: a.size > 0 && b.size > 0 };
    });
    return <IndicatorCard title="Coincidencia entre temarios" source="Calculado a partir de guías">
      {guides.length > 2 && <label className="mb-3 block text-sm font-semibold">Asignatura de referencia
        <select className="mt-1 block w-full rounded-lg border border-control-border bg-bg-card px-3 py-2 text-fg"
          value={reference.item.id} onChange={(event) => setReferenceId(event.target.value)}>
          {guides.map(({ item }) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>}
      <div className="grid max-h-96 gap-3 overflow-auto sm:grid-cols-2">
        {pairs.map(({ left, right, common, union, comparable }) => <div key={left.id + right.id} className="rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{left.name} · {right.name}</p>
          {comparable ? <>
            <p className="mt-1 font-semibold text-subjects">{creditsFormat.format(common.length * 100 / union)} % de vocabulario común</p>
            {common.length > 0 && <p className={`${muted} mt-1`}>{common.slice(0, 8).join(", ")}</p>}
          </> : <p className={muted}>Falta el temario de alguna asignatura.</p>}
        </div>)}
      </div>
      <p className={`${muted} mt-3`}>Palabras compartidas sobre todas las palabras distintas de los dos temarios. Sirve para localizar temas que conviene leer en la guía.</p>
    </IndicatorCard>;
  }
  if (!items.length) return null;
  return <IndicatorCard title="Temas y tecnologías" source="Calculado a partir de guías">
    <div className="grid max-h-[40rem] gap-3 overflow-auto sm:grid-cols-2">
      {guides.map(({ item, guide }) => {
        const matchingTopics = guide?.program ? topics.filter(([, pattern]) => pattern.test(guide.program)).map(([name]) => name) : [];
        const matchingTech = guide?.program ? technologies.filter((term) => new RegExp(`\\b${term}\\b`, "iu").test(guide.program)) : [];
        return <div key={item.id} className="min-w-0 space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{item.name}</p>
          {guide?.program ? <dl className="space-y-2 text-sm">
            <div><dt className="font-medium">Temas</dt><dd className={muted}>{matchingTopics.join(" · ") || "Sin coincidencias en el extracto."}</dd></div>
            <div><dt className="font-medium">Tecnologías citadas</dt><dd className={muted}>{matchingTech.join(" · ") || "Sin coincidencias en el extracto."}</dd></div>
          </dl> : <p className={muted}>Sin temario cargado.</p>}
        </div>;
      })}
    </div>
    <p className={`${muted} mt-3`}>Etiquetas detectadas en el texto del temario. La guía docente contiene el alcance de cada tema.</p>
  </IndicatorCard>;
}
