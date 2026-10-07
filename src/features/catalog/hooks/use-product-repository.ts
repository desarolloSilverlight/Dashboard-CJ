"use client";

import { useMemo } from "react";
import { createProductRepository } from "@/infrastructure/products/create-product-repository";

export function useProductRepository() {
  return useMemo(() => createProductRepository(), []);
}
