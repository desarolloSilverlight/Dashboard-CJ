"use client";

import { useMemo } from "react";
import { createCatalogService } from "@/infrastructure/products/create-product-repository";

export function useCatalogService() {
  return useMemo(() => createCatalogService(), []);
}
