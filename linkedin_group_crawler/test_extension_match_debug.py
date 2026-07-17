import re
import unicodedata
from dataclasses import dataclass
from typing import Optional

from app.modules.facebook.src.modules.facebook.services.facebook_scraper import _pick_by_keywords_and_threshold
from app.modules.facebook.src.modules.crawl_fb.models.post import Post as FBPost


@dataclass
class FakeExtensionPost:
    url: str
    post_url: Optional[str]
    content: str
    reactions: int = 0
    comments: int = 0
    shares: int = 0


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", s or "")).lower().strip()


def main():
    url = "https://www.facebook.com/share/p/17px68K9kC/"
    fb_url = url  # placeholder; in real flow it becomes canonical permalink
    content = (
        "FPT Software tuyển dụng Infra & DevOps Làm việc tại: Nha Trang | Đà Nẵng | Hà Nội | Hồ Chí Minh "
        "Yêu cầu: Từ 2 năm kinh nghiệm ở vị trí Infra hoặc DevOps Quyền lợi nổi bật: Thu nhập cạnh tranh "
        "Trợ cấp chuyển vùng về miền Trung (Huế/Đà Nẵng/Quy Nhơn/Nha Trang) lên đến 100 TRIỆU "
        "Quan tâm inbox mình để nhận JD hoặc gửi CV về: TrangLTT26@FPT.com"
    )

    # Fake posts_in_day list passed to backend picker
    p = FBPost(
        url=fb_url,
        date="2026-01-01",
        reactions=1,
        comments=1,
        shares=1,
        score=1 * 2 + 1 + 1 * 3,
        content=content,
        media_url=None,
        images=[],
    )

    keywords = ["FPT"]

    print("normalized keyword:", norm(keywords[0]))
    print("normalized content preview:", norm(content)[:80])

    selected = _pick_by_keywords_and_threshold(
        posts_in_day=[p],
        keywords=keywords,
        post_limit=20,
    )

    print("selected_count:", len(selected))
    if selected:
        print("selected url:", selected[0].url)


if __name__ == "__main__":
    main()

