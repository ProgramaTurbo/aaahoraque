// apps/web/src/app/page.tsx
import { db } from "@/lib/db";
import { universities, academicCenters, degrees, degreeOfferings } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import StatsCounter from "@/components/StatsCounter";

// Asegura que la página se renderice en el servidor en cada request (datos frescos)
export const dynamic = "force-dynamic";

async function getStats() {
  try {
    // Consultas reales a PostgreSQL usando Drizzle ORM (nombres en camelCase)
    const [unisCount] = await db.select({ value: count() }).from(universities);
    const [centersCount] = await db.select({ value: count() }).from(academicCenters);
    const [degreesCount] = await db.select({ value: count() }).from(degrees);
    const [offeringsCount] = await db.select({ value: count() }).from(degreeOfferings);

    return {
      universities: unisCount?.value ?? 0,
      centers: centersCount?.value ?? 0,
      degrees: degreesCount?.value ?? 0,
      offerings: offeringsCount?.value ?? 0,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    // Si la base de datos no está conectada o hay error, devolvemos 0 para que la UI no rompa
    return { universities: 0, centers: 0, degrees: 0, offerings: 0 };
  }
}

export default async function Home() {
  // 1. Obtenemos los datos en el servidor
  const statsData = await getStats();

  // 2. Formateamos para el componente de animación
  const statsArray = [
    { label: "Universidades", target: statsData.universities, color: "var(--color-accent)" },
    { label: "Centros", target: statsData.centers, color: "var(--color-degree)" },
    { label: "Titulaciones", target: statsData.degrees, color: "var(--color-erasmus)" },
    { label: "Ofertas", target: statsData.offerings, color: "var(--color-subjects)" },
  ];

  return (
    <div className="bg-textured min-h-[calc(100vh-80px)]">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-10 py-20">
        
        {/* Hero */}
        <div className="mb-16">
          <div className="section-marker mb-6">
            <span>SISTEMA DE ORIENTACIÓN</span>
          </div>
          <h1 className="font-display text-[10vw] lg:text-[8vw] leading-[0.85] mb-6">
            <span className="block">EXPLORA TU</span>
            <span className="block text-stroke">FUTURO.</span>
            <span className="block">DECIDE TÚ.</span>
          </h1>
          <p className="max-w-xl text-[var(--color-fg-dim)] text-lg">
            Orientación para alumnos de bachiller y universitarios sobre qué carrera elegir, 
            dónde hacer Erasmus y qué asignaturas cursar.
          </p>
        </div>

        {/* Contador Animado (Trae datos de la BBDD) */}
        <StatsCounter stats={statsArray} />

        {/* Módulos */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Carreras (Azul) */}
          <article className="program-card info-card-degree notch-corner-degree group cursor-pointer">
            <div className="relative h-72 overflow-hidden bg-[var(--color-bg-darker)] flex items-center justify-center">
              <div className="absolute top-4 left-4 font-mono text-[11px] text-[var(--color-degree)] tracking-[0.2em]">01 / CARRERAS</div>
              <div className="text-9xl text-[var(--color-degree)] opacity-20 font-display">?</div>
            </div>
            <div className="p-7">
              <h3 className="font-display text-4xl mb-3">¿QUÉ ESTUDIAR?</h3>
              <p className="text-[var(--color-fg-dim)] text-sm leading-relaxed mb-6">
                Explora titulaciones compatibles con tu perfil y descubre alternativas académicas.
              </p>
              <div className="flex items-center justify-between font-heading text-sm tracking-[0.15em] uppercase link-underline link-underline-degree">
                <span>Explorar</span>
                <span className="text-[var(--color-degree)]">→</span>
              </div>
            </div>
          </article>

          {/* Erasmus (Aqua) */}
          <article className="program-card info-card-erasmus notch-corner-erasmus group cursor-pointer">
            <div className="relative h-72 overflow-hidden bg-[var(--color-bg-darker)] flex items-center justify-center">
              <div className="absolute top-4 left-4 font-mono text-[11px] text-[var(--color-erasmus)] tracking-[0.2em]">02 / ERASMUS</div>
              <div className="text-9xl text-[var(--color-erasmus)] opacity-20 font-display">✈</div>
            </div>
            <div className="p-7">
              <h3 className="font-display text-4xl mb-3">¿DÓNDE IR?</h3>
              <p className="text-[var(--color-fg-dim)] text-sm leading-relaxed mb-6">
                Compara destinos de movilidad y analiza qué universidad encaja contigo.
              </p>
              <div className="flex items-center justify-between font-heading text-sm tracking-[0.15em] uppercase link-underline link-underline-erasmus">
                <span>Comparar</span>
                <span className="text-[var(--color-erasmus)]">→</span>
              </div>
            </div>
          </article>

          {/* Asignaturas (Verde) */}
          <article className="program-card info-card-subjects notch-corner-subjects group cursor-pointer">
            <div className="relative h-72 overflow-hidden bg-[var(--color-bg-darker)] flex items-center justify-center">
              <div className="absolute top-4 left-4 font-mono text-[11px] text-[var(--color-subjects)] tracking-[0.2em]">03 / ASIGNATURAS</div>
              <div className="text-9xl text-[var(--color-subjects)] opacity-20 font-display">≡</div>
            </div>
            <div className="p-7">
              <h3 className="font-display text-4xl mb-3">¿QUÉ CURSAR?</h3>
              <p className="text-[var(--color-fg-dim)] text-sm leading-relaxed mb-6">
                Analiza qué asignaturas elegir según tu situación y hacia dónde quieres ir.
              </p>
              <div className="flex items-center justify-between font-heading text-sm tracking-[0.15em] uppercase link-underline link-underline-subjects">
                <span>Analizar</span>
                <span className="text-[var(--color-subjects)]">→</span>
              </div>
            </div>
          </article>

        </div>

        {/* Indicador de datos demo */}
        <div className="mt-16 flex justify-center">
          <span className="demo-indicator">Datos de demostración para desarrollo</span>
        </div>

      </div>
    </div>
  );
}