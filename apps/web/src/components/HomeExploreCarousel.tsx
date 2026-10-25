"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

const slides = [
  {
    eyebrow: "01 / EXPLORA TUS POSIBILIDADES",
    tab: "Qué estudiar",
    title: "TU FUTURO.\nTUS POSIBILIDADES.",
    description: "Conoce titulaciones y universidades antes de decidir tu siguiente etapa.",
    button: "Explorar qué estudiar",
    href: "/explorar/que-estudiar",
    image: "/hero/carreras.jpg",
    alt: "Tres estudiantes caminando juntos por un campus universitario",
    accent: "#3b82f6",
  },
  {
    eyebrow: "02 / CONOCE TU PLAN ACADÉMICO",
    tab: "Planes de estudio",
    title: "CADA ASIGNATURA.\nUN NUEVO CAMINO.",
    description: "Descubre cómo se organizan los estudios y qué asignaturas forman cada itinerario.",
    button: "Conocer planes de estudio",
    href: "/explorar/planes-de-estudio",
    image: "/hero/asignaturas.jpg",
    alt: "Estudiantes trabajando juntos en una biblioteca universitaria",
    accent: "#06b6d4",
  },
  {
    eyebrow: "03 / ABRE TUS HORIZONTES",
    tab: "Destinos Erasmus",
    title: "EL MUNDO TAMBIÉN\nES TU AULA.",
    description: "Explora la idea de estudiar en otro país y prepara tu próxima experiencia internacional.",
    button: "Conocer destinos",
    href: "/explorar/destinos",
    image: "/hero/erasmus.jpg",
    alt: "Dos personas recorriendo una calle histórica de Lisboa, Portugal",
    accent: "#10b981",
  },
] as const;

const AUTO_ADVANCE_MS = 6500;

export default function HomeExploreCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused, reducedMotion]);

  function move(direction: number) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % slides.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + slides.length) % slides.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = slides.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section
      aria-label="Explora AAAhoraQue"
      className="mb-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="section-marker">EXPLORA AAAHORAQUE</div>
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Tres formas de explorar tu futuro
        </span>
      </div>

      <div
        id="home-explore-panel"
        role="tabpanel"
        aria-labelledby={`home-explore-tab-${active}`}
        className="relative isolate overflow-hidden border border-[var(--color-border-light)] bg-[var(--color-bg-darker)]"
      >
        <div
          className="flex motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <Link
              key={slide.href}
              href={slide.href}
              aria-hidden={index !== active}
              tabIndex={index === active ? 0 : -1}
              className="group relative block h-[420px] min-w-full overflow-hidden sm:h-[510px] lg:h-[575px]"
            >
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                sizes="(max-width: 768px) 100vw, 90vw"
                priority={index === 0}
                className="object-cover object-center brightness-[.72] contrast-125 grayscale-[.75] transition-transform duration-1000 group-hover:scale-[1.025]"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg,rgba(10,8,18,.97) 0%,rgba(10,8,18,.76) 42%,rgba(10,8,18,.11) 100%),linear-gradient(0deg,rgba(10,8,18,.70),transparent 45%),linear-gradient(0deg,${slide.accent}22,${slide.accent}08)`,
                }}
              />
              <div className="relative flex h-full max-w-[800px] flex-col justify-center px-6 pb-14 pt-10 sm:px-12 lg:px-20">
                <span className="mb-6 font-mono text-[11px] font-semibold tracking-[.23em]" style={{ color: slide.accent }}>
                  {slide.eyebrow}
                </span>
                <h2 className="whitespace-pre-line font-display text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  {slide.title}
                </h2>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
                  {slide.description}
                </p>
                <span
                  className="mt-8 inline-flex w-fit items-center gap-4 border px-5 py-3 text-xs font-semibold uppercase tracking-[.15em] transition-colors group-hover:bg-white/10 sm:text-sm"
                  style={{ borderColor: slide.accent, color: "#fff" }}
                >
                  {slide.button} <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 sm:bottom-6 sm:right-7">
          <button
            type="button"
            onClick={() => move(-1)}
            className="flex h-11 w-11 items-center justify-center border border-white/50 bg-black/65 text-2xl text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Imagen anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="flex h-11 w-11 items-center justify-center border border-white/50 bg-black/65 text-2xl text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Siguiente imagen"
          >
            ›
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Secciones informativas" className="grid grid-cols-3 border-b border-[var(--color-border-light)]">
        {slides.map((slide, index) => (
          <button
            ref={(element) => { tabRefs.current[index] = element; }}
            key={slide.href}
            id={`home-explore-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            aria-controls="home-explore-panel"
            tabIndex={active === index ? 0 : -1}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            onClick={() => setActive(index)}
            className="relative min-h-[76px] border-r border-[var(--color-border)] px-2 py-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-dim)] transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white sm:px-6 sm:text-sm"
            style={{ color: active === index ? slide.accent : undefined }}
          >
            <span className="block font-mono text-[10px] opacity-60">0{index + 1}</span>
            {slide.tab}
            {active === index && (
              <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: slide.accent }} />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
