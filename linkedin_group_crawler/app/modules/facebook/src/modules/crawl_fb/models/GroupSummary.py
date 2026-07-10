from dataclasses import dataclass
from app.modules.facebook.src.modules.crawl_fb.models.post import Post
@dataclass
class GroupSummary:
    """
    Entity dùng để đóng gói dữ liệu báo cáo tổng hợp cho một Group.
    """
    group_name: str                  # Tên của Group
    link_group: str
    total_posts_24h: int             # Số lượng bài viết cào được trong 24h qua
    Intent: str                      # Intent của nhóm
    id_member: str = ""              # ID User sở hữu nhóm
    # Legacy field: top post by score (optional)
    hot_post: Post | None = None     # Bài viết hot nhất (tùy logic), None nếu không có bài nào

    # Selected posts to persist to Supabase (today VN + keywords A/B + thresholds)
    # NOTE: use an empty list as default to avoid None checks downstream.
    selected_posts: list[Post] = None  # Populated by new ranking/selection logic


