export type ServiceCatalogItemType = 'group' | 'component' | 'bundle';
export type ServiceCatalogStatus = 'active' | 'inactive';

export interface BundleComponentLine {
  id?: string;
  componentId: string;
  sku?: string;
  name?: string;
  description?: string;
  unit?: string;
  quantity: number;
  computedQuantity: number;
  displayText: string;
  unitPriceVnd: number;
  sortOrder: number;
}

export interface ServiceCatalogItem {
  id: string;
  itemType: ServiceCatalogItemType;
  parentId?: string;
  /** Chỉ có khi lấy qua getServiceCatalogOptions() (bước điền báo giá) — tên
   * nhóm cha, dùng để lọc theo nhóm trong popup chọn sản phẩm. */
  groupId?: string;
  groupName?: string;
  sku?: string;
  name: string;
  description?: string;
  unit?: string;
  listPriceUsd?: number;
  unitPriceUsd?: number;
  exchangeRateSnapshot?: number;
  defaultUnitPriceVnd: number;
  defaultDiscountPercent: number;
  defaultVatRate: number;
  specQuantityPerUnit: number;
  specUnitLabel?: string;
  note?: string;
  status: ServiceCatalogStatus;
  sortOrder: number;
  children?: ServiceCatalogItem[];
  components?: BundleComponentLine[];
}

export interface ServiceCatalogOptions {
  bundles: ServiceCatalogItem[];
  components: ServiceCatalogItem[];
}

export interface ServiceCatalogItemInput {
  itemType: ServiceCatalogItemType;
  parentId?: string;
  sku?: string;
  name: string;
  description?: string;
  unit?: string;
  listPriceUsd?: number;
  unitPriceUsd?: number;
  exchangeRateSnapshot?: number;
  defaultUnitPriceVnd?: number;
  defaultDiscountPercent?: number;
  defaultVatRate?: number;
  specQuantityPerUnit?: number;
  specUnitLabel?: string;
  note?: string;
  status?: ServiceCatalogStatus;
}

export interface BundleComponentInput {
  componentId: string;
  quantity: number;
  sortOrder: number;
}
