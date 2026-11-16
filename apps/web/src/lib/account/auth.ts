import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createTransport } from "nodemailer";
import { db } from "@/lib/db";
import { authAccounts, authSessions, authUsers, authVerifications } from "@/lib/db/schema";

function authConfig() {
  const { BETTER_AUTH_URL, BETTER_AUTH_SECRET, AUTH_SMTP_URL, AUTH_EMAIL_FROM } = process.env;
  if (!BETTER_AUTH_URL || !BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32 ||
      !AUTH_SMTP_URL || !AUTH_EMAIL_FROM) return null;

  const origin = URL.parse(BETTER_AUTH_URL);
  if (!origin || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
  const localHttp = origin.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.protocol !== "https:" && !localHttp) return null;

  return { origin, secret: BETTER_AUTH_SECRET, smtpUrl: AUTH_SMTP_URL, from: AUTH_EMAIL_FROM };
}

function createAuth(config: NonNullable<ReturnType<typeof authConfig>>) {
  const transport = createTransport({
    url: config.smtpUrl,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  async function sendAccountLink(email: string, subject: string, url: string) {
    try {
      await transport.sendMail({ from: config.from, to: email, subject, text: `${subject}\n\n${url}` });
    } catch {
      console.error("[ACCOUNT] Error al enviar el correo de cuenta.");
      throw new Error("No se ha podido enviar el correo.");
    }
  }

  return betterAuth({
    appName: "AAAhoraQue",
    telemetry: { enabled: false },
    baseURL: config.origin.origin,
    secret: config.secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers, session: authSessions, account: authAccounts, verification: authVerifications,
      },
    }),
    advanced: {
      cookiePrefix: "aaahoraque",
      useSecureCookies: config.origin.protocol === "https:",
      database: { generateId: "uuid" },
    },
    rateLimit: { enabled: true },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) => sendAccountLink(user.email, "Recupera tu acceso a AAAhoraQue", url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      sendVerificationEmail: ({ user, url }) => sendAccountLink(user.email, "Verifica tu correo en AAAhoraQue", url),
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (instance) return instance;
  const config = authConfig();
  if (config) instance = createAuth(config);
  return instance ?? null;
}
