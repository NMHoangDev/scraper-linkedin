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
    status: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    items: Optional[list[QuoteItemInput]] = None
    public_enabled: Optional[bool] = None
