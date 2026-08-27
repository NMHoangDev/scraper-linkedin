"""Contracts schemas — hợp đồng gắn với customer_leads (CRM deal) + quotes đã chốt."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ContractClauseInput(BaseModel):
    id: Optional[str] = None
    title: str
    body: str = ""


class ContractCreateRequest(BaseModel):
    deal_id: Optional[str] = None
    quote_id: Optional[str] = None
    title: str
    template_type: str = "service"
    contract_value: float = 0
    currency: str = "VND"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    payment_terms: Optional[str] = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    payment_collected_percent: int = Field(default=0, ge=0, le=100)
    owner_id: Optional[str] = None
    clauses: list[ContractClauseInput] = Field(default_factory=list)
    ai_generated: bool = False
    ai_risk_score: Optional[int] = Field(default=None, ge=0, le=100)
    ai_review: Optional[list[dict]] = None
    ai_prompt: Optional[str] = None


class ContractUpdateRequest(BaseModel):
    title: Optional[str] = None
    template_type: Optional[str] = None
    contract_value: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    payment_terms: Optional[str] = None
    progress_percent: Optional[int] = Field(default=None, ge=0, le=100)
    payment_collected_percent: Optional[int] = Field(default=None, ge=0, le=100)
    owner_id: Optional[str] = None
    clauses: Optional[list[ContractClauseInput]] = None
    ai_risk_score: Optional[int] = Field(default=None, ge=0, le=100)
    ai_review: Optional[list[dict]] = None


class ContractStatusUpdateRequest(BaseModel):
    status: str
    signed_at: Optional[str] = None


class ContractGenerateRequest(BaseModel):
    deal_id: str
    quote_id: Optional[str] = None
    template_type: str = "service"
    detail_level: str = "standard"
    extra_prompt: Optional[str] = None


class ContractReviewRequest(BaseModel):
    clauses: list[ContractClauseInput]
    quote_id: Optional[str] = None
    contract_value: Optional[float] = None
    payment_terms: Optional[str] = None


class ContractRefineRequest(BaseModel):
    clauses: list[ContractClauseInput]
    findings: list[dict] = Field(default_factory=list)
