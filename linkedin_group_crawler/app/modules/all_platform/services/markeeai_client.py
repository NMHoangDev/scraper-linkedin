"""Client for the external MarkeeAI backend (app.markeeai.com).

MarkeeAI is the separate product the company uses to publish posts on its
own Facebook Page(s). This client logs in with a dedicated service account,
lists the fanpages that account can see, and fetches each fanpage's posts
(content + media_urls) so employees can seed-comment on them internally.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

_TOKEN_CACHE: dict[str, Any] = {"access_token": None, "refresh_token": None, "expires_at": 0.0}
_TOKEN_LOCK = asyncio.Lock()

_FANPAGE_CACHE: dict[str, Any] = {"items": None, "fetched_at": 0.0}
_FANPAGE_CACHE_TTL_SEC = 300.0


def _auth_headers(access_token: str, campaign_id: Optional[str] = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {access_token}"}
    if campaign_id:
        headers["X-Campaign-Id"] = campaign_id
    return headers


async def _login(client: httpx.AsyncClient) -> None:
    if not settings.markeeai_service_email or not settings.markeeai_service_password:
        raise RuntimeError("MARKEEAI_SERVICE_EMAIL / MARKEEAI_SERVICE_PASSWORD is not configured")

    resp = await client.post(
        "/auth/login",
        json={
            "email": settings.markeeai_service_email,
            "password": settings.markeeai_service_password,
        },
    )
    resp.raise_for_status()
    data = resp.json()
    _TOKEN_CACHE["access_token"] = data["accessToken"]
    _TOKEN_CACHE["refresh_token"] = data["refreshToken"]
    # Access tokens are short-lived; re-login well before real expiry rather
    # than parsing the JWT's own `exp` claim.
    _TOKEN_CACHE["expires_at"] = time.monotonic() + 15 * 60
    logger.info("MarkeeAI: logged in as service account")


async def _refresh(client: httpx.AsyncClient) -> bool:
    refresh_token = _TOKEN_CACHE.get("refresh_token")
    if not refresh_token:
        return False
    try:
        resp = await client.post("/auth/refresh", json={"refreshToken": refresh_token})
        resp.raise_for_status()
        data = resp.json()
        _TOKEN_CACHE["access_token"] = data["accessToken"]
        _TOKEN_CACHE["refresh_token"] = data["refreshToken"]
        _TOKEN_CACHE["expires_at"] = time.monotonic() + 15 * 60
        return True
    except httpx.HTTPError:
        return False


async def _ensure_token(client: httpx.AsyncClient) -> str:
    async with _TOKEN_LOCK:
        if _TOKEN_CACHE["access_token"] and time.monotonic() < _TOKEN_CACHE["expires_at"]:
            return _TOKEN_CACHE["access_token"]
        if _TOKEN_CACHE["access_token"] and await _refresh(client):
            return _TOKEN_CACHE["access_token"]
        await _login(client)
        return _TOKEN_CACHE["access_token"]


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=settings.markeeai_base_url, timeout=30.0)


async def list_fanpages(force_refresh: bool = False) -> list[dict]:
    """List fanpages reachable by the service account, across every campaign
    it's a member of (MARKEEAI_CAMPAIGN_IDS) plus any it owns personally."""
    if not force_refresh and _FANPAGE_CACHE["items"] is not None:
        if time.monotonic() - _FANPAGE_CACHE["fetched_at"] < _FANPAGE_CACHE_TTL_SEC:
            return _FANPAGE_CACHE["items"]

    campaign_ids: list[Optional[str]] = list(settings.markeeai_campaign_ids) or [None]

    async with _client() as client:
        token = await _ensure_token(client)
        results = await asyncio.gather(
            *[
                client.get("/api/fanpages", headers=_auth_headers(token, cid), params={"limit": 100})
                for cid in campaign_ids
            ],
            return_exceptions=True,
        )

    by_id: dict[str, dict] = {}
    for resp in results:
        if isinstance(resp, Exception):
            logger.warning(f"MarkeeAI: failed to list fanpages for a campaign: {resp}")
            continue
        if resp.status_code != 200:
            continue
        for fp in resp.json().get("items", []):
            by_id[fp["id"]] = fp

    items = list(by_id.values())
    _FANPAGE_CACHE["items"] = items
    _FANPAGE_CACHE["fetched_at"] = time.monotonic()
    return items


async def list_posts_for_fanpage(fanpage_id: str, limit: int = 50) -> list[dict]:
    """Uses GET /api/fanpages/{id}/posts — NOT /api/posts/fanpage/{id}, which
    additionally requires the caller to be the post's own author (rejects
    other campaign members with a 403 even when campaign scoping matches).
    The fanpages.py route only checks the fanpage's campaign ownership, so
    any teammate in the same campaign can see every post on the page."""
    campaign_ids: list[Optional[str]] = list(settings.markeeai_campaign_ids) or [None]
    async with _client() as client:
        token = await _ensure_token(client)
        for cid in campaign_ids:
            resp = await client.get(
                f"/api/fanpages/{fanpage_id}/posts",
                headers=_auth_headers(token, cid),
                params={"limit": limit},
            )
            if resp.status_code == 200:
                raw_items = resp.json().get("items", [])
                return [
                    {
                        "id": item["id"],
                        "facebook_post_id": item.get("facebook_post_id"),
                        "content": item.get("message") or "",
                        "media_urls": [item["full_picture"]] if item.get("full_picture") else [],
                        "status": item.get("status_type"),
                        "created_at": item.get("created_time"),
                    }
                    for item in raw_items
                ]
        return []


def _build_permalink(page_id: Optional[str], facebook_post_id: Optional[str]) -> Optional[str]:
    """Build a real, clickable FB permalink in the `/posts/{id}` shape that
    extensions/comment-extension/content.js can parse a post id out of.
    """
    if not facebook_post_id:
        return None
    story_id = facebook_post_id.split("_", 1)[1] if "_" in facebook_post_id else facebook_post_id
    if page_id:
        return f"https://www.facebook.com/{page_id}/posts/{story_id}"
    return f"https://www.facebook.com/posts/{story_id}"


async def get_all_company_posts(limit_per_page: int = 50) -> list[dict]:
    """Fetch posts across every fanpage the service account can see, merged
    and sorted by created_at desc, with a ready-to-use permalink_url."""
    fanpages = await list_fanpages()
    if not fanpages:
        return []

    results = await asyncio.gather(
        *[list_posts_for_fanpage(fp["id"], limit=limit_per_page) for fp in fanpages],
        return_exceptions=True,
    )

    posts: list[dict] = []
    for fanpage, page_posts in zip(fanpages, results):
        if isinstance(page_posts, Exception):
            logger.warning(f"MarkeeAI: failed to fetch posts for fanpage {fanpage.get('id')}: {page_posts}")
            continue
        for post in page_posts:
            post["fanpage_id"] = fanpage["id"]
            post["fanpage_name"] = fanpage.get("page_name")
            post["permalink_url"] = _build_permalink(fanpage.get("page_id"), post.get("facebook_post_id"))
            posts.append(post)

    posts.sort(key=lambda p: p.get("created_at") or "", reverse=True)
    return posts
