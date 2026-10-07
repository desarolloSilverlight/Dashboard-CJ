"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  parentKeyFromName,
  parseSubValue,
  resolveCategoryQuery,
} from "@/core/products/category-tree";
import type { CatalogCacheEntry } from "@/providers/catalog-cache-provider";
import { listStockFromListItem } from "@/core/products/stock-merge";
import type { CategoryL1, CjProductListItem } from "@/core/products/types";
import { CategoryHierarchySelect } from "@/components/catalog/category-hierarchy-select";
import { useCatalogService } from "../hooks/use-catalog-service";
import { useAuthStatus } from "@/providers/auth-status-provider";
import { useCatalogCache } from "@/providers/catalog-cache-provider";

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
    setProducts(entry.products);
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
            <span className="mb-1 block text-[11px] text-slate-500">
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
            {loading ? "Cargando…" : "Buscar (500 max)"}
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">
          {loadingCategories
            ? "Cargando categorías…"
            : `${categories.length} categorías padre · subcategorías solo del padre seleccionado`}
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span>
          {products.length} mostrados
          {totalRecords > 0 && ` · ${totalRecords} coincidencias (CJ)`}
        </span>
        {fromCache && products.length > 0 && (
          <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
            Caché de esta búsqueda
          </span>
        )}
        {progress && <span className="text-xs text-blue-300">{progress}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>

      {products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        !loading && (
          <div className="rounded-xl border border-dashed border-[var(--color-cj-border)] p-12 text-center text-slate-500">
            Elige categoría padre (y opcionalmente una subcategoría) y pulsa Buscar.
          </div>
        )
      )}
    </div>
  );
}

function ProductCard({ product }: { product: CjProductListItem }) {
  const price = product.nowPrice ?? product.discountPrice ?? product.sellPrice;
  const stock = listStockFromListItem(product);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-cj-border)] bg-[var(--color-cj-panel)]">
      <div className="aspect-square bg-black/30 p-3">
        {product.bigImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.bigImage}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-600">
            Sin imagen
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 flex-1 text-sm font-medium leading-snug">
          {product.nameEn ?? product.sku}
        </h3>
        <p className="mt-2 text-lg font-semibold text-emerald-400">
          {price != null ? `$${price}` : "—"}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {stock.value != null ? (
            <>
              {stock.label}:{" "}
              <span className="font-medium text-slate-200">
                {stock.value.toLocaleString("es")} uds.
              </span>
            </>
          ) : (
            <span className="text-slate-600">Stock: sin dato en listado</span>
          )}
        </p>
        <Link
          href={`/product/${product.id}`}
          className="mt-3 inline-flex justify-center rounded-lg bg-blue-600 py-2 text-sm font-medium hover:bg-blue-500"
        >
          Ver detalle
        </Link>
      </div>
    </article>
  );
}
