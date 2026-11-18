"use client";

import Link from "next/link";
import { useState } from "react";
import { accountPath } from "@/lib/account/paths";
import { accountButton } from "@/features/account/styles";

const options = [
  { id: "degrees", question: "Estoy valorando qué carrera estudiar", title: "Explora carreras", explanation: "Compara titulaciones y prueba el test de intereses de Carrera.", href: "/degrees", demo: "/degrees/personalized-test", demoLabel: "Probar un perfil de ejemplo" },
  { id: "erasmus", question: "Estoy pensando en hacer Erasmus", title: "Explora destinos de movilidad", explanation: "Prueba el comparador de ejemplo con presupuesto, idioma y créditos.", href: "/erasmus", demo: null, demoLabel: null },
  { id: "subjects", question: "Ya estudio y quiero elegir asignaturas", title: "Explora tu plan de estudios", explanation: "Consulta el catálogo y compara asignaturas por curso, periodo y créditos.", href: "/subjects", demo: "/subjects/demo", demoLabel: "Probar la demo de Asignaturas" },
];

export function QuickOrientation({ signedIn }: { signedIn: boolean }) {
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const result = submitted ? options.find((option) => option.id === selected) : undefined;

  if (result) return <section className="space-y-5 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
    <h2 className="font-display text-3xl">{result.title}</h2>
    <p>{result.explanation}</p>
    <div className="flex flex-wrap items-center gap-4">
      <Link href={result.href} className={accountButton}>Explorar</Link>
      {result.demo && <Link href={result.demo} className="underline">{result.demoLabel}</Link>}
      <Link href={signedIn ? "/panel" : accountPath("/registro", result.href)} className="underline">
        {signedIn ? "Abrir mi panel" : "Crear una cuenta"}
      </Link>
    </div>
    <button type="button" className="text-sm underline" onClick={() => setSubmitted(false)}>Cambiar respuesta</button>
  </section>;

  return <form className="space-y-5 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6"
    onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
    <fieldset className="space-y-3">
      <legend className="mb-2 font-semibold">¿Qué necesitas decidir ahora?</legend>
      {options.map((item) => <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 border border-[var(--color-border)] p-3">
        <input name="objective" type="radio" required value={item.id} checked={selected === item.id}
          onChange={() => setSelected(item.id)} />
        {item.question}
      </label>)}
    </fieldset>
    <button className={accountButton} type="submit">Ver por dónde empezar</button>
  </form>;
}
