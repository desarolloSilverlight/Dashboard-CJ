import type { IProductRepository } from "@/core/products/repositories/product.repository";
import type { CategoryL1, CjApiResponse, ListV2PageData } from "@/core/products/types";
import type { BffClient } from "@/infrastructure/http/bff-client";

export class BffProductRepository implements IProductRepository {
  constructor(private readonly bff: BffClient) {}

  getCategories() {
    return this.bff.get<CategoryL1[]>("/product/getCategory");
  }

  listV2(query: Record<string, unknown>) {
    return this.bff.get<ListV2PageData>("/product/listV2", query);
  }

  getProductDetail(pid: string, options?: { countryCode?: string }) {
    return this.bff.get("/product/query", {
      pid,
      countryCode: options?.countryCode,
      features: ["enable_video", "enable_combine"],
    });
  }

  getStockByPid(pid: string) {
    return this.bff.get("/product/stock/queryByPid", { pid });
  }

  proxyGet<T>(path: string, query?: Record<string, unknown>) {
    return this.bff.get<T>(path, query);
  }

  proxyPost<T>(path: string, body: unknown) {
    return this.bff.post<T>(path, body);
  }
}
