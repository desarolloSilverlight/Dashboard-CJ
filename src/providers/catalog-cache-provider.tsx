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

const TTL_MS =
  Number(process.env.NEXT_PUBLIC_CATALOG_CACHE_TTL_MS) || 30 * 60 * 1000;

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
      const entry = productsByKey.current.get(cacheKey);
      if (!entry || !isFresh(entry.fetchedAt)) return null;
      return entry;
    },
    [],
  );

  const getLastProductCache = useCallback(() => {
    const key = lastCacheKey.current;
    if (!key) return null;
    const entry = productsByKey.current.get(key);
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
    },
    [],
  );

  const getCategoriesCache = useCallback(() => {
    const c = categoriesRef.current;
    if (!c || !isFresh(c.fetchedAt)) return null;
    return c.data;
  }, []);

  const setCategoriesCache = useCallback((categories: CategoryL1[]) => {
    categoriesRef.current = { data: categories, fetchedAt: Date.now() };
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
