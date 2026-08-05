import re
from typing import Optional

from playwright.sync_api import sync_playwright

from app.modules.facebook.src.modules.facebook.services.post_extractor import PostExtractor


URL = "https://www.facebook.com/share/p/17px68K9kC/"

# PostExtractor.get_info/ get_content/ get_media đang dựa trên DOM block bài viết.
# Vì vậy script sẽ tìm các khối có selector khớp “bài viết” và lấy content từ block đầu tiên khớp.


def collapse_preview(s: str, n: int = 400) -> str:
    s = s or ""
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n]


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1400,900",
            ],
        )
        context = browser.new_context(locale="vi-VN")
        page = context.new_page()

        print("Navigating:", URL)
        page.goto(URL, wait_until="domcontentloaded", timeout=60_000)

        # Chờ redirect/paint xong
        page.wait_for_timeout(3000)

        # heuristic: tìm các bài viết dạng article trên trang
        # PostExtractor.get_content yêu cầu element là một block chứa caption.
        candidates = page.locator("[role=article]").all()
        print("Found [role=article] candidates:", len(candidates))

        # Ưu tiên chọn candidate có nhiều node div[dir=auto] nhất
        best_i = None
        best_score = -1
        for i, el in enumerate(candidates):
            try:
                score = el.locator("div[dir=auto]").count()
                if score > best_score:
                    best_score = score
                    best_i = i
            except Exception:
                continue

        if best_i is None:
            print("No candidate blocks found.")
            browser.close()
            return

        block = candidates[best_i]
        print("Using candidate index:", best_i, "best_score(div[dir=auto])=", best_score)

        # Lấy content bằng đúng hàm hiện tại
        content = PostExtractor.get_content(block)

        print("\n=== RAW CONTENT (as returned by PostExtractor.get_content) ===")
        print(content)
        print("\n=== CONTENT LEN ===", len(content or ""))
        print("\n=== CONTENT PREVIEW (collapsed) ===")
        print(collapse_preview(content, 600))

        # Keyword test
        keyword = "FPT"
        print("\n=== KEYWORD TEST ===")
        try:
            ok = (keyword.lower().strip() in re.sub(r"\s+", " ", (content or "")).lower())
        except Exception:
            ok = False
        print("keyword:", keyword, "matched_any?", ok)

        browser.close()


if __name__ == "__main__":
    main()

