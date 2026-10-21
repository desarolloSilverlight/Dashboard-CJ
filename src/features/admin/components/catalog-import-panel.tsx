"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Budget = {
  day: string;
  daily: number;
  reserved: number;
  released: number;
  spentInteractive: number;
  spentImport: number;
  interactiveRemaining: number;
  importRemaining: number;
  holdUntil: number | null;
};

type Job = {
  status: "idle" | "running" | "paused" | "done";
  message: string;
  products: number;
  currentLabel: string | null;
  currentPage: number | null;
  totalPages: number | null;
  queued: number;
  alive: boolean;
};

type Payload = { budget: Budget; job: Job };

function formatPoints(n: number) {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function CatalogImportPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/catalog/import", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo leer la carga");
      setData((await res.json()) as Payload);
      setError(null);
    } catch {
      setError("La carga del listado solo está disponible con el servidor local.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function act(action: "start" | "pause") {
    setPending(true);
    try {
      const res = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la carga");
      setData((await res.json()) as Payload);
      setError(null);
    } catch {
      setError("No se pudo cambiar la carga.");
    } finally {
      setPending(false);
    }
  }

  if (compact) {
    return (
      <p className="mt-3 text-xs text-[var(--color-cj-muted)]">
        Buscar sigue llamando a CJ.
        {data
          ? ` Hay ${formatPoints(data.budget.interactiveRemaining)} puntos listos para buscar. ${formatPoints(data.budget.reserved)} quedan apartados y la carga no los gasta. Productos guardados: ${formatPoints(data.job.products)}.`
          : " La carga del listado deja 10.000 puntos diarios apartados para este buscador."}
      </p>
    );
  }

  const job = data?.job;
  const budget = data?.budget;
  const running = job?.status === "running" && job.alive;

  return (
    <section className="mb-4 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-cj-text)]">Carga del listado</h2>
      <p className="mt-1 max-w-3xl text-xs text-[var(--color-cj-muted)]">
        Baja id, nombre, precio, imagen y stock general a la base local. Buscar, la ficha y el
        flete siguen en CJ. Cada día se apartan {budget ? formatPoints(budget.reserved) : "10.000"} puntos
        para eso; la carga solo gasta lo que CJ ya soltó por encima de esa reserva.
      </p>

      {budget && (
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[var(--color-cj-faint)]">Listos para buscar</dt>
            <dd className="font-semibold text-[var(--color-cj-text)]">
              {formatPoints(budget.interactiveRemaining)}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[var(--color-cj-faint)]">Reserva que la carga no toca</dt>
            <dd className="font-semibold text-[var(--color-cj-text)]">
              {formatPoints(budget.reserved)}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[var(--color-cj-faint)]">Puntos ya sueltos hoy</dt>
            <dd className="font-semibold text-[var(--color-cj-text)]">
              {formatPoints(budget.released)} / {formatPoints(budget.daily)}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[var(--color-cj-faint)]">Gastados al buscar</dt>
            <dd className="font-semibold text-[var(--color-cj-text)]">
              {formatPoints(budget.spentInteractive)}
            </dd>
          </div>
          <div className="rounded-lg bg-[var(--color-cj-chip)] px-3 py-2">
            <dt className="text-[var(--color-cj-faint)]">Gastados en la carga</dt>
            <dd className="font-semibold text-[var(--color-cj-text)]">
              {formatPoints(budget.spentImport)} · quedan {formatPoints(budget.importRemaining)}
            </dd>
          </div>
        </dl>
      )}

      <p className="mt-3 text-sm text-[var(--color-cj-text)]">
        {job?.message ?? "Leyendo el estado de la carga."}
      </p>
      {job && (
        <p className="mt-1 text-xs text-[var(--color-cj-muted)]">
          {formatPoints(job.products)} productos en la base
          {job.queued > 0 ? ` · ${job.queued} grupos pendientes` : ""}
          {job.currentLabel ? ` · ${job.currentLabel}` : ""}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-[var(--color-cj-coral)]">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={pending || running || job?.status === "done"} onClick={() => act("start")}>
          {job?.status === "paused" ? "Reanudar carga" : "Iniciar carga"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending || !running} onClick={() => act("pause")}>
          Pausar
        </Button>
      </div>
    </section>
  );
}
