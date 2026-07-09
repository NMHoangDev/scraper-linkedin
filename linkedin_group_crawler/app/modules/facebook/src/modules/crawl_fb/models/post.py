from dataclasses import dataclass, field
from typing import Optional, List


#  cấu trúc dữ liệu 1 bài viết mà mình lấy
@dataclass
class Post:
    url: str  # link bài viết
    date: str  # thời gian đăng bài
    reactions: int  # tổng lượt like,tim......
    comments: int  # tổng lượt bình luận
    shares: int  # tổng lượt chia sẽ
    score: int  # tổng điểm của bài viết công thức ở hàm xử lý chính
    content: str

    # Media
    media_url: Optional[str] = None  # có thể để none nếu không có video
    video_url: Optional[str] = None  # extension gửi video_url (nếu có)

    # Author (extension gửi)
    author_url: Optional[str] = None
    author_name: Optional[str] = None

    # Extension/GraphQL gửi thời điểm crawl
    crawled_at: Optional[str] = None

    images: List[str] = field(default_factory=list)  # danh sách ảnh nếu có

