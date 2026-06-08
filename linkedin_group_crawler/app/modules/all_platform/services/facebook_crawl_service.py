"""Facebook crawl service for all-platform module.

Tái sử dụng FacebookScraper (Playwright) từ facebook module, sau đó lưu kết quả
vào Supabase qua save_facebook_crawl_to_supabase.

Luồng chuẩn:
  1. Chuyển groups[] thành GroupTarget[] (giữ nguyên Intent key).
  2. Gọi FacebookScraper.scrape_groups() trong threadpool (tránh block event loop).
  3. Gọi save_facebook_crawl_to_supabase() để lưu hot_post vào Supabase.
  4. Tổng hợp kết quả trả về, mỗi nhóm đều có trạng thái success/fail.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import List, Optional

from app.core.logger import get_logger
from app.modules.facebook.src.core.config.env import Config
from app.modules.facebook.src.modules.facebook.services.facebook_scraper import (
    FacebookScraper,
    GroupTarget,
)
from app.modules.all_platform.services.supabase_facebook_crawl_service import (
    save_facebook_crawl_to_supabase,
)

logger = get_logger(__name__)


# ── Result dataclasses ─────────────────────────────────────────────────────────

@dataclass
class CrawlGroupResult:
    """Kết quả cào cho một nhóm cụ thể."""
    group_url: str
    group_name: str
    success: bool
    posts_count: int = 0
    error: Optional[str] = None


@dataclass
class CrawlFacebookResult:
    """Kết quả tổng hợp toàn bộ session cào Facebook."""
    total_groups_ok: int
    total_groups_failed: int
    total_sessions_saved: int
    total_posts_saved: int
    groups_results: List[CrawlGroupResult] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


# ── Core crawl function ────────────────────────────────────────────────────────

def crawl_sync(
    groups: List[dict],
    custom_email: Optional[str] = None,
    custom_pass: Optional[str] = None,
) -> List:
    """
    Hàm sync — gọi FacebookScraper.scrape_groups() giữ nguyên logic gốc.
    Chạy trong threadpool để không block event loop.
    """
    # Chuyển dict -> GroupTarget (giữ key Intent viết hoa như dataclass định nghĩa)
    targets: List[GroupTarget] = [
        GroupTarget(
            name=g.get("name", g.get("url", "")),
            url=g.get("url", ""),
            Intent=g.get("Intent", g.get("intent", "")),
        )
        for g in groups
        if g.get("url")
    ]

    if not targets:
        return []

    scraper = FacebookScraper(config=Config)
    return scraper.scrape_groups(
        groups=targets,
        custom_email=custom_email,
        custom_pass=custom_pass,
        client_id=None,
    )


async def crawl_facebook_groups(
    groups: List[dict],
    user_id: str,
    custom_email: Optional[str] = None,
    custom_pass: Optional[str] = None,
) -> CrawlFacebookResult:
    """
    Cào danh sách nhóm Facebook bằng Playwright (FacebookScraper).

    Args:
        groups:        Danh sách dict [{name, url, Intent?}].
        user_id:       ID của user thực hiện cào (để ghi vào Supabase).
        custom_email:  Email FB tùy chỉnh (None = dùng cookie mặc định).
        custom_pass:   Password FB tùy chỉnh.

    Returns:
        CrawlFacebookResult với kết quả chi tiết từng nhóm.
    """
    if not groups:
        return CrawlFacebookResult(
            total_groups_ok=0,
            total_groups_failed=0,
            total_sessions_saved=0,
            total_posts_saved=0,
            groups_results=[],
            errors=["Không có nhóm nào hợp lệ để cào."],
        )

    # 1. Gọi scraper trong threadpool (sync Playwright → không block event loop)
    group_summaries = await asyncio.to_thread(
        crawl_sync,
        groups=groups,
        custom_email=custom_email,
        custom_pass=custom_pass,
    )

    if not group_summaries:
        return CrawlFacebookResult(
            total_groups_ok=0,
            total_groups_failed=len(groups),
            total_sessions_saved=0,
            total_posts_saved=0,
            groups_results=[],
            errors=["Scraper không trả về kết quả nào."],
        )

    # 2. Lưu hot_post vào Supabase
    save_errors: List[str] = []
    total_saved = 0
    try:
        result = save_facebook_crawl_to_supabase(user_id, group_summaries)
        total_saved = result.get("total_posts", 0)
        save_errors = result.get("errors", [])
    except Exception as e:
        logger.warning("Không lưu được vào Supabase: %s", e)
        save_errors.append(str(e))

    # 3. Tổng hợp kết quả từng nhóm
    groups_results: List[CrawlGroupResult] = []
    total_ok = 0
    total_failed = 0

    for summary in group_summaries:
        if summary.hot_post is not None:
            groups_results.append(CrawlGroupResult(
                group_url=summary.link_group,
                group_name=summary.group_name,
                success=True,
                posts_count=summary.total_posts_24h,
            ))
            total_ok += 1
        else:
            groups_results.append(CrawlGroupResult(
                group_url=summary.link_group,
                group_name=summary.group_name,
                success=False,
                posts_count=0,
                error="Không có bài viết nào trong 24h qua.",
            ))
            total_failed += 1

    return CrawlFacebookResult(
        total_groups_ok=total_ok,
        total_groups_failed=total_failed,
        total_sessions_saved=total_ok,
        total_posts_saved=total_saved,
        groups_results=groups_results,
        errors=save_errors,
    )
