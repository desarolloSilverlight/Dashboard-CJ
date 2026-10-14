export interface CjApiResponse<T = unknown> {
  code: number;
  result?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  requestId?: string;
}

export interface CjProductListItem {
  id: string;
  nameEn?: string;
  sku?: string;
  spu?: string;
  bigImage?: string;
  sellPrice?: string;
  nowPrice?: string;
  discountPrice?: string;
  discountPriceRate?: string;
  listedNum?: number;
  categoryId?: string;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  warehouseInventoryNum?: number;
  totalVerifiedInventory?: number;
  totalUnVerifiedInventory?: number;
  addMarkStatus?: number;
  isVideo?: number;
  productType?: string;
  supplierName?: string;
  createAt?: number | string;
  verifiedWarehouse?: number;
  customization?: number;
  isPersonalized?: number;
  hasCECertification?: number;
  deliveryCycle?: string;
  directMinOrderNum?: string;
  variantKeyEn?: string;
  /** Solo si el listado pide enable_description. No es la galería del detalle. */
  description?: string;
  productImageSet?: string[] | string;
  [key: string]: unknown;
}

export type VariantStockRow = {
  vid?: string;
  variantSku?: string;
  variantKey?: string;
  byCountry: Record<string, number>;
  total: number;
};

export type ProductStockSnapshot = {
  productTotal?: number;
  variantRows: VariantStockRow[];
  source: "detail" | "api" | "merged";
};

export interface ListV2Filters {
  categoryId: string;
  lv3categoryList: string[];
  keyWord: string;
  countryCode: string;
  orderBy: string;
  sort: string;
}

export const defaultListV2Filters = (): ListV2Filters => ({
  categoryId: "",
  lv3categoryList: [],
  keyWord: "",
  countryCode: "",
  orderBy: "0",
  sort: "desc",
});

export interface CategoryL3 {
  categoryId: string;
  categoryName: string;
}

export interface CategoryL2 {
  categorySecondName: string;
  categorySecondList: CategoryL3[];
}

export interface CategoryL1 {
  categoryFirstName: string;
  categoryFirstList: CategoryL2[];
}

export interface ListV2PageData {
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
  totalPages: number;
  content: Array<{
    productList: CjProductListItem[];
  }>;
}

export type CatalogLoadProgress = (
  loaded: number,
  cap: number,
  page: number,
) => void;

export interface FlatCategory {
  id: string;
  label: string;
  searchText: string;
}

export interface CjVariantInventory {
  countryCode?: string;
  totalInventory?: number;
  cjInventory?: number;
  factoryInventory?: number;
  verifiedWarehouse?: number;
}

export interface CjVariant {
  vid?: string;
  pid?: string;
  variantNameEn?: string;
  variantSku?: string;
  variantKey?: string;
  variantImage?: string;
  variantSellPrice?: number;
  variantSugSellPrice?: number;
  variantWeight?: number;
  variantLength?: number;
  variantWidth?: number;
  variantHeight?: number;
  variantVolume?: number;
  barcode?: string;
  inventories?: CjVariantInventory[];
}

/** Respuesta ampliada de GET /product/query */
export interface CjProductDetail {
  pid: string;
  productNameEn?: string;
  productSku?: string;
  bigImage?: string;
  productImageSet?: string[] | string;
  sellPrice?: number | string;
  suggestSellPrice?: string;
  description?: string;
  categoryName?: string;
  productKeyEn?: string;
  productWeight?: number | string;
  packingWeight?: number | string;
  productUnit?: string;
  listedNum?: number;
  addMarkStatus?: number;
  entryCode?: string;
  entryNameEn?: string;
  supplierName?: string;
  supplierId?: string;
  createrTime?: string;
  createTime?: string;
  productType?: string;
  materialNameEn?: string;
  materialNameEnSet?: string[] | string;
  packingNameEnSet?: string[] | string;
  productProEnSet?: string[] | string;
  productVideo?: string[] | string;
  variants?: CjVariant[];
  [key: string]: unknown;
}
