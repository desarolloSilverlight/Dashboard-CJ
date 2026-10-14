"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CjProductDetail, CjProductListItem } from "@/core/products/types";
import { cjPublicGet, usesPublicCjKey } from "@/infrastructure/http/cj-public";
import { toCardGallery, type CardGallery } from "../lib/card-gallery";

export type GalleryStatus = "pending" | "loading" | "ready" | "error";

const BATCH_SIZE = 5;

type BatchResponse = {
  ok?: boolean;
  data?: CardGallery[];
  message?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useCardGalleries(
  products: CjProductListItem[],
  priorityIds: string[],
) {
  const [galleries, setGalleries] = useState<Record<string, CardGallery>>({});
  const [status, setStatus] = useState<Record<string, GalleryStatus>>({});
  const visibleRef = useRef(new Set<string>());
  const priorityRef = useRef(priorityIds);
  priorityRef.current = priorityIds;
  const idsKey = products.map((p) => p.id).join("\n");

  const markVisible = useCallback((id: string, visible: boolean) => {
    if (!id) return;
    if (visible) visibleRef.current.add(id);
    else visibleRef.current.delete(id);
  }, []);

  useEffect(() => {
    const ids = idsKey.split("\n").filter(Boolean);
    visibleRef.current = new Set();
    setGalleries({});
    setStatus(Object.fromEntries(ids.map((id) => [id, "pending" as const])));
    if (!ids.length) return;

    let cancelled = false;
    const finished = new Set<string>();
    const controller = new AbortController();

    const nextBatch = () => {
      const pending = ids.filter((id) => !finished.has(id));
      const priority = new Set(priorityRef.current);
      const first = pending.filter((id) => priority.has(id));
      const rest = pending.filter((id) => !priority.has(id));
      return [...first, ...rest].slice(0, BATCH_SIZE);
    };

    const mark = (batch: string[], value: GalleryStatus) => {
      if (cancelled) return;
      setStatus((prev) => {
        const next = { ...prev };
        for (const id of batch) next[id] = value;
        return next;
      });
    };

    async function pump() {
      while (!cancelled) {
        if (document.hidden) {
          await sleep(500);
          continue;
        }
        const batch = nextBatch();
        if (!batch.length) return;
        mark(batch, "loading");
        try {
          let rows: CardGallery[];
          if (usesPublicCjKey()) {
            rows = [];
            for (const pid of batch) {
              if (cancelled || controller.signal.aborted) return;
              const detail = await cjPublicGet<CjProductDetail>("/product/query", {
                pid,
                features: ["enable_video", "enable_combine"],
              });
              if (detail.code === 200 && detail.data) {
                rows.push(toCardGallery(detail.data, pid));
              }
            }
          } else {
            const res = await fetch("/api/batch/product-query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pids: batch, view: "card" }),
              signal: controller.signal,
            });
            const body = (await res.json()) as BatchResponse;
            if (!res.ok) throw new Error(body.message ?? "No se pudo cargar el lote");
            rows = body.data ?? [];
          }
          const byId = new Map(rows.filter((row) => row.pid).map((row) => [row.pid, row]));
          if (!cancelled) {
            setGalleries((prev) => {
              const next = { ...prev };
              for (const row of rows) {
                if (row.pid) next[row.pid] = row;
              }
              return next;
            });
            setStatus((prev) => {
              const next = { ...prev };
              for (const id of batch) next[id] = byId.has(id) ? "ready" : "error";
              return next;
            });
          }
          for (const id of batch) finished.add(id);
        } catch (err) {
          if (cancelled || (err instanceof DOMException && err.name === "AbortError")) {
            return;
          }
          for (const id of batch) finished.add(id);
          mark(batch, "error");
        }
      }
    }

    void pump();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [idsKey]);

  const readyCount = Object.values(status).filter((s) => s === "ready").length;

  return { galleries, status, markVisible, readyCount };
}
