import type {
  CategoryL1,
  CjApiResponse,
  CjProductListItem,
  ListV2Filters,
  ListV2PageData,
} from "../types";

/** Contrato de acceso a datos de productos (Repository pattern). */
export interface IProductRepository {
  getCategories(): Promise<CjApiResponse<CategoryL1[]>>;
  listV2(
    query: Record<string, unknown>,
  ): Promise<CjApiResponse<ListV2PageData>>;
  getProductDetail(
    pid: string,
    options?: { countryCode?: string },
  ): Promise<CjApiResponse<unknown>>;
  getStockByPid(pid: string): Promise<CjApiResponse<unknown>>;
  proxyGet<T>(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<CjApiResponse<T>>;
  proxyPost<T>(path: string, body: unknown): Promise<CjApiResponse<T>>;
}

export type FetchCatalogResult = {
  products: CjProductListItem[];
  totalRecords: number;
};
