"""Tiered crawler orchestration for LinkedIn groups."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Optional

from app.config import settings
from app.services.apify_crawler_service import run_apify_crawler_for_group
from app.services.crawler_service import open_group_and_collect_posts
from app.services.ranking_service import enrich_and_filter_posts
from app.utils.logger import get_logger

logger = get_logger(__name__)

CrawlerMode = Literal["auto", "playwright", "apify"]


@dataclass
class CrawlAttempt:
    tier: str
    success: bool
    message: str
    status: str = "failed"
    error_type: str | None = None
    reached_group: bool = False
    auth_required: bool = False
    raw_posts_count: int = 0
    target_posts_count: int = 0


@dataclass
class TieredCrawlResult:
    success: bool
    group_item: Optional[dict[str, Any]] = None
    source: str = ""
    attempts: list[CrawlAttempt] = field(default_factory=list)

    @property
    def error_summary(self) -> str:
        return " | ".join(
            f"{a.tier}[{a.error_type or a.status}]: {a.message}"
            for a in self.attempts
            if not a.success
        )


async def _to_thread(func, *args, **kwargs):
    import functools

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, functools.partial(func, *args, **kwargs))


def _classify_local_error(message: str) -> tuple[str, bool]:
    text = (message or "").lower()
    if any(token in text for token in ("login", "checkpoint", "authwall", "session is invalid", "missing auth cookie")):
        return "AUTH_REQUIRED", True
    if "not stay on the requested group page" in text or "redirect" in text:
        return "REDIRECTED", False
    if "timeout" in text or "timed out" in text:
        return "TIMEOUT", False
    return "CRAWL_ERROR", False


def _with_target_date_filter(
    item: dict[str, Any],
    *,
    target_date: Optional[str],
) -> tuple[dict[str, Any], list[dict[str, Any]], datetime.date]:
    """Normalize post dates and attach the posts matching the target day."""

    posts = list(item.get("posts") or [])
    crawl_time = item.get("crawl_time")
    if not isinstance(crawl_time, datetime):
        crawl_time = datetime.now()
        item["crawl_time"] = crawl_time

    filtered_posts, target_day = enrich_and_filter_posts(
        posts=posts,
        target_date=target_date,
        crawl_time=crawl_time,
    )
    item["posts"] = posts
    item["target_posts"] = filtered_posts
    item["target_day"] = target_day.isoformat()
    item["total_posts_in_target_date"] = len(filtered_posts)
    return item, filtered_posts, target_day


def _empty_result_attempt_message(target_day: datetime.date) -> str:
    return f"Tier returned 0 parsed posts while checking target day {target_day.isoformat()}"


async def crawl_group_with_tiers(
    *,
    group_url: str,
    mode: CrawlerMode = "auto",
    session_id: Optional[str] = None,
    email: Optional[str] = None,
    max_items: Optional[int] = None,
    target_date: Optional[str] = None,
    scroll_times: Optional[int] = None,
    scroll_delay_min_ms: Optional[int] = None,
    scroll_delay_max_ms: Optional[int] = None,
) -> TieredCrawlResult:
    """Run the configured crawl tiers and return the first successful result."""

    attempts: list[CrawlAttempt] = []

    should_try_own_apify = mode in ("auto", "apify") and settings.apify_own_actor_enabled
    should_try_third_party = (
        mode in ("auto", "apify")
        and settings.apify_3rd_party_fallback_enabled
    )
    should_try_playwright = mode in ("auto", "playwright")

    if should_try_playwright:
        try:
            item = await _to_thread(
                open_group_and_collect_posts,
                session_id=session_id,
                email=email,
                group_url=group_url,
                max_items=max_items,
                scroll_times_override=scroll_times,
                scroll_delay_min_ms=scroll_delay_min_ms,
                scroll_delay_max_ms=scroll_delay_max_ms,
            )
            item["source"] = "playwright_local"
            item["status"] = "success"
            item["error_type"] = None
            item["reached_group"] = True
            item["auth_required"] = False
            item, filtered_posts, target_day = _with_target_date_filter(
                item,
                target_date=target_date,
            )
            raw_posts_count = len(item.get("posts") or [])
            item["raw_posts_count"] = raw_posts_count
            if raw_posts_count > 0:
                attempts.append(
                    CrawlAttempt(
                        "tier1_playwright_local",
                        True,
                        "ok",
                        status="success",
                        reached_group=True,
                        raw_posts_count=raw_posts_count,
                        target_posts_count=len(filtered_posts),
                    )
                )
                return TieredCrawlResult(True, item, "playwright_local", attempts)

            message = _empty_result_attempt_message(target_day)
            attempts.append(
                CrawlAttempt(
                    "tier1_playwright_local",
                    False,
                    message,
                    status="empty_result",
                    error_type="EMPTY_RESULT",
                    reached_group=True,
                    raw_posts_count=raw_posts_count,
                    target_posts_count=0,
                )
            )
            logger.warning("Tier 1 Playwright returned no parsed posts for %s: %s", group_url, message)
            if mode == "playwright":
                return TieredCrawlResult(False, None, "", attempts)
        except Exception as exc:
            message = str(exc)
            error_type, auth_required = _classify_local_error(message)
            attempts.append(
                CrawlAttempt(
                    "tier1_playwright_local",
                    False,
                    message,
                    status="failed",
                    error_type=error_type,
                    reached_group=False,
                    auth_required=auth_required,
                )
            )
            logger.warning("Tier 1 Playwright failed for %s: %s", group_url, message)
            if mode == "playwright":
                return TieredCrawlResult(False, None, "", attempts)

    if should_try_own_apify:
        own_result = await run_apify_crawler_for_group(
            group_url,
            kind="own",
            email=email,
            session_id=session_id,
            max_items=max_items,
            target_date=target_date,
            scroll_times=scroll_times,
        )
        if own_result.get("success"):
            own_result, filtered_posts, target_day = _with_target_date_filter(
                own_result,
                target_date=target_date,
            )
            raw_posts_count = len(own_result.get("posts") or [])
            if raw_posts_count <= 0:
                message = _empty_result_attempt_message(target_day)
                attempts.append(
                    CrawlAttempt(
                        "tier2_apify_own_actor",
                        False,
                        message,
                        status="empty_result",
                        error_type="EMPTY_RESULT",
                        reached_group=bool(own_result.get("reached_group", True)),
                        auth_required=bool(own_result.get("auth_required", False)),
                        raw_posts_count=raw_posts_count,
                        target_posts_count=0,
                    )
                )
                logger.warning("Tier 2 Apify own Actor returned no parsed posts for %s: %s", group_url, message)
            else:
                attempts.append(
                    CrawlAttempt(
                        "tier2_apify_own_actor",
                        True,
                        "ok",
                        status=str(own_result.get("status") or "success"),
                        error_type=own_result.get("error_type"),
                        reached_group=bool(own_result.get("reached_group", True)),
                        auth_required=bool(own_result.get("auth_required", False)),
                        raw_posts_count=raw_posts_count,
                        target_posts_count=len(filtered_posts),
                    )
                )
                return TieredCrawlResult(True, own_result, "apify_own_actor", attempts)
        else:
            message = str(own_result.get("error") or "Apify own actor failed")
            attempts.append(
                CrawlAttempt(
                    "tier2_apify_own_actor",
                    False,
                    message,
                    status=str(own_result.get("status") or "failed"),
                    error_type=own_result.get("error_type"),
                    reached_group=bool(own_result.get("reached_group", False)),
                    auth_required=bool(own_result.get("auth_required", False)),
                )
            )
            logger.warning("Tier 2 Apify own Actor failed for %s: %s", group_url, message)

    if should_try_third_party:
        third_result = await run_apify_crawler_for_group(
            group_url,
            kind="third_party",
            max_items=max_items,
            target_date=target_date,
            scroll_times=scroll_times,
        )
        if third_result.get("success"):
            third_result, filtered_posts, target_day = _with_target_date_filter(
                third_result,
                target_date=target_date,
            )
            raw_posts_count = len(third_result.get("posts") or [])
            if raw_posts_count <= 0:
                message = _empty_result_attempt_message(target_day)
                attempts.append(
                    CrawlAttempt(
                        "tier3_apify_3rd_party",
                        False,
                        message,
                        status="empty_result",
                        error_type="EMPTY_RESULT",
                        reached_group=bool(third_result.get("reached_group", True)),
                        auth_required=bool(third_result.get("auth_required", False)),
                        raw_posts_count=raw_posts_count,
                        target_posts_count=0,
                    )
                )
                logger.warning("Tier 3 Apify third-party Actor returned no parsed posts for %s: %s", group_url, message)
            else:
                attempts.append(
                    CrawlAttempt(
                        "tier3_apify_3rd_party",
                        True,
                        "ok",
                        status=str(third_result.get("status") or "success"),
                        error_type=third_result.get("error_type"),
                        reached_group=bool(third_result.get("reached_group", True)),
                        auth_required=bool(third_result.get("auth_required", False)),
                        raw_posts_count=raw_posts_count,
                        target_posts_count=len(filtered_posts),
                    )
                )
                return TieredCrawlResult(True, third_result, "apify_3rd_party", attempts)
        else:
            message = str(third_result.get("error") or "Apify third-party actor failed")
            attempts.append(
                CrawlAttempt(
                    "tier3_apify_3rd_party",
                    False,
                    message,
                    status=str(third_result.get("status") or "failed"),
                    error_type=third_result.get("error_type"),
                    reached_group=bool(third_result.get("reached_group", False)),
                    auth_required=bool(third_result.get("auth_required", False)),
                )
            )
            logger.warning("Tier 3 Apify third-party Actor failed for %s: %s", group_url, message)

    if mode == "apify" and not should_try_own_apify and not should_try_third_party:
        attempts.append(
            CrawlAttempt(
                "tier2_apify_own_actor",
                False,
                "APIFY_OWN_ACTOR_ENABLED=false and third-party fallback disabled",
                status="failed",
                error_type="CONFIG_ERROR",
            )
        )

    return TieredCrawlResult(False, None, "", attempts)
