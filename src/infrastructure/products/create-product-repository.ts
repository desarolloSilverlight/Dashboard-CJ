"use client";

import { BffProductRepository } from "./bff-product.repository";
import { BffClient } from "@/infrastructure/http/bff-client";
import { CatalogService } from "@/core/products/services/catalog.service";

const sharedBff = new BffClient();

export function createCatalogService() {
  return new CatalogService(new BffProductRepository(sharedBff));
}

export function createProductRepository() {
  return new BffProductRepository(sharedBff);
}
