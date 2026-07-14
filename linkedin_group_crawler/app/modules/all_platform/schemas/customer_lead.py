from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Bảng stage hợp lệ — dùng để validate input từ client lẫn output ra view.
# ---------------------------------------------------------------------------
DEAL_STAGES = [
    "new_lead", "contacted", "qualified", "requirement",
    "proposal_sent", "negotiation", "contract_sent",
    "on_hold", "won", "lost",
]
TERMINAL_STAGES = ["won", "lost"]

# Trạng thái thanh toán — dùng để lọc nhanh "khách nào còn nợ tiền".
PAYMENT_STATUSES = ["unpaid", "partial", "paid"]

# ---------------------------------------------------------------------------
# Transition graph — mirror 1:1 DEAL_STAGE_TRANSITIONS trong
# linkedin-crawler-ui/services/customer-lead.service.ts. Backend có API riêng
# gọi trực tiếp được (bypass UI) nên phải enforce lại ở đây, không chỉ ở client.
# ---------------------------------------------------------------------------
DEAL_STAGE_TRANSITIONS: dict[str, list[str]] = {
    "new_lead":      ["contacted", "lost"],
    "contacted":     ["qualified", "proposal_sent", "on_hold", "lost"],
    "qualified":     ["requirement", "proposal_sent", "on_hold", "lost"],
    "requirement":   ["proposal_sent", "on_hold", "lost"],
    "proposal_sent": ["negotiation", "on_hold", "lost"],
    "negotiation":   ["contract_sent", "on_hold", "lost"],
    "contract_sent": ["won", "lost"],
    # on_hold có thể resume về bất kỳ stage pipeline nào (quay lại prev_stage,
    # xử lý ở transition_stage()) hoặc đóng deal won/lost.
    "on_hold": [
        "contacted", "qualified", "requirement", "proposal_sent",
        "negotiation", "contract_sent", "won", "lost",
    ],
    "won":           [],
    "lost":          [],
}


def is_transition_allowed(from_stage: str, to_stage: str) -> bool:
    """True nếu được phép chuyển from_stage -> to_stage (hoặc giữ nguyên)."""
    if from_stage == to_stage:
        return True
    return to_stage in DEAL_STAGE_TRANSITIONS.get(from_stage, [])

# Required fields theo stage — server-side enforcement, mirror với client.
# Khi client POST transition, server check lại để chặn hack.
STAGE_REQUIRED_FIELDS: dict[str, dict[str, list[str]]] = {
    "new_lead":       {},
    "contacted":      {"required": ["note"]},
    "qualified":      {"required": ["decision_maker", "estimated_budget", "note"]},
    "requirement":    {"required": ["note", "attachment_url"]},
    "proposal_sent":  {"required": ["attachment_url"]},
    "negotiation":    {"required": ["note"]},
    "contract_sent":  {"required": ["attachment_url"]},
    "on_hold":        {"required": ["follow_up_date", "note"]},
    "won":            {"required": ["closed_reason"]},
    "lost":           {"required": ["reject_reason_type", "note"]},
}


# ---------------------------------------------------------------------------
# Base customer schemas (giữ từ schema cũ + thêm pipeline fields)
# ---------------------------------------------------------------------------
class CustomerLeadCreate(BaseModel):
    customer_name: str

    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tax_code: Optional[str] = None

    leaded_by: Optional[str] = None
    conv_id: Optional[str] = None
    source_platform: Optional[str] = "FB_Inbox"

    is_assigned: bool = False
    sdr_id: Optional[str] = None

    # Legacy status + activity
    status: str = "pending"
    activity_status: str = "active"

    # CRM pipeline (mới)
    deal_stage: Optional[str] = "new_lead"  # nếu None sẽ fall back về new_lead
    prev_stage: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    estimated_budget: Optional[float] = 0
    stage_entered_at: Optional[datetime] = None

    customer_since: Optional[datetime] = None
    service_package: Optional[str] = None
    lifetime_value: Optional[float] = 0
    contract_signed_at: Optional[datetime] = None
    contract_status: str = "active"

    warranty_expires_at: Optional[datetime] = None
    care_note: Optional[str] = None
    last_care_at: Optional[datetime] = None

    # Thanh toán — hạn trả tiền + trạng thái (chưa/một phần/đã thanh toán)
    payment_due_date: Optional[datetime] = None
    payment_status: Optional[str] = "unpaid"

    tags: Optional[List[str]] = []
    has_budget: bool = False
    note: Optional[str] = None

    reject_reason: Optional[str] = None
    reject_reason_type: Optional[str] = None

    review_result: Optional[str] = None

    last_attachment_url: Optional[str] = None
    last_attachment_name: Optional[str] = None
    closed_reason: Optional[str] = None


class CustomerLeadUpdate(BaseModel):
    company_name: Optional[str] = None
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tax_code: Optional[str] = None

    leaded_by: Optional[str] = None
    conv_id: Optional[str] = None
    source_platform: Optional[str] = None

    is_assigned: Optional[bool] = None
    sdr_id: Optional[str] = None

    status: Optional[str] = None
    activity_status: Optional[str] = None

    # CRM pipeline
    deal_stage: Optional[str] = None
    prev_stage: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    estimated_budget: Optional[float] = None
    stage_entered_at: Optional[datetime] = None

    customer_since: Optional[datetime] = None
    service_package: Optional[str] = None
    lifetime_value: Optional[float] = None
    contract_signed_at: Optional[datetime] = None
    contract_status: Optional[str] = None

    warranty_expires_at: Optional[datetime] = None
    care_note: Optional[str] = None
    last_care_at: Optional[datetime] = None

    payment_due_date: Optional[datetime] = None
    payment_status: Optional[str] = None

    tags: Optional[List[str]] = None
    has_budget: Optional[bool] = None
    note: Optional[str] = None

    reject_reason: Optional[str] = None
    reject_reason_type: Optional[str] = None

    review_result: Optional[str] = None

    last_attachment_url: Optional[str] = None
    last_attachment_name: Optional[str] = None
    closed_reason: Optional[str] = None


class CustomerLeadResponse(BaseModel):
    id: str
    customer_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tax_code: Optional[str] = None
    leaded_by: Optional[str] = None
    conv_id: Optional[str] = None
    source_platform: Optional[str] = None
    is_assigned: bool = False
    sdr_id: Optional[str] = None

    # legacy
    status: str = "pending"
    activity_status: str = "active"

    # CRM pipeline
    deal_stage: Optional[str] = "new_lead"
    prev_stage: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    estimated_budget: Optional[float] = 0
    stage_entered_at: Optional[datetime] = None
    days_in_stage: Optional[int] = 0  # computed field
    last_attachment_url: Optional[str] = None
    last_attachment_name: Optional[str] = None
    closed_reason: Optional[str] = None

    customer_since: Optional[datetime] = None
    service_package: Optional[str] = None
    lifetime_value: Optional[float] = 0
    contract_signed_at: Optional[datetime] = None
    contract_status: str = "active"
    warranty_expires_at: Optional[datetime] = None
    care_note: Optional[str] = None
    last_care_at: Optional[datetime] = None
    payment_due_date: Optional[datetime] = None
    payment_status: str = "unpaid"
    tags: Optional[List[str]] = []
    has_budget: bool = False
    note: Optional[str] = None
    reject_reason: Optional[str] = None
    reject_reason_type: Optional[str] = None
    review_result: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    leader_name: Optional[str] = None
    sdr_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Pipeline-specific schemas
# ---------------------------------------------------------------------------
class StageTransitionRequest(BaseModel):
    """Body gửi kèm khi client kéo-thả sang stage mới."""
    to_stage: str = Field(..., description="Stage đích, phải nằm trong DEAL_STAGES")
    note: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    reject_reason_type: Optional[str] = None
    reject_reason_text: Optional[str] = None
    prev_stage: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    decision_maker: Optional[str] = None
    estimated_budget: Optional[float] = None
    closed_reason: Optional[str] = None


class ActivityLogEntry(BaseModel):
    id: str
    customer_id: str
    action: str
    from_stage: Optional[str] = None
    to_stage: Optional[str] = None
    field: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    created_at: datetime


class ActivityLogResponse(BaseModel):
    items: List[ActivityLogEntry]
    total: int
