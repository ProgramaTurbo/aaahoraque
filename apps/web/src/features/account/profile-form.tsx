"use client";

import { useActionState } from "react";
import { saveProfile } from "@/app/panel/actions";
import type { Language } from "@/lib/db/schema";
import { accountButton, accountInput } from "./styles";

const stages = [
  ["exploring", "Estoy eligiendo qué estudiar"],
  ["studying", "Estoy estudiando"],
  ["graduated", "He terminado mis estudios"],
  ["other", "Otra situación"],
];

export function ProfileForm({ name, stage, languages }: { name: string; stage: string; languages: Language[] }) {
  const [message, action, pending] = useActionState(saveProfile, "");

  return <form action={action} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2"><span>Nombre visible</span>
        <input name="displayName" defaultValue={name} maxLength={80} className={accountInput} />
      </label>
      <label className="space-y-2"><span>Situación académica</span>
        <select name="academicStage" defaultValue={stage} className={accountInput}>
          <option value="">Sin indicar</option>
          {stages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <fieldset className="space-y-3">
      <legend className="font-semibold">Idiomas</legend>
      {[0, 1, 2].map((i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
        <input aria-label={`Idioma ${i + 1}`} placeholder="Ej. Inglés" name={`language-${i}`}
          defaultValue={languages[i]?.name ?? ""} maxLength={40} className={accountInput} />
        <select aria-label={`Nivel del idioma ${i + 1}`} name={`level-${i}`}
          defaultValue={languages[i]?.level ?? ""} className={accountInput}>
          <option value="">Nivel</option>
          {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap items-center gap-4">
      <button type="submit" disabled={pending} className={accountButton}>{pending ? "Guardando…" : "Guardar perfil"}</button>
      {message && <p role="status" className={message === "Perfil guardado." ? "text-violet-200" : "text-rose-300"}>{message}</p>}
    </div>
  </form>;
}
