from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CustomerLeadCreate(BaseModel):
    # Thông tin bắt buộc
    customer_name: str

    # Thông tin định danh
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tax_code: Optional[str] = None

    # Truy vết nguồn gốc
    leaded_by: Optional[str] = None
    conv_id: Optional[str] = None
    source_platform: Optional[str] = "FB_Inbox"  # FB_Inbox | FB_Group | Zalo | Manual

    # Phân công
    is_assigned: bool = False
    sdr_id: Optional[str] = None

    # Trạng thái (legacy + mới)
    status: str = "pending"  # pending | closed | rejected
    activity_status: str = "active"  # active | paused | churned

    # Giao dịch & hợp đồng
    customer_since: Optional[datetime] = None
    service_package: Optional[str] = None
    lifetime_value: Optional[float] = 0
    contract_signed_at: Optional[datetime] = None
    contract_status: str = "active"  # active | completed | maintenance

    # Chăm sóc sau bán
    warranty_expires_at: Optional[datetime] = None
    care_note: Optional[str] = None
    last_care_at: Optional[datetime] = None

    # Phân loại & CRM
    tags: Optional[List[str]] = []
    has_budget: bool = False
    note: Optional[str] = None

    # Reject flow (dùng khi status = rejected)
    reject_reason: Optional[str] = None
    reject_reason_type: Optional[str] = None  # Khong_lien_lac_duoc | Chua_co_nhu_cau | ...

    # KPI review
    review_result: Optional[str] = None  # Qualify | Disqualify | Chua_xem_xet


class CustomerLeadUpdate(BaseModel):
    # Thông tin định danh
    customer_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tax_code: Optional[str] = None

    # Truy vết nguồn gốc
    leaded_by: Optional[str] = None
    conv_id: Optional[str] = None
    source_platform: Optional[str] = None

    # Phân công
    is_assigned: Optional[bool] = None
    sdr_id: Optional[str] = None

    # Trạng thái
    status: Optional[str] = None
    activity_status: Optional[str] = None

    # Giao dịch & hợp đồng
    customer_since: Optional[datetime] = None
    service_package: Optional[str] = None
    lifetime_value: Optional[float] = None
    contract_signed_at: Optional[datetime] = None
    contract_status: Optional[str] = None

    # Chăm sóc sau bán
    warranty_expires_at: Optional[datetime] = None
    care_note: Optional[str] = None
    last_care_at: Optional[datetime] = None

    # Phân loại & CRM
    tags: Optional[List[str]] = None
    has_budget: Optional[bool] = None
    note: Optional[str] = None

    # Reject flow
    reject_reason: Optional[str] = None
    reject_reason_type: Optional[str] = None

    # KPI review
    review_result: Optional[str] = None


class CustomerLeadResponse(BaseModel):
    id: str
    customer_name: str
    company_name: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    website: Optional[str]
    industry: Optional[str]
    tax_code: Optional[str]
    leaded_by: Optional[str]
    conv_id: Optional[str]
    source_platform: Optional[str]
    is_assigned: bool
    sdr_id: Optional[str]
    status: str
    activity_status: str
    customer_since: Optional[datetime]
    service_package: Optional[str]
    lifetime_value: Optional[float]
    contract_signed_at: Optional[datetime]
    contract_status: str
    warranty_expires_at: Optional[datetime]
    care_note: Optional[str]
    last_care_at: Optional[datetime]
    tags: Optional[List[str]]
    has_budget: bool
    note: Optional[str]
    reject_reason: Optional[str]
    reject_reason_type: Optional[str]
    review_result: Optional[str]
    created_at: datetime
    updated_at: datetime
    leader_name: Optional[str] = None
    sdr_name: Optional[str] = None
