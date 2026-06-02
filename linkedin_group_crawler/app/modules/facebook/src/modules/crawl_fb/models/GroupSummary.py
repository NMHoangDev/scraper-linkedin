from dataclasses import dataclass

from pyparsing import Optional
from app.modules.facebook.src.modules.crawl_fb.models.post import Post
@dataclass
class GroupSummary:
    """
    Entity dùng để đóng gói dữ liệu báo cáo tổng hợp cho một Group.
    """
    group_name: str                  # Tên của Group
    link_group:str
    total_posts_24h: int             # Số lượng bài viết cào được trong 24h qua
    hot_post: Optional[Post]          # bài viết
    id:str
    def __post_init__(self):
        # Nếu hot_post đang là kiểu dict (do giải mã từ JSON Webhook)
        # thì ép kiểu nó trở lại thành object Post
        if isinstance(self.hot_post, dict):
            self.hot_post = Post(**self.hot_post)