import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../../.env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
