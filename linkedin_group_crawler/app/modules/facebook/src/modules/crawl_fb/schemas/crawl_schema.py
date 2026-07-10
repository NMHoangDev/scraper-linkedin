# src/schemas/crawl_schema.py
from pydantic import BaseModel, HttpUrl
from typing import List, Optional


class CrawlTriggerRequest(BaseModel):
    name: str
    url: str  # Có thể dùng HttpUrl thay cho str để FastAPI tự kiểm tra xem URL có hợp lệ không
    id: str
    id_intent: Optional[str] = None  # Thêm trường id_intent, có thể null
    id_member: str
    group_name: str

    # Optional per-group selection config (keywords + post_limit)
    # - keywords: match substring in post content (ignore case)
    # - post_limit: desired final number of posts to pick for this group
    keywords: Optional[List[str]] = None
    post_limit: Optional[int] = None


# 2. Schema cho tài khoản Facebook (có thể null)
class TkFB(BaseModel):
    useName: Optional[str] = None
    password: Optional[str] = None

# 3. Schema tổng (Payload) gom tất cả lại
class CrawlPayload(BaseModel):
    groups: List[CrawlTriggerRequest]
    tkFB: Optional[TkFB] = None




