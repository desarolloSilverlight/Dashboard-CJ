"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { buildCatalogCacheKey } from "@/core/catalog/cache-key";
import type { CategoryL1, CjProductListItem } from "@/core/products/types";
import { readBrowserCache, writeBrowserCache } from "@/features/catalog/lib/browser-cache";

const TTL_MS =
  Number(process.env.NEXT_PUBLIC_CATALOG_CACHE_TTL_MS) || 6 * 60 * 60 * 1000;
const INDEX_KEY = "gazu:catalog-index";
const LAST_KEY = "gazu:catalog-last";
const CATEGORIES_KEY = "gazu:categories";

function entryKey(cacheKey: string) {
  return `gazu:catalog:${cacheKey}`;
}

export type CatalogCacheEntry = {
  cacheKey: string;
  parentKey: string;
  subKey: string;
  keyWord: string;
  products: CjProductListItem[];
  totalRecords: number;
  fetchedAt: number;
};

type CatalogCacheContextValue = {
  getProductCache: (
    parentKey: string,
    subKey: string,
    keyWord: string,
  ) => CatalogCacheEntry | null;
  setProductCache: (
    entry: Omit<CatalogCacheEntry, "fetchedAt" | "cacheKey">,
  ) => void;
  getLastProductCache: () => CatalogCacheEntry | null;
  getCategoriesCache: () => CategoryL1[] | null;
  setCategoriesCache: (categories: CategoryL1[]) => void;
};

const CatalogCacheContext = createContext<CatalogCacheContextValue | null>(null);

function isFresh(fetchedAt: number) {
  return Date.now() - fetchedAt < TTL_MS;
}

export function CatalogCacheProvider({ children }: { children: ReactNode }) {
  const productsByKey = useRef<Map<string, CatalogCacheEntry>>(new Map());
  const lastCacheKey = useRef<string | null>(null);
  const categoriesRef = useRef<{ data: CategoryL1[]; fetchedAt: number } | null>(
    null,
  );

  const getProductCache = useCallback(
    (parentKey: string, subKey: string, keyWord: string) => {
      if (!parentKey) return null;
      const cacheKey = buildCatalogCacheKey(parentKey, subKey, keyWord);
      let entry = productsByKey.current.get(cacheKey);
      if (!entry) {
        entry = readBrowserCache<CatalogCacheEntry>(entryKey(cacheKey)) ?? undefined;
        if (entry) productsByKey.current.set(cacheKey, entry);
      }
      if (!entry || !isFresh(entry.fetchedAt)) return null;
      return entry;
    },
    [],
  );

  const getLastProductCache = useCallback(() => {
    const key = lastCacheKey.current ?? readBrowserCache<string>(LAST_KEY);
    if (key) lastCacheKey.current = key;
    if (!key) return null;
    let entry = productsByKey.current.get(key);
    if (!entry) {
      entry = readBrowserCache<CatalogCacheEntry>(entryKey(key)) ?? undefined;
      if (entry) productsByKey.current.set(key, entry);
    }
    if (!entry || !isFresh(entry.fetchedAt)) return null;
    return entry;
  }, []);

  const setProductCache = useCallback(
    (entry: Omit<CatalogCacheEntry, "fetchedAt" | "cacheKey">) => {
      const cacheKey = buildCatalogCacheKey(
        entry.parentKey,
        entry.subKey,
        entry.keyWord,
      );
      const full: CatalogCacheEntry = {
        ...entry,
        cacheKey,
        fetchedAt: Date.now(),
      };
      productsByKey.current.set(cacheKey, full);
      lastCacheKey.current = cacheKey;
      writeBrowserCache(entryKey(cacheKey), full);
      writeBrowserCache(LAST_KEY, cacheKey);
      const index = readBrowserCache<string[]>(INDEX_KEY) ?? [];
      if (!index.includes(cacheKey)) {
        writeBrowserCache(INDEX_KEY, [...index, cacheKey]);
      }
    },
    [],
  );

  const getCategoriesCache = useCallback(() => {
    let c = categoriesRef.current;
    if (!c) {
      c = readBrowserCache<{ data: CategoryL1[]; fetchedAt: number }>(CATEGORIES_KEY);
      if (c) categoriesRef.current = c;
    }
    if (!c || !isFresh(c.fetchedAt)) return null;
    return c.data;
  }, []);

  const setCategoriesCache = useCallback((categories: CategoryL1[]) => {
    const next = { data: categories, fetchedAt: Date.now() };
    categoriesRef.current = next;
    writeBrowserCache(CATEGORIES_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      getProductCache,
      setProductCache,
      getLastProductCache,
      getCategoriesCache,
      setCategoriesCache,
    }),
    [
      getProductCache,
      setProductCache,
      getLastProductCache,
      getCategoriesCache,
      setCategoriesCache,
    ],
  );

  return (
    <CatalogCacheContext.Provider value={value}>
      {children}
    </CatalogCacheContext.Provider>
  );
}

export function useCatalogCache() {
  const ctx = useContext(CatalogCacheContext);
  if (!ctx) throw new Error("useCatalogCache within CatalogCacheProvider");
  return ctx;
}
