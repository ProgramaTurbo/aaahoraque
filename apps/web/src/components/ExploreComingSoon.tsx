import Image from "next/image";
import Link from "next/link";

type Section = "degrees" | "subjects" | "erasmus";

const sections = {
  degrees: {
    label: "CARRERAS / EXPLORACIÓN",
    title: "DESCUBRE QUÉ ESTUDIAR.",
    description: "Estamos preparando una experiencia informativa más completa para explorar las opciones universitarias antes de comenzar una decisión personal.",
    image: "/hero/carreras.jpg",
    alt: "Estudiantes caminando por un campus universitario",
    color: "#3b82f6",
  },
  subjects: {
    label: "ASIGNATURAS / PLANES DE ESTUDIO",
    title: "CONOCE LOS PLANES DE ESTUDIO.",
    description: "Estamos incorporando asignaturas y planes contrastados con fuentes oficiales. No presentaremos estructuras sintéticas como planes universitarios reales.",
    image: "/hero/asignaturas.jpg",
    alt: "Estudiantes estudiando en una biblioteca",
    color: "#06b6d4",
  },
  erasmus: {
    label: "ERASMUS / MOVILIDAD",
    title: "DESCUBRE NUEVOS DESTINOS.",
    description: "Estamos preparando el espacio informativo de movilidad internacional. Los destinos y convenios se mostrarán cuando puedan verificarse.",
    image: "/hero/erasmus.jpg",
    alt: "Calle histórica de Lisboa, Portugal",
    color: "#10b981",
  },
} as const;

export default function ExploreComingSoon({ section }: { section: Section }) {
  const data = sections[section];
  return (
    <main className="bg-textured min-h-[calc(100vh-80px)]">
      <div className="mx-auto max-w-[1600px] px-6 pb-14 pt-14 lg:px-10">
        <Link href="/" className="nav-link inline-flex mb-8">← Volver a AAAhoraQue</Link>
        <div className="relative isolate min-h-[520px] overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-bg-darker)]">
          <Image src={data.image} alt={data.alt} fill priority sizes="100vw" className="object-cover brightness-[.55] contrast-125 grayscale-[.75]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0812] via-[#0a0812]/90 to-[#0a0812]/25" />
          <div className="relative flex min-h-[520px] max-w-3xl flex-col justify-center p-7 sm:p-12 lg:p-20">
            <p className="mb-6 font-mono text-xs font-semibold tracking-[.2em]" style={{ color: data.color }}>{data.label}</p>
            <h1 className="font-display text-4xl leading-tight text-white sm:text-6xl">{data.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{data.description}</p>
            <p className="mt-8 w-fit border border-white/40 px-4 py-2 font-mono text-xs uppercase tracking-[.16em] text-white">Sección informativa en construcción</p>
            {section === "degrees" && (
              <Link href="/explorar/titulaciones" className="mt-6 w-fit border px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10" style={{ borderColor: data.color }}>
                Consultar catálogo existente ↗
              </Link>
            )}
          </div>
        </div>
        <p className="mt-5 text-sm text-[var(--color-muted)]">AAAhoraQue distingue información académica verificada, datos declarados y simulaciones. Esta página todavía no ofrece recomendaciones personales.</p>
      </div>
    </main>
  );
}
