import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type TranslationBatch = {
  configured: boolean;
  translations: Record<string, string>;
  message: string | null;
};

type DeepLResponse = {
  translations?: Array<{ text?: string }>;
  message?: string;
};

function cachePath() {
  return path.join(process.cwd(), "data", "deepl-es.json");
}

function readCache(): Record<string, string> {
  try {
    const parsed = JSON.parse(readFileSync(cachePath(), "utf8")) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, string>) {
  const dir = path.dirname(cachePath());
  mkdirSync(dir, { recursive: true });
  writeFileSync(cachePath(), JSON.stringify(cache), "utf8");
}

export function deeplConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY?.trim());
}

function apiBase(key: string): string {
  const custom = process.env.DEEPL_API_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

let chain: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function callDeepL(texts: string[], key: string): Promise<string[]> {
  const response = await fetch(`${apiBase(key)}/v2/translate`, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "EN",
      target_lang: "ES",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as DeepLResponse;
  if (!response.ok) {
    throw new Error(body.message ?? `DeepL respondió ${response.status}`);
  }
  const translated = body.translations?.map((row) => row.text ?? "") ?? [];
  if (translated.length !== texts.length) {
    throw new Error("DeepL no devolvió una traducción por cada nombre");
  }
  return translated;
}

export function translateNames(texts: string[]): Promise<TranslationBatch> {
  return enqueue(() => translateNamesNow(texts));
}

async function translateNamesNow(texts: string[]): Promise<TranslationBatch> {
  const unique = [...new Set(texts.map((text) => text.trim()).filter(Boolean))].slice(0, 50);
  const key = process.env.DEEPL_API_KEY?.trim() ?? "";
  if (!key) {
    return {
      configured: false,
      translations: {},
      message: null,
    };
  }

  const cache = readCache();
  const missing = unique.filter((text) => !cache[text]);
  if (missing.length > 0) {
    const translated = await callDeepL(missing, key);
    missing.forEach((text, index) => {
      const spanish = translated[index]?.trim();
      if (spanish) cache[text] = spanish;
    });
    writeCache(cache);
  }

  const translations: Record<string, string> = {};
  for (const text of unique) {
    if (cache[text]) translations[text] = cache[text];
  }
  return { configured: true, translations, message: null };
}
