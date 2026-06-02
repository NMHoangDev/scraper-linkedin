from typing import List, Optional
from pydantic import BaseModel

# ==========================================
# SCHEMAS CHO GROUP
# ==========================================
class GroupItem(BaseModel):
    group_name: str
    link_group: str
    intent: str
    members: Optional[int] = 0
    date_crawl: Optional[str] = ""     # Thêm trường này để lưu ngày crawl thô từ Sheet
    posts_per_week: Optional[int] = 0
    health_score: Optional[int] = 0
    chay_24h: Optional[bool] = False
    industry: Optional[str] = ""
    tier: Optional[int] = 0
    team: Optional[str] = ""
    icp: Optional[str] = ""
    icp_desc: Optional[str] = ""

class BulkAddGroupPayload(BaseModel):
    groups: List[GroupItem]

class BulkDeleteGroupPayload(BaseModel):
    urls: List[str]

# ==========================================
# SCHEMAS CHO INTENT
# ==========================================
class IntentItem(BaseModel):
    name: str
    value:str

class BulkAddIntentPayload(BaseModel):
    intents: List[IntentItem]

class BulkDeleteIntentPayload(BaseModel):
    value: List[str]
class GetIntentsResponse(BaseModel):
    status: str
    message: str
    data: List[IntentItem]

class GroupItemResponse(BaseModel):
    id: str
    group_name: str
    group_url: str
    
    # Cập nhật tên các trường theo đúng log database trả về (thêm tiền tố id_)
    # Bắt buộc phải có "= None" ở cuối để FastAPI không báo lỗi 'missing' nếu cột không có dữ liệu
    intent: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[int] = None
    team: Optional[str] = None
    icp: Optional[str] = None
    
    # Các trường khác giữ nguyên
    icp_desc: Optional[str] = None
    members: Optional[int] = None
    posts_per_week: Optional[int] = None
    health_score: Optional[int] = None
    chay_24h: Optional[bool] = False
    last_crawl: Optional[str] = None
    status: Optional[str] = None
    date_crawl: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class GetGroupsResponse(BaseModel):
    status: str
    message: str
    data: List[GroupItemResponse]

