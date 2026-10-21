"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type TrmRate = {
  valor: number;
  unidad: "COP";
  vigenciaDesde: string;
  vigenciaHasta: string;
  current: boolean;
};

const TrmContext = createContext<TrmRate | null>(null);

export function TrmProvider({ children }: { children: ReactNode }) {
  const [trm, setTrm] = useState<TrmRate | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/fx/trm", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("trm"))))
      .then((data: TrmRate) => {
        if (!cancel && Number.isFinite(data.valor)) setTrm(data);
      })
      .catch(() => {
        if (!cancel) setTrm(null);
      });
    return () => {
      cancel = true;
    };
  }, []);

  return <TrmContext.Provider value={trm}>{children}</TrmContext.Provider>;
}

export function useTrm(): TrmRate | null {
  return useContext(TrmContext);
}
