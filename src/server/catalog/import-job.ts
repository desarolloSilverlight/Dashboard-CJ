import "server-only";
import { collectL3IdsFromL1, collectL3IdsFromL2 } from "@/core/products/category-tree";
import type { CategoryL1, CjApiResponse, CjProductListItem, ListV2PageData } from "@/core/products/types";
import { buildListV2Query } from "@/core/products/list-v2-query";
import { getValidAccessToken } from "@/server/auth/cj-auth.service";
import { cjHttpClient } from "@/server/cj/cj-http-client";
import { shouldYieldToInteractive } from "@/server/cj/rate-limiter";
import {
  budgetSnapshot,
  CjQuotaError,
  isCjPointRefusal,
} from "@/server/cj/points-budget";
import {
  countProducts,
  readImportRecord,
  upsertListProducts,
  writeImportRecord,
  type ImportNode,
  type ImportRecord,
} from "./catalog-db";

const PAGE_SIZE = 100;
const CAP = 6000;
const LIST_COST = 50;

let loop: Promise<void> | null = null;
let stopRequested = false;

export type ImportJobView = {
  status: ImportRecord["status"];
  message: string;
  products: number;
  currentLabel: string | null;
  currentPage: number | null;
  totalPages: number | null;
  queued: number;
  alive: boolean;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sleepUntilStop(ms: number) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (stopRequested) return;
    await sleep(400);
  }
}

function nodeFromL1(l1: CategoryL1): ImportNode | null {
  const ids = collectL3IdsFromL1(l1);
  if (ids.length === 0) return null;
  const children: ImportNode[] = [];
  for (const l2 of l1.categoryFirstList ?? []) {
    const l2Ids = collectL3IdsFromL2(l2);
    if (l2Ids.length === 0) continue;
    children.push({
      label: `${l1.categoryFirstName} / ${l2.categorySecondName}`,
      lv3categoryList: l2Ids,
      nextPage: 1,
      totalPages: null,
      children: (l2.categorySecondList ?? [])
        .filter((l3) => l3.categoryId)
        .map((l3) => ({
          label: `${l1.categoryFirstName} / ${l2.categorySecondName} / ${l3.categoryName}`,
          categoryId: l3.categoryId,
          nextPage: 1,
          totalPages: null,
          children: [],
        })),
    });
  }
  return {
    label: l1.categoryFirstName,
    lv3categoryList: ids,
    nextPage: 1,
    totalPages: null,
    children,
  };
}

function save(record: ImportRecord) {
  writeImportRecord(record);
}

export function importJobView(): ImportJobView {
  const record = readImportRecord();
  const alive = loop != null;
  const interrupted = record.status === "running" && !alive;
  const current = record.queue[0] ?? null;
  return {
    status: interrupted ? "paused" : record.status,
    message: interrupted
      ? "La carga se detuvo con el servidor. Sigue desde la última página guardada."
      : record.message,
    products: countProducts(),
    currentLabel: current?.label ?? null,
    currentPage: current ? current.nextPage : null,
    totalPages: current?.totalPages ?? null,
    queued: record.queue.length,
    alive,
  };
}

/** Si el proceso se reinició a mitad de carga, el siguiente consulta la retoma. */
export function ensureImportAlive() {
  if (loop) return;
  if (readImportRecord().status !== "running") return;
  startCatalogImport();
}

export function startCatalogImport() {
  stopRequested = false;
  if (loop) return importJobView();
  const current = readImportRecord();
  save({
    ...current,
    status: "running",
    message: "Preparando la carga del listado.",
  });
  loop = run().finally(() => {
    loop = null;
  });
  return importJobView();
}

export function pauseCatalogImport() {
  stopRequested = true;
  const current = readImportRecord();
  if (current.status === "running") {
    save({ ...current, message: "Pausa pedida. Termina la página en curso." });
  }
  return importJobView();
}

async function run() {
  try {
    let record = readImportRecord();
    if (record.queue.length === 0 && record.status !== "done") {
      record = await plan(record);
      if (stopRequested) {
        save({ ...record, status: "paused", message: "Carga en pausa." });
        return;
      }
    }

    while (!stopRequested) {
      record = readImportRecord();
      if (record.queue.length === 0) {
        save({
          status: "done",
          message: `Listado guardado. ${countProducts()} productos en la base local.`,
          queue: [],
        });
        return;
      }

      if (shouldYieldToInteractive()) {
        save({
          ...record,
          status: "running",
          message: "El buscador está usando CJ. La carga espera.",
        });
        await sleepUntilStop(800);
        continue;
      }

      if (budgetSnapshot().importRemaining < LIST_COST) {
        save({
          ...record,
          status: "running",
          message:
            "La carga espera puntos nuevos. La reserva del buscador se queda intacta.",
        });
        await sleepUntilStop(30_000);
        continue;
      }

      const step = await fetchNextPage(record);
      if (step === "stop") return;
    }

    const paused = readImportRecord();
    save({ ...paused, status: "paused", message: "Carga en pausa." });
  } catch (err) {
    const current = readImportRecord();
    save({
      ...current,
      status: "paused",
      message: err instanceof Error ? err.message : "La carga se detuvo.",
    });
  }
}

async function plan(record: ImportRecord): Promise<ImportRecord> {
  save({ ...record, status: "running", message: "Leyendo categorías." });
  const token = await getValidAccessToken();
  const { body } = await cjHttpClient.request<CategoryL1[]>("/product/getCategory", {
    method: "GET",
    token,
    lane: "import",
  });
  const envelope = body as CjApiResponse<CategoryL1[]>;
  if (envelope.code !== 200 || !Array.isArray(envelope.data)) {
    throw new Error(envelope.message ?? "No se pudieron leer las categorías");
  }
  const queue = envelope.data
    .map(nodeFromL1)
    .filter((node): node is ImportNode => node != null);
  const next: ImportRecord = {
    status: "running",
    message: `${queue.length} categorías padre en cola.`,
    queue,
  };
  save(next);
  return next;
}

async function fetchNextPage(record: ImportRecord): Promise<"continue" | "stop"> {
  const node = record.queue[0];
  if (!node) return "continue";
  const token = await getValidAccessToken();
  const query = buildListV2Query(
    {
      categoryId: node.categoryId ?? "",
      lv3categoryList: node.categoryId ? [] : (node.lv3categoryList ?? []),
      keyWord: "",
      countryCode: "",
      orderBy: "0",
      sort: "desc",
    },
    node.nextPage,
    PAGE_SIZE,
  );

  let body: unknown;
  try {
    const response = await cjHttpClient.request<ListV2PageData>("/product/listV2", {
      method: "GET",
      token,
      query,
      lane: "import",
    });
    body = response.body;
  } catch (err) {
    if (err instanceof CjQuotaError) {
      save({
        ...record,
        status: "running",
        message: "Sin puntos de carga en este momento. El buscador conserva su reserva.",
      });
      await sleepUntilStop(30_000);
      return stopRequested ? "stop" : "continue";
    }
    throw err;
  }

  const envelope = body as CjApiResponse<ListV2PageData>;
  if (envelope.code !== 200 || !envelope.data) {
    if (isCjPointRefusal(envelope.message)) {
      save({
        ...record,
        status: "running",
        message: "CJ no soltó más puntos. La carga espera y el buscador también, unos minutos.",
      });
      await sleepUntilStop(5 * 60 * 1000);
      return stopRequested ? "stop" : "continue";
    }
    throw new Error(envelope.message ?? "Error al bajar el listado");
  }

  const totalRecords = Number(envelope.data.totalRecords) || 0;
  const totalPages = Math.max(1, Number(envelope.data.totalPages) || 1);
  if (node.nextPage === 1 && totalRecords >= CAP && node.children.length > 0) {
    const queue = [...node.children, ...record.queue.slice(1)];
    save({
      status: "running",
      message: `${node.label} llega al tope de 6.000. Se parte en ${node.children.length} grupos.`,
      queue,
    });
    return "continue";
  }

  const items =
    envelope.data.content?.flatMap((block) => block.productList ?? []) ?? [];
  upsertListProducts(items.filter((item): item is CjProductListItem => Boolean(item?.id)));

  const queue = [...record.queue];
  if (node.nextPage >= totalPages || items.length === 0) {
    queue.shift();
  } else {
    queue[0] = { ...node, nextPage: node.nextPage + 1, totalPages };
  }

  const saved = countProducts();
  save({
    status: "running",
    message: `${node.label} · página ${node.nextPage} de ${totalPages}. ${saved} productos guardados.`,
    queue,
  });
  return "continue";
}
