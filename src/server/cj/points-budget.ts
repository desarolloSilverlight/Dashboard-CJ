import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DAILY_POINTS = positiveInt(process.env.CJ_DAILY_POINTS, 50_000);
/** Puntos que la carga del listado no puede gastar. Quedan para buscar, ficha y flete. */
export const RESERVED_POINTS = Math.min(
  DAILY_POINTS,
  positiveInt(process.env.CJ_RESERVED_DAILY_POINTS, 10_000),
);

const POINTS_PER_MINUTE = DAILY_POINTS / 1440;

const COSTS: Record<string, number> = {
  "/product/listV2": 50,
  "/product/list": 50,
  "/product/query": 10,
  "/product/stock/queryByPid": 10,
  "/logistic/freightCalculate": 10,
  "/logistic/freightCalculateTip": 10,
};

export type PointLane = "interactive" | "import";

export class CjQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CjQuotaError";
  }
}

type Ledger = {
  day: string;
  interactive: number;
  import: number;
  holdUntil: number;
};

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function utcDay(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function filePath(): string {
  return path.join(process.cwd(), "data", "cj-budget.json");
}

function emptyLedger(): Ledger {
  return { day: utcDay(), interactive: 0, import: 0, holdUntil: 0 };
}

function readLedger(): Ledger {
  try {
    const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as Partial<Ledger>;
    const today = utcDay();
    if (parsed.day !== today) return emptyLedger();
    return {
      day: today,
      interactive: Number(parsed.interactive) || 0,
      import: Number(parsed.import) || 0,
      holdUntil: Number(parsed.holdUntil) || 0,
    };
  } catch {
    return emptyLedger();
  }
}

function writeLedger(ledger: Ledger) {
  const dir = path.dirname(filePath());
  mkdirSync(dir, { recursive: true });
  writeFileSync(filePath(), JSON.stringify(ledger), "utf8");
}

export function pointCost(cjPath: string): number {
  return COSTS[cjPath] ?? 0;
}

export function isCjPointRefusal(message: unknown): boolean {
  const msg = String(message ?? "").toLowerCase();
  return (
    msg.includes("point") ||
    msg.includes("quota") ||
    msg.includes("insufficient") ||
    msg.includes("puntos")
  );
}

/** CJ rechazó por puntos: nadie llama por unos minutos, ni el buscador ni la carga. */
export function holdBudget(ms = 5 * 60 * 1000) {
  const ledger = readLedger();
  ledger.holdUntil = Date.now() + ms;
  writeLedger(ledger);
}

export type BudgetSnapshot = {
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

function releasedSoFar(now = Date.now()): number {
  const start = Date.parse(`${utcDay(now)}T00:00:00.000Z`);
  const minutes = Math.max(0, (now - start) / 60_000);
  return Math.min(DAILY_POINTS, minutes * POINTS_PER_MINUTE);
}

export function budgetSnapshot(now = Date.now()): BudgetSnapshot {
  const ledger = readLedger();
  const released = releasedSoFar(now);
  const spent = ledger.interactive + ledger.import;
  const bucket = Math.max(0, released - spent);
  const cushion = Math.max(0, RESERVED_POINTS - ledger.interactive);
  const importCeiling = Math.max(0, DAILY_POINTS - RESERVED_POINTS - ledger.import);
  const held = ledger.holdUntil > now;
  const interactiveRemaining = held ? 0 : Math.floor(Math.min(bucket, DAILY_POINTS - spent));
  const importRemaining = held
    ? 0
    : Math.floor(Math.max(0, Math.min(importCeiling, bucket - cushion)));

  return {
    day: ledger.day,
    daily: DAILY_POINTS,
    reserved: RESERVED_POINTS,
    released: Math.floor(released),
    spentInteractive: ledger.interactive,
    spentImport: ledger.import,
    interactiveRemaining,
    importRemaining,
    holdUntil: held ? ledger.holdUntil : null,
  };
}

export function tryCharge(lane: PointLane, points: number, now = Date.now()): boolean {
  if (points <= 0) return true;
  const snap = budgetSnapshot(now);
  const room = lane === "import" ? snap.importRemaining : snap.interactiveRemaining;
  if (room < points) return false;
  const ledger = readLedger();
  if (lane === "import") ledger.import += points;
  else ledger.interactive += points;
  writeLedger(ledger);
  return true;
}

export function interactiveQuotaMessage(): string {
  const snap = budgetSnapshot();
  if (snap.holdUntil) {
    return "CJ acaba de rechazar por puntos. El buscador espera unos minutos y la carga del listado también.";
  }
  return `La cuota del buscador se está reponiendo (${snap.interactiveRemaining} puntos listos de ${snap.reserved} reservados). La carga del listado no usa esa reserva.`;
}
