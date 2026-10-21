import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SOURCE =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=7&$order=vigenciadesde%20DESC";

export type TrmRate = {
  valor: number;
  unidad: "COP";
  vigenciaDesde: string;
  vigenciaHasta: string;
  current: boolean;
};

type Row = {
  valor?: string;
  unidad?: string;
  vigenciadesde?: string;
  vigenciahasta?: string;
};

function filePath() {
  return path.join(process.cwd(), "data", "trm.json");
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

function bogotaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function coversToday(desde: string, hasta: string): boolean {
  const today = bogotaToday();
  return day(desde) <= today && today <= day(hasta);
}

function readCache(): TrmRate | null {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as TrmRate;
    if (!Number.isFinite(parsed.valor) || !parsed.vigenciaDesde || !parsed.vigenciaHasta) return null;
    return { ...parsed, current: coversToday(parsed.vigenciaDesde, parsed.vigenciaHasta) };
  } catch {
    return null;
  }
}

function writeCache(rate: TrmRate) {
  const dir = path.dirname(filePath());
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath(), JSON.stringify(rate), "utf8");
}

function fromRow(row: Row): TrmRate | null {
  const valor = Number(row.valor);
  if (!Number.isFinite(valor) || valor <= 0 || !row.vigenciadesde || !row.vigenciahasta) return null;
  return {
    valor,
    unidad: "COP",
    vigenciaDesde: row.vigenciadesde,
    vigenciaHasta: row.vigenciahasta,
    current: coversToday(row.vigenciadesde, row.vigenciahasta),
  };
}

async function fetchLatest(): Promise<TrmRate> {
  const response = await fetch(SOURCE, { cache: "no-store" });
  if (!response.ok) throw new Error(`TRM ${response.status}`);
  const rows = (await response.json()) as Row[];
  const rates = rows.map(fromRow).filter((rate): rate is TrmRate => rate != null);
  const current = rates.find((rate) => rate.current);
  const chosen = current ?? rates[0];
  if (!chosen) throw new Error("La fuente de la TRM no trajo una tasa");
  return chosen;
}

export async function getTrm(): Promise<TrmRate> {
  const cached = readCache();
  if (cached?.current) return cached;
  try {
    const fresh = await fetchLatest();
    writeCache(fresh);
    return fresh;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}
