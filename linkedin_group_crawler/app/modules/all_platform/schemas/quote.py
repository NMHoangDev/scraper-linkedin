"""Quote Forms + Quotes schemas — real báo giá module gắn với customer_leads (CRM deal)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class QuoteFormCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    layout_type: str = "cloudgate_standard_quote"
    schema_version: int = 1
    schema_json: dict[str, Any]


class QuoteFormUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    layout_type: Optional[str] = None
    schema_version: Optional[int] = None
    schema_json: Optional[dict[str, Any]] = None


class QuoteItemInput(BaseModel):
    description: str = ""
    service_description: Optional[str] = None
    unit: Optional[str] = None
    quantity: float = 0
    unit_price: float = 0
    discount_percent: float = Field(default=0, ge=0, le=100)
    vat_rate: float = Field(default=0, ge=0, le=100)
    children: list["QuoteItemInput"] = Field(default_factory=list)
    # Danh mục dịch vụ: truy vết + snapshot USD/VND/tỷ giá tại thời điểm chọn dịch vụ.
    # Đông cứng ngay khi tạo/sửa báo giá - sửa catalog sau này không ảnh hưởng số liệu cũ.
    catalog_item_id: Optional[str] = None
    bundle_snapshot: Optional[list[dict[str, Any]]] = None
    list_price_usd: Optional[float] = None
    unit_price_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    unit_price_vnd: Optional[float] = None


class QuoteCreateRequest(BaseModel):
    deal_id: Optional[str] = None
    quote_form_id: str
    data: dict[str, Any] = {}
    items: list[QuoteItemInput] = []


class QuoteUpdateRequest(BaseModel):
    """status/public_token/public_enabled KHÔNG còn client-settable qua đây -
    chỉ đổi được qua endpoint /approve (xem quote.py) sau khi qua kiểm tra
    quyền duyệt riêng."""

    data: Optional[dict[str, Any]] = None
    items: Optional[list[QuoteItemInput]] = None
