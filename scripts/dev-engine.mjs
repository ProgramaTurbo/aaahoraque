import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const engine = path.join(root, "services", "decision-engine");
const python = path.join(engine, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
if (!existsSync(python)) {
  console.error("Falta el entorno Python del motor. Crea services/decision-engine/.venv e instala requirements.txt antes de iniciar FastAPI.");
  process.exit(1);
}
const child = spawn(python, ["-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"], { cwd: engine, stdio: "inherit" });
child.on("error", () => {
  console.error("No se pudo iniciar Python. Comprueba que el entorno .venv utiliza una instalación de Python disponible.");
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
