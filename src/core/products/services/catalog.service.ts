import { buildListV2Query } from "../list-v2-query";
import type { IProductRepository, FetchCatalogResult } from "../repositories/product.repository";
import type { CatalogLoadProgress, ListV2Filters } from "../types";

const MAX_BY_CATEGORY = 500;

export type CategorySearchParams = {
  categoryId?: string;
  lv3categoryList?: string[];
  keyWord?: string;
  onProgress?: CatalogLoadProgress;
  maxProducts?: number;
};

export class CatalogService {
  constructor(private readonly products: IProductRepository) {}

  async loadCategories() {
    const res = await this.products.getCategories();
    if (res.code !== 200 || !Array.isArray(res.data)) {
      throw new Error(res.message ?? "No se pudieron cargar categorías");
    }
    return res.data;
  }

  async searchProducts(params: CategorySearchParams): Promise<FetchCatalogResult> {
    const { categoryId, lv3categoryList, keyWord, onProgress, maxProducts } =
      params;
    if (!categoryId && (!lv3categoryList || lv3categoryList.length === 0)) {
      throw new Error("Selecciona una categoría válida");
    }
    const filters: ListV2Filters = {
      categoryId: categoryId ?? "",
      lv3categoryList: lv3categoryList ?? [],
      keyWord: keyWord?.trim() ?? "",
      countryCode: "",
      orderBy: "0",
      sort: "desc",
    };
    return this.fetchUpTo(filters, maxProducts ?? MAX_BY_CATEGORY, onProgress);
  }

  private async fetchUpTo(
    filters: ListV2Filters,
    maxProducts: number,
    onProgress?: CatalogLoadProgress,
  ): Promise<FetchCatalogResult> {
    const cap = Math.min(MAX_BY_CATEGORY, Math.max(1, maxProducts));
    const pageSize = Math.min(100, cap);
    const items: FetchCatalogResult["products"] = [];
    let totalRecords = 0;
    let page = 1;

    while (items.length < cap) {
      const res = await this.products.listV2(
        buildListV2Query(filters, page, pageSize),
      );
      if (res.code !== 200 || !res.data) {
        throw new Error(res.message ?? `Error CJ ${res.code}`);
      }
      totalRecords = res.data.totalRecords;
      const chunk = res.data.content?.flatMap((c) => c.productList ?? []) ?? [];
      if (chunk.length === 0) break;
      for (const p of chunk) {
        if (items.length >= cap) break;
        items.push(p);
      }
      onProgress?.(items.length, Math.min(cap, totalRecords), page);
      if (page >= res.data.totalPages) break;
      page += 1;
    }

    return { products: items, totalRecords };
  }
}
