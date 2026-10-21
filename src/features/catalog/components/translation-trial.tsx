"use client";

import { useEffect, useState } from "react";

type Item = {
  english: string;
  category?: string;
  deepl: string | null;
  local: string | null;
};

export function TranslationTrial() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancel = false;
    let timer = 0;
    async function load() {
      try {
        const res = await fetch("/api/translate/trial", { cache: "no-store" });
        const data = (await res.json()) as { items?: Item[] };
        const next = data.items ?? [];
        if (!cancel) setItems(next);
        if (next.length > 0 && next.every((item) => item.local) && timer) {
          window.clearInterval(timer);
        }
      } catch {
        if (!cancel) setItems([]);
      }
    }
    void load();
    timer = window.setInterval(() => void load(), 4000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  if (items.length === 0) return null;
  const localReady = items.every((item) => item.local);

  return (
    <section className="mb-4 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">Prueba de traducción</h2>
      <p className="mt-1 max-w-3xl text-xs text-[var(--color-cj-muted)]">
        Ocho nombres del listado guardado. Arriba el inglés, luego DeepL y el modelo local.
        {items.some((item) => item.deepl)
          ? " DeepL y el modelo local quedaron guardados."
          : localReady
            ? " El modelo local quedó guardado. DeepL se llena al pegar la clave y reiniciar el panel."
            : " El modelo local sigue cargando; esta lista se actualiza sola."}
      </p>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.english}
            className="rounded-lg border border-[var(--color-cj-border)] px-3 py-2 text-sm"
          >
            {item.category && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-cj-faint)]">
                {item.category}
              </p>
            )}
            <p className="mt-1 font-medium text-[var(--color-cj-text)]">{item.english}</p>
            <p className="mt-1 text-[var(--color-cj-muted)]">
              DeepL · {item.deepl ?? "sin clave en .env.local"}
            </p>
            <p className="mt-1 text-[var(--color-cj-muted)]">
              Local · {item.local ?? "traduciendo en este equipo…"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
