import unicodedata
from dataclasses import dataclass
from typing import Optional

# Import trực tiếp picker từ backend
from app.modules.facebook.src.modules.facebook.services.facebook_scraper import (
    _pick_by_keywords_and_threshold,
)


@dataclass
class FakePost:
    url: str
    date: Optional[str] = None
    content: str = ""
    reactions: int = 0
    comments: int = 0
    shares: int = 0
    score: int = 0
    media_url: Optional[str] = None
    images: Optional[list[str]] = None


def run_case(*, content: str, keyword: str):
    # Tạo posts_in_day giả (1 post)
    post = FakePost(
        url="https://www.facebook.com/test/posts/1",
        content=content,
        reactions=1,
        comments=1,
        shares=1,
        score=0,
    )

    # Gọi picker y như luồng thật
    selected = _pick_by_keywords_and_threshold(
        posts_in_day=[post],
        keywords=[keyword],
        post_limit=20,
    )

    print("\n=== CASE ===")
    print("keyword:", repr(keyword))
    print("content:", repr(content))
    print("normalized keyword:", unicodedata.normalize("NFC", keyword).lower().strip())
    print("normalized content:", unicodedata.normalize("NFC", content).lower().strip())
    print("selected_count:", len(selected))
    if selected:
        print("selected[0].url:", selected[0].url)
    else:
        print("NO MATCH")


if __name__ == "__main__":
    # Case 1: ví dụ keyword đơn giản
    run_case(
        content="CMC Global đang tìm kiếm Fullstack Java/Angular Developer (4+ YOE) tại Đà Nẵng!",
        keyword="CMC",
    )

    # Case 2: có xuống dòng / nhiều khoảng trắng
    run_case(
        content="Hello   world\n\n  CMC\t  Global",
        keyword="CMC",
    )

    # Case 3: Unicode NFC test (thay thử ký tự nếu bạn có ví dụ thật)
    # run_case(content="...", keyword="...")

