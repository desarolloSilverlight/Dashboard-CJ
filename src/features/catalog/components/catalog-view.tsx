"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parentKeyFromName,
  parseSubValue,
  resolveCategoryQuery,
} from "@/core/products/category-tree";
import type { CatalogCacheEntry } from "@/providers/catalog-cache-provider";
import type { CategoryL1, CjProductListItem } from "@/core/products/types";
import { useCardGalleries } from "../hooks/use-card-galleries";
import { ProductCard } from "./product-card";
import { CategoryHierarchySelect } from "@/components/catalog/category-hierarchy-select";
import { useCatalogService } from "../hooks/use-catalog-service";
import { useAuthStatus } from "@/providers/auth-status-provider";
import { useCatalogCache } from "@/providers/catalog-cache-provider";

const PAGE_SIZE = 20;
const DEMO_GALLERY_LIMIT = 5;

export function CatalogView() {
  const { configured } = useAuthStatus();
  const catalog = useCatalogService();
  const cache = useCatalogCache();
  const hydrated = useRef(false);

  const [parentKey, setParentKey] = useState("");
  const [subKey, setSubKey] = useState("all");
  const [keyWord, setKeyWord] = useState("");
  const [categories, setCategories] = useState<CategoryL1[]>([]);
  const [products, setProducts] = useState<CjProductListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);
  const productKey = products.map((p) => p.id).join("\n");
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = products.slice(pageStart, pageStart + PAGE_SIZE);
  const galleryDemoProducts = products.slice(0, DEMO_GALLERY_LIMIT);
  const galleries = useCardGalleries(
    galleryDemoProducts,
    galleryDemoProducts.map((p) => p.id),
  );

  useEffect(() => {
    setPage(1);
  }, [productKey]);

  const selectedL1 = useMemo(
    () =>
      categories.find(
        (c) => parentKeyFromName(c.categoryFirstName) === parentKey,
      ),
    [categories, parentKey],
  );

  const applyCacheEntry = useCallback((entry: CatalogCacheEntry) => {
    setParentKey(entry.parentKey);
    setSubKey(entry.subKey || "all");
    setKeyWord(entry.keyWord);
    setProducts(entry.products.slice(0, 100));
    setTotalRecords(entry.totalRecords);
    setFromCache(true);
    setProgress(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const last = cache.getLastProductCache();
    if (last) applyCacheEntry(last);
  }, [cache, applyCacheEntry]);

  useEffect(() => {
    if (!configured) return;
    const cached = cache.getCategoriesCache();
    if (cached?.length) {
      setCategories(cached);
      return;
    }
    setLoadingCategories(true);
    catalog
      .loadCategories()
      .then((data) => {
        setCategories(data);
        cache.setCategoriesCache(data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error categorías"),
      )
      .finally(() => setLoadingCategories(false));
  }, [configured, catalog, cache]);

  const tryRestoreCache = useCallback(
    (pKey: string, sKey: string, kw: string) => {
      const hit = cache.getProductCache(pKey, sKey, kw);
      if (hit) {
        applyCacheEntry(hit);
        return true;
      }
      setProducts([]);
      setTotalRecords(0);
      setFromCache(false);
      return false;
    },
    [cache, applyCacheEntry],
  );

  const handleParentChange = useCallback(
    (pKey: string) => {
      setParentKey(pKey);
      setSubKey("all");
      if (pKey) tryRestoreCache(pKey, "all", keyWord);
      else {
        setProducts([]);
        setTotalRecords(0);
        setFromCache(false);
      }
    },
    [keyWord, tryRestoreCache],
  );

  const handleSubChange = useCallback(
    (sKey: string) => {
      setSubKey(sKey);
      if (parentKey) tryRestoreCache(parentKey, sKey, keyWord);
    },
    [parentKey, keyWord, tryRestoreCache],
  );

  const searchProducts = useCallback(async () => {
    if (!configured) {
      setError("Configura CJ_API_KEY en .env.local");
      return;
    }
    if (!parentKey || !selectedL1) {
      setError("Elige una categoría padre");
      return;
    }

    const sub = parseSubValue(subKey);
    const query = resolveCategoryQuery(selectedL1, sub);
    if (!query.categoryId && !query.lv3categoryList?.length) {
      setError("Esta categoría no tiene subcategorías con ID");
      return;
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setProgress("Cargando…");
    try {
      const result = await catalog.searchProducts({
        categoryId: query.categoryId,
        lv3categoryList: query.lv3categoryList,
        keyWord,
        onProgress: (loaded, cap, page) =>
          setProgress(`${loaded} / ${cap} (pág. ${page})`),
      });
      setProducts(result.products);
      setTotalRecords(result.totalRecords);
      cache.setProductCache({
        parentKey,
        subKey: subKey || "all",
        keyWord: keyWord.trim(),
        products: result.products,
        totalRecords: result.totalRecords,
      });
      setProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [
    configured,
    catalog,
    parentKey,
    selectedL1,
    subKey,
    keyWord,
    cache,
  ]);

  function goToPage(next: number) {
    setPage(next);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <div className="mb-6 space-y-4 rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)] p-4">
        <CategoryHierarchySelect
          categories={categories}
          parentKey={parentKey}
          subKey={subKey}
          onParentChange={handleParentChange}
          onSubChange={handleSubChange}
          disabled={loadingCategories || !configured}
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <span className="mb-1 block text-[11px] text-[var(--color-cj-faint)]">
              Palabra clave (opcional)
            </span>
            <Input
              value={keyWord}
              onChange={(e) => setKeyWord(e.target.value)}
              placeholder="Dentro de la categoría elegida…"
              onKeyDown={(e) => e.key === "Enter" && searchProducts()}
            />
          </div>
          <Button
            className="h-10 sm:w-44"
            disabled={loading || !parentKey || !configured}
            onClick={searchProducts}
          >
            {loading ? "Cargando…" : "Buscar (100 max)"}
          </Button>
        </div>
        <p className="text-[11px] text-[var(--color-cj-faint)]">
          {loadingCategories
            ? "Cargando categorías…"
            : `${categories.length} categorías padre · subcategorías solo del padre seleccionado`}
        </p>
      </div>

      <div
        ref={resultsRef}
        className="mb-3 flex flex-wrap items-center gap-2 text-sm text-[var(--color-cj-muted)]"
      >
        <span>
          {products.length > 0
            ? `${pageStart + 1}–${pageStart + pageItems.length} de ${products.length}`
            : "0 mostrados"}
          {totalRecords > 0 && ` · ${totalRecords} coincidencias (CJ)`}
        </span>
        {fromCache && products.length > 0 && (
          <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-[var(--color-cj-price)]">
            Caché de esta búsqueda
          </span>
        )}
        {progress && <span className="text-xs text-[var(--color-cj-accent)]">{progress}</span>}
        {products.length > 0 && (
          <span className="text-xs text-[var(--color-cj-accent)]">
            Galerías demo {galleries.readyCount}/{Math.min(DEMO_GALLERY_LIMIT, products.length)}
          </span>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
        {products.length > PAGE_SIZE && (
          <CatalogPager
            page={currentPage}
            pageCount={pageCount}
            onPage={goToPage}
          />
        )}
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {pageItems.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                gallery={galleries.galleries[p.id]}
                galleryState={galleries.status[p.id] ?? "pending"}
                onVisible={galleries.markVisible}
              />
            ))}
          </div>
          {products.length > PAGE_SIZE && (
            <div className="mt-6 flex justify-center">
              <CatalogPager
                page={currentPage}
                pageCount={pageCount}
                onPage={goToPage}
              />
            </div>
          )}
        </>
      ) : (
        !loading && (
          <div className="rounded-xl border border-dashed border-[var(--color-cj-border)] p-12 text-center text-[var(--color-cj-muted)]">
            Elige categoría padre (y opcionalmente una subcategoría) y pulsa Buscar.
          </div>
        )
      )}
    </div>
  );
}

function CatalogPager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const end = Math.min(pageCount, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Páginas">
      <PagerButton disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </PagerButton>
      {start > 1 && (
        <>
          <PagerButton onClick={() => onPage(1)}>1</PagerButton>
          {start > 2 && <span className="px-1 text-[var(--color-cj-faint)]">…</span>}
        </>
      )}
      {pages.map((n) => (
        <PagerButton key={n} current={n === page} onClick={() => onPage(n)}>
          {n}
        </PagerButton>
      ))}
      {end < pageCount && (
        <>
          {end < pageCount - 1 && <span className="px-1 text-[var(--color-cj-faint)]">…</span>}
          <PagerButton onClick={() => onPage(pageCount)}>{pageCount}</PagerButton>
        </>
      )}
      <PagerButton disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        Siguiente
      </PagerButton>
    </nav>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
  current,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  current?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
      className={`min-w-9 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        current
          ? "bg-blue-600 text-white"
          : "bg-[var(--color-cj-chip)] text-[var(--color-cj-muted)] hover:text-[var(--color-cj-text)]"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}
