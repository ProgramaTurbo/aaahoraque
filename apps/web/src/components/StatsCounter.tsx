// apps/web/src/components/StatsCounter.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  label: string;
  target: number;
  color: string;
};

export default function StatsCounter({ stats }: { stats: Stat[] }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6 border-y border-[var(--color-border)] py-16 mb-20 bg-[var(--color-bg-darker)]"
    >
      {stats.map((stat, i) => (
        <div key={i} className="border-l border-[var(--color-border-light)] pl-6">
          <div 
            className="font-display text-6xl md:text-7xl number-display" 
            style={{ color: stat.color }}
          >
            <Counter target={stat.target} start={visible} />
          </div>
          <div className="font-mono text-[11px] text-[var(--color-muted)] tracking-[0.2em] uppercase mt-2">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function Counter({ target, start }: { target: number; start: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    const duration = 1800;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: empieza rápido y frena
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      
      setValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    requestAnimationFrame(step);
  }, [start, target]);

  return <span>{value.toLocaleString('es-ES')}</span>;
}