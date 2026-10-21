"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { readBrowserCache, writeBrowserCache } from "@/features/catalog/lib/browser-cache";

const STORAGE_KEY = "gazu:admin-sync";

export type SyncDraft = {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  unitUsd: number | null;
  shippingUsd: number | null;
  variantCount: number | null;
};

export type ShopifyMockItem = SyncDraft & {
  publishedPriceUsd: number | null;
  publishedBenefit: number;
  sentAt: number;
};

type Stored = {
  benefitPercent: number;
  queue: SyncDraft[];
  shopify: ShopifyMockItem[];
};

type AdminSyncValue = {
  benefitPercent: number;
  setBenefitPercent: (value: number) => void;
  queue: SyncDraft[];
  shopify: ShopifyMockItem[];
  addToQueue: (items: SyncDraft[]) => number;
  removeFromQueue: (id: string) => void;
  sendToShopify: (ids: string[], priceOf: (item: SyncDraft) => number | null) => number;
  updateShopifyPrices: (priceOf: (item: SyncDraft) => number | null) => number;
};

const AdminSyncContext = createContext<AdminSyncValue | null>(null);

function load(): Stored {
  const stored = readBrowserCache<Stored>(STORAGE_KEY);
  return {
    benefitPercent:
      stored && Number.isFinite(stored.benefitPercent) ? stored.benefitPercent : 100,
    queue: stored?.queue ?? [],
    shopify: stored?.shopify ?? [],
  };
}

export function AdminSyncProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Stored>({
    benefitPercent: 100,
    queue: [],
    shopify: [],
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const stored = load();
    stateRef.current = stored;
    setState(stored);
  }, []);

  const commit = useCallback((recipe: (current: Stored) => Stored) => {
    const next = recipe(stateRef.current);
    stateRef.current = next;
    setState(next);
    writeBrowserCache(STORAGE_KEY, next);
  }, []);

  const setBenefitPercent = useCallback(
    (value: number) => {
      const benefitPercent = Number.isFinite(value) ? Math.max(0, value) : 0;
      commit((current) => ({ ...current, benefitPercent }));
    },
    [commit],
  );

  const addToQueue = useCallback(
    (items: SyncDraft[]) => {
      let added = 0;
      commit((current) => {
        const byId = new Map(current.queue.map((item) => [item.id, item]));
        added = 0;
        for (const item of items) {
          if (!byId.has(item.id)) added += 1;
          byId.set(item.id, item);
        }
        return { ...current, queue: [...byId.values()] };
      });
      return added;
    },
    [commit],
  );

  const removeFromQueue = useCallback(
    (id: string) => {
      commit((current) => ({
        ...current,
        queue: current.queue.filter((item) => item.id !== id),
      }));
    },
    [commit],
  );

  const sendToShopify = useCallback(
    (ids: string[], priceOf: (item: SyncDraft) => number | null) => {
      let sent = 0;
      commit((current) => {
        const chosen = new Set(ids);
        const sending = current.queue.filter((item) => chosen.has(item.id));
        sent = sending.length;
        if (!sending.length) return current;
        const now = Date.now();
        const published = new Map(current.shopify.map((item) => [item.id, item]));
        for (const item of sending) {
          published.set(item.id, {
            ...item,
            publishedPriceUsd: priceOf(item),
            publishedBenefit: current.benefitPercent,
            sentAt: now,
          });
        }
        return {
          ...current,
          queue: current.queue.filter((item) => !chosen.has(item.id)),
          shopify: [...published.values()],
        };
      });
      return sent;
    },
    [commit],
  );

  const updateShopifyPrices = useCallback(
    (priceOf: (item: SyncDraft) => number | null) => {
      let count = 0;
      commit((current) => {
        count = current.shopify.length;
        if (!count) return current;
        return {
          ...current,
          shopify: current.shopify.map((item) => ({
            ...item,
            publishedPriceUsd: priceOf(item),
            publishedBenefit: current.benefitPercent,
          })),
        };
      });
      return count;
    },
    [commit],
  );

  const value = useMemo(
    () => ({
      benefitPercent: state.benefitPercent,
      setBenefitPercent,
      queue: state.queue,
      shopify: state.shopify,
      addToQueue,
      removeFromQueue,
      sendToShopify,
      updateShopifyPrices,
    }),
    [
      state,
      setBenefitPercent,
      addToQueue,
      removeFromQueue,
      sendToShopify,
      updateShopifyPrices,
    ],
  );

  return <AdminSyncContext.Provider value={value}>{children}</AdminSyncContext.Provider>;
}

export function useAdminSync() {
  const ctx = useContext(AdminSyncContext);
  if (!ctx) throw new Error("useAdminSync dentro de AdminSyncProvider");
  return ctx;
}
