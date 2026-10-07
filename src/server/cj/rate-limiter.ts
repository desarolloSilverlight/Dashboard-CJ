import "server-only";

/** CJ: QPS = 1 — mínimo 1 segundo entre llamadas (margen configurable). */
const INTERVAL_MS =
  Number(process.env.CJ_QPS_INTERVAL_MS) || 1100;

let tail: Promise<unknown> = Promise.resolve();
let lastStartAt = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitTurn() {
  const now = Date.now();
  const wait = Math.max(0, lastStartAt + INTERVAL_MS - now);
  if (wait > 0) await sleep(wait);
  lastStartAt = Date.now();
}

/** Serializa todas las peticiones salientes hacia CJ. */
export function enqueueCj<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(async () => {
    await waitTurn();
    return task();
  });
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function isCjRateLimitMessage(message: unknown): boolean {
  const msg = String(message ?? "").toLowerCase();
  return (
    msg.includes("qps") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit")
  );
}
