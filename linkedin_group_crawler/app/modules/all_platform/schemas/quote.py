"""Quote Forms + Quotes schemas — real báo giá module gắn với customer_leads (CRM deal)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


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
    vat_rate: float = 0


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
