"use client";

import { useEffect, useState } from "react";

type Payload = {
  configured?: boolean;
  translations?: Record<string, string>;
  message?: string | null;
};

export function useNameTranslations(names: string[]) {
  const key = [...new Set(names.map((name) => name.trim()).filter(Boolean))].join("\n");
  const [spanish, setSpanish] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const texts = key ? key.split("\n") : [];
    let cancel = false;
    setPending(texts.length > 0);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts }),
    })
      .then(async (res) => {
        const data = (await res.json()) as Payload;
        if (!res.ok && !data.message) throw new Error("No se pudo traducir");
        return data;
      })
      .then((data) => {
        if (cancel) return;
        setConfigured(Boolean(data.configured));
        setSpanish(data.translations ?? {});
        setMessage(data.message ?? null);
      })
      .catch(() => {
        if (!cancel) setMessage("No se pudo pedir la traducción.");
      })
      .finally(() => {
        if (!cancel) setPending(false);
      });
    return () => {
      cancel = true;
    };
  }, [key]);

  return { spanish, configured, pending, message };
}
