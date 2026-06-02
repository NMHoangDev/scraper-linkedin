from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Lớp cơ sở chứa các trường chung
class GroupBase(BaseModel):
    group_name: str
    group_url: str
    intent: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[int] = None
    team: Optional[str] = None
    icp: Optional[str] = None
    icp_desc: Optional[str] = None
    members: Optional[int] = 0
    posts_per_week: Optional[int] = 0
    health_score: Optional[int] = 0
    chay_24h: Optional[bool] = False

# Dữ liệu gửi lên khi TẠO MỚI (kế thừa từ GroupBase)
class GroupCreate(GroupBase):
    pass # Không cần thêm id hay last_crawl vì Supabase tự sinh ra

# Dữ liệu gửi lên khi CẬP NHẬT (Tất cả đều là Optional)
class GroupUpdate(BaseModel):
    group_name: Optional[str] = None
    group_url: Optional[str] = None
    intent: Optional[str] = None
    industry: Optional[str] = None
    tier: Optional[int] = None
    team: Optional[str] = None
    icp: Optional[str] = None
    icp_desc: Optional[str] = None
    members: Optional[int] = None
    posts_per_week: Optional[int] = None
    health_score: Optional[int] = None
    chay_24h: Optional[bool] = None
    last_crawl: Optional[datetime] = None # Có thể cập nhật lại thời gian crawl