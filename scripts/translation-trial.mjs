import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pipeline, env } from "@huggingface/transformers";

const root = process.cwd();
const dataDir = path.join(root, "data");
mkdirSync(dataDir, { recursive: true });

function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function loadEnvKey() {
  const raw = readFileSync(path.join(root, ".env.local"), "utf8");
  const line = raw.split(/\r?\n/).find((row) => row.startsWith("DEEPL_API_KEY="));
  return line ? line.slice("DEEPL_API_KEY=".length).trim() : "";
}

const db = new DatabaseSync(path.join(dataDir, "catalog.sqlite"));
const picked = db
  .prepare(
    `SELECT name_en AS name, one_category_name AS category
     FROM (
       SELECT name_en, one_category_name,
              ROW_NUMBER() OVER (PARTITION BY one_category_name ORDER BY length(name_en)) AS n
       FROM products
       WHERE name_en IS NOT NULL AND length(name_en) BETWEEN 28 AND 90
     )
     WHERE n = 3
     LIMIT 8`,
  )
  .all();

const trialPath = path.join(dataDir, "translation-trial.json");
const existing = readJson(trialPath, null);
const items =
  existing?.items?.length === 8
    ? existing.items
    : picked.map((row) => ({
        english: row.name,
        category: row.category,
        deepl: null,
        local: null,
      }));

writeJson(trialPath, { items, updatedAt: new Date().toISOString() });

const key = loadEnvKey();
const deeplCachePath = path.join(dataDir, "deepl-es.json");
const deeplCache = readJson(deeplCachePath, {});
if (key) {
  const missing = items.filter((item) => !deeplCache[item.english]);
  if (missing.length > 0) {
    const base = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
    const response = await fetch(`${base}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: missing.map((item) => item.english),
        source_lang: "EN",
        target_lang: "ES",
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      console.error("DeepL", response.status, body.message ?? "error");
    } else {
      missing.forEach((item, index) => {
        const spanish = body.translations?.[index]?.text?.trim();
        if (spanish) deeplCache[item.english] = spanish;
      });
      writeJson(deeplCachePath, deeplCache);
      const chars = missing.reduce((sum, item) => sum + item.english.length, 0);
      console.log(`DeepL: ${missing.length} nombres, ${chars} caracteres`);
    }
  }
} else {
  console.log("DeepL: la línea DEEPL_API_KEY sigue vacía en .env.local");
}

for (const item of items) item.deepl = deeplCache[item.english] ?? null;
writeJson(trialPath, { items, updatedAt: new Date().toISOString() });

env.cacheDir = path.join(dataDir, "models");
console.log("Modelo local: descargando o cargando…");
const translator = await pipeline("translation", "Xenova/opus-mt-en-es");
const opusCachePath = path.join(dataDir, "opus-es.json");
const opusCache = readJson(opusCachePath, {});
for (const item of items) {
  if (opusCache[item.english]) {
    item.local = opusCache[item.english];
    continue;
  }
  const result = await translator(item.english);
  const spanish = Array.isArray(result) ? result[0]?.translation_text : result?.translation_text;
  if (spanish) {
    opusCache[item.english] = spanish.trim();
    item.local = opusCache[item.english];
    writeJson(opusCachePath, opusCache);
    writeJson(trialPath, { items, updatedAt: new Date().toISOString() });
    console.log("Local:", item.english.slice(0, 48));
  }
}
console.log("Listo");
