"""Danh mục dịch vụ (Service Catalog) schemas — group/component/bundle dùng chung
cho các Mẫu báo giá, thay thế dữ liệu dịch vụ hard-code trong schema_json."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ServiceCatalogItemCreateRequest(BaseModel):
    item_type: str  # 'group' | 'component' | 'bundle'
    parent_id: Optional[str] = None
    sku: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit: Optional[str] = None
    list_price_usd: Optional[float] = None
    unit_price_usd: Optional[float] = None
    exchange_rate_snapshot: Optional[float] = None
    default_unit_price_vnd: float = 0
    default_discount_percent: float = Field(default=0, ge=0, le=100)
    default_vat_rate: float = Field(default=0, ge=0, le=100)
    spec_quantity_per_unit: float = 1
    spec_unit_label: Optional[str] = None
    note: Optional[str] = None
    status: str = "active"


class ServiceCatalogItemUpdateRequest(BaseModel):
    id: str
    parent_id: Optional[str] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    list_price_usd: Optional[float] = None
    unit_price_usd: Optional[float] = None
    exchange_rate_snapshot: Optional[float] = None
    default_unit_price_vnd: Optional[float] = None
    default_discount_percent: Optional[float] = Field(default=None, ge=0, le=100)
    default_vat_rate: Optional[float] = Field(default=None, ge=0, le=100)
    spec_quantity_per_unit: Optional[float] = None
    spec_unit_label: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None


class ServiceCatalogReorderRequest(BaseModel):
    id: str
    direction: str  # 'up' | 'down'


class BundleComponentInput(BaseModel):
    component_id: str
    quantity: float = 1
    sort_order: int = 0


class BundleComponentsSetRequest(BaseModel):
    items: list[BundleComponentInput] = []


class QuoteFormCatalogLinksSetRequest(BaseModel):
    catalog_item_ids: list[str] = []
