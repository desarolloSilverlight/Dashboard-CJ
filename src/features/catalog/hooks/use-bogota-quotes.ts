"use client";

import { useEffect, useRef, useState } from "react";
import type { FreightQuoteResponse } from "@/core/logistics/types";
import { usesPublicCjKey } from "@/infrastructure/http/cj-public";
import { quoteColombiaInBrowser } from "@/infrastructure/logistics/quote-colombia-public";
import { readBrowserCache, writeBrowserCache } from "../lib/browser-cache";
import type { CardGallery } from "../lib/card-gallery";
import type { GalleryStatus } from "./use-card-galleries";

export type BogotaQuote = {
  status: "loading" | "ready" | "error" | "missing";
  shippingUsd: number | null;
  carrier?: string;
  message?: string;
};

const BOGOTA = { city: "Bogota", province: "Cundinamarca" };
const QUOTE_KEY = "gazu:bogota";

function loadQuotes(): Map<string, BogotaQuote> {
  const stored = readBrowserCache<Record<string, BogotaQuote>>(QUOTE_KEY) ?? {};
  return new Map(
    Object.entries(stored).filter(([, quote]) => quote.status === "ready"),
  );
}

const memory = loadQuotes();

function persistQuotes() {
  writeBrowserCache(QUOTE_KEY, Object.fromEntries(memory));
}

function memoryKey(pid: string, vid: string) {
  return `${pid}:${vid}`;
}

async function requestQuote(gallery: CardGallery): Promise<BogotaQuote> {
  const seed = gallery.freight;
  if (!seed?.vid || !seed.variantSku) {
    return { status: "missing", shippingUsd: null, message: "Sin variante para cotizar" };
  }
  const key = memoryKey(gallery.pid, seed.vid);
  const cached = memory.get(key);
  if (cached) return cached;

  const payload = {
    ...seed,
    quantity: 1,
    city: BOGOTA.city,
    province: BOGOTA.province,
  };
  const data = usesPublicCjKey()
    ? await quoteColombiaInBrowser(payload)
    : await fetch("/api/logistic/quote-colombia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        const body = (await res.json()) as FreightQuoteResponse & { message?: string };
        if (!res.ok) throw new Error(body.message ?? "No se pudo cotizar");
        return body;
      });

  if (!data.ok || data.cheapest == null) {
    return {
      status: "error",
      shippingUsd: null,
      message: data.message ?? "Sin envío a Bogotá",
    };
  }

  const quote: BogotaQuote = {
    status: "ready",
    shippingUsd: data.cheapest.shippingTotalUsd,
    carrier: data.cheapest.carrierName,
  };
  memory.set(key, quote);
  persistQuotes();
  return quote;
}

export function useBogotaQuotes(
  galleries: Record<string, CardGallery>,
  galleryStatus: Record<string, GalleryStatus>,
) {
  const [quotes, setQuotes] = useState<Record<string, BogotaQuote>>({});
  const idsKey = Object.keys(galleryStatus).sort().join("\n");
  const settled = Object.values(galleryStatus);
  const allSettled =
    settled.length > 0 && settled.every((status) => status === "ready" || status === "error");
  const seedKey = Object.values(galleries)
    .map((gallery) => `${gallery.pid}:${gallery.freight?.vid ?? ""}`)
    .sort()
    .join("|");
  const galleriesRef = useRef(galleries);
  galleriesRef.current = galleries;

  useEffect(() => {
    setQuotes({});
  }, [idsKey]);

  useEffect(() => {
    if (!allSettled || !seedKey) return;
    const rows = Object.values(galleriesRef.current).filter((gallery) => gallery.pid);
    if (!rows.length) return;

    let cancelled = false;
    setQuotes((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        next[row.pid] = row.freight
          ? { status: "loading", shippingUsd: null }
          : { status: "missing", shippingUsd: null, message: "Sin variante para cotizar" };
      }
      return next;
    });

    async function run() {
      for (const row of rows) {
        if (cancelled) return;
        try {
          const quote = await requestQuote(row);
          if (cancelled) return;
          setQuotes((prev) => ({ ...prev, [row.pid]: quote }));
        } catch (err) {
          if (cancelled) return;
          setQuotes((prev) => ({
            ...prev,
            [row.pid]: {
              status: "error",
              shippingUsd: null,
              message: err instanceof Error ? err.message : "No se pudo cotizar",
            },
          }));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [allSettled, seedKey]);

  const quotedCount = Object.values(quotes).filter(
    (quote) => quote.status === "ready" || quote.status === "error" || quote.status === "missing",
  ).length;

  return { quotes, quotedCount, total: Object.keys(galleryStatus).length };
}
