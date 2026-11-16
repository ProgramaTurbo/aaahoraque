"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { accountPath } from "@/lib/account/paths";
import { accountButton, accountInput } from "./styles";
import { authClient } from "./auth-client";

type Mode = "login" | "register" | "recovery" | "reset";

const messages = {
  login: ["Iniciar sesión", "Entrar"],
  register: ["Crear cuenta", "Crear mi cuenta"],
  recovery: ["Recuperar acceso", "Enviar enlace"],
  reset: ["Cambiar contraseña", "Guardar contraseña"],
};

export function AccountForm({ mode, next = "/panel", token, verified, verificationError }: {
  mode: Mode;
  next?: string;
  token?: string;
  verified?: boolean;
  verificationError?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [title, submitLabel] = messages[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    setBusy(true);
    setError("");
    setReceipt("");
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email, password, callbackURL: next, rememberMe: true });
        if (!result.error) {
          window.location.assign(next);
          return;
        }
        setError(result.error.code === "EMAIL_NOT_VERIFIED"
          ? "Verifica el correo antes de entrar. Revisa también el correo no deseado."
          : result.error.code === "INVALID_CALLBACK_URL" || result.error.code === "INVALID_ORIGIN"
            ? "Abre la aplicación desde la dirección configurada para iniciar sesión."
            : result.error.status === 429 ? "Demasiados intentos. Espera un momento y vuelve a intentarlo."
            : "No se ha podido iniciar sesión. Revisa el correo y la contraseña.");
      } else if (mode === "register") {
        const name = String(data.get("name") ?? "").trim();
        if (!name) {
          setError("Indica el nombre que quieres mostrar.");
          return;
        }
        const callbackURL = accountPath("/login", next) + "&verified=1";
        const result = await authClient.signUp.email({ name, email, password, callbackURL });
        if (result.error) {
          setError("No se ha podido crear la cuenta. Revisa los datos e inténtalo de nuevo.");
          return;
        }
        setReceipt("Revisa tu correo para verificar la cuenta y volver a la aplicación.");
      } else if (mode === "recovery") {
        const result = await authClient.requestPasswordReset({ email, redirectTo: "/restablecer-clave" });
        if (result.error) {
          setError("No se ha podido procesar la solicitud. Inténtalo de nuevo.");
          return;
        }
        setReceipt("Si el correo está asociado a una cuenta, recibirás un enlace para cambiar la contraseña.");
      } else if (token) {
        const result = await authClient.resetPassword({ token, newPassword: password });
        if (result.error) {
          setError("No se ha podido cambiar la contraseña. Si el enlace ha caducado, solicita otro.");
          return;
        }
        setReceipt("Contraseña actualizada. Ya puedes iniciar sesión.");
      }
    } catch {
      setError("No se ha podido completar la solicitud. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-6 border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 sm:p-10">
      <h1 className="font-display text-4xl">{title}</h1>
      {verified && <p role="status">Correo verificado. Ya puedes iniciar sesión.</p>}
      {verificationError && <p role="alert">No se ha podido verificar el correo. Inicia sesión para solicitar un enlace nuevo.</p>}
      {mode === "reset" && !token ? (
        <p role="alert">El enlace no está disponible. <Link href="/recuperar-acceso" className="underline">Solicitar otro enlace</Link></p>
      ) : (
        <form method="post" className="space-y-5" onSubmit={submit}>
          {mode === "register" && <label className="block space-y-2">
            <span>Nombre visible</span>
            <input name="name" autoComplete="name" required maxLength={80} className={accountInput} />
          </label>}
          {mode !== "reset" && <label className="block space-y-2">
            <span>Correo electrónico</span>
            <input name="email" type="email" autoComplete="email" required maxLength={254} className={accountInput} />
          </label>}
          {mode !== "recovery" && <label className="block space-y-2">
            <span>Contraseña {mode !== "login" && "· mínimo 12 caracteres"}</span>
            <input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              required minLength={mode === "login" ? undefined : 12} maxLength={128} className={accountInput} />
          </label>}
          {error && <p role="alert" className="text-rose-300">{error}</p>}
          {receipt && <p role="status" className="text-violet-200">{receipt}</p>}
          <button className={accountButton} type="submit" disabled={busy || Boolean(receipt)}>{busy ? "Procesando…" : submitLabel}</button>
        </form>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
        {mode === "login" ? <>
          <Link href={accountPath("/registro", next)} className="underline">Crear cuenta</Link>
          <Link href="/recuperar-acceso" className="underline">He olvidado mi contraseña</Link>
        </> : <Link href={accountPath("/login", next)} className="underline">Volver a iniciar sesión</Link>}
        <Link href={next === "/panel" ? "/" : next} className="underline">Continuar como invitado</Link>
      </div>
    </section>
  );
}
