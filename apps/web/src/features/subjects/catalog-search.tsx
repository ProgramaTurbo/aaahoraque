"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";

export type CatalogOption = { id: string; label: string; detail?: string; keywords?: string };

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es").trim();
}

export function CatalogSearch({ label, placeholder, options, selected, disabled, onSelect }: {
  label: string;
  placeholder: string;
  options: CatalogOption[];
  selected?: CatalogOption;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const matches = options.filter((option) => {
    const text = normalizeSearch([option.label, option.detail, option.keywords].filter(Boolean).join(" "));
    return words.every((word) => text.includes(word));
  });
  const visible = matches.slice(0, 8);

  function close() {
    setOpen(false);
    setActive(-1);
    setQuery("");
  }

  function choose(option: CatalogOption) {
    close();
    onSelect(option.id);
  }

  function move(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!visible.length) return;
      const next = event.key === "ArrowDown" ? Math.min(active + 1, visible.length - 1)
        : active <= 0 ? visible.length - 1 : active - 1;
      setActive(next);
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && open && (visible[active] || visible.length === 1)) {
      event.preventDefault();
      choose(visible[active] ?? visible[0]);
    }
  }

  return <div className="relative min-w-0">
    <label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}</label>
    <input ref={input} id={id} role="combobox" type="text" autoComplete="off" spellCheck={false}
      aria-autocomplete="list" aria-expanded={open && !disabled} aria-controls={`${id}-list`}
      aria-activedescendant={open && active >= 0 ? `${id}-option-${active}` : undefined}
      disabled={disabled} value={open ? query : selected?.label ?? ""}
      placeholder={selected?.label ?? placeholder}
      onFocus={() => { setOpen(true); if (selected) setQuery(""); }}
      onClick={() => setOpen(true)} onBlur={close} onKeyDown={move}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
      className="h-12 w-full rounded-xl border border-white/15 bg-black/25 px-4 pr-11 text-sm focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 disabled:opacity-45"
    />
    <button type="button" tabIndex={-1} aria-label={`Buscar ${label.toLocaleLowerCase("es")}`}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => { if (open) close(); else { input.current?.focus(); setOpen(true); } }}
      className="absolute right-1 top-8 grid size-10 place-items-center text-cyan-200 disabled:opacity-40">
      <span aria-hidden="true">⌄</span>
    </button>
    <div hidden={!open || disabled} className="absolute inset-x-0 top-full z-30 mt-2 rounded-xl border border-white/15 bg-[#181322] shadow-2xl">
      <ul id={`${id}-list`} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1.5">
        {visible.map((option, index) => (
          <li key={option.id} id={`${id}-option-${index}`} role="option" aria-selected={active === index}
            onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}
            className={`cursor-pointer rounded-lg px-3 py-2.5 hover:bg-white/10 ${active === index ? "bg-cyan-300/15" : ""}`}>
            <span className="block text-sm font-semibold">{option.label}</span>
            {option.detail && <span className="mt-0.5 block text-xs text-[var(--color-fg-dim)]">{option.detail}</span>}
          </li>
        ))}
      </ul>
      <p role="status" className="px-4 pb-3 text-xs text-[var(--color-fg-dim)]">
        {matches.length === 0 ? "No hay coincidencias." : matches.length > visible.length ? `${matches.length} coincidencias. Escribe más para afinar.` : `${matches.length} ${matches.length === 1 ? "opción" : "opciones"}`}
      </p>
    </div>
  </div>;
}
