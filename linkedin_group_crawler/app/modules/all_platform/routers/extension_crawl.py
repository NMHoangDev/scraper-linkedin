"""Extension crawl router — handles extension-initiated crawl requests."""

from __future__ import annotations

import logging
import uuid
import asyncio
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.websocket import manager
from app.modules.all_platform.services.supabase_facebook_crawl_service import parse_facebook_time

logger = logging.getLogger(__name__)

router = APIRouter()

class ExtensionPost(BaseModel):
    post_url: Optional[str] = None
    url: Optional[str] = None
    author_name: Optional[str] = ""
    author_url: Optional[str] = ""
    timestamp_raw: Optional[str] = ""
    date: Optional[str] = None
    timestamp_class: Optional[str] = "unknown"
    content: Optional[str] = ""
    reactions: Optional[int] = 0
    comments: Optional[int] = 0
    shares: Optional[int] = 0
    images: Optional[List[str]] = []
    video_url: Optional[str] = None
    media_url: Optional[str] = None
    group_url: Optional[str] = None
    crawled_at: Optional[str] = None

class ExtensionCrawlRequest(BaseModel):
    posts: List[ExtensionPost]
    group_name: Optional[str] = None
    group_url: Optional[str] = None
    group_id: Optional[str] = None
    id_member: Optional[str] = None
    extension_version: Optional[str] = None

def sync_process_and_save_posts_db(payload: ExtensionCrawlRequest, legacy: bool):
    """
    Chạy các lệnh Supabase (đồng bộ) trong một thread riêng để không block EventLoop của asyncio.
    Giúp tránh lỗi [WinError 10035] WSAEWOULDBLOCK trên Windows.
    """
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Resolve group_id
    group_id = payload.group_id
    group_url = payload.group_url
    if not group_id and group_url:
        try:
            res = supabase.table("facebook_groups").select("id").eq("group_url", group_url).execute()
            if res.data:
                group_id = res.data[0].get("id")
        except Exception as e:
            logger.error(f"Error fetching group id for {group_url}: {e}")

    # 2. Get existing post_urls to avoid duplicate insertion
    all_post_urls = [p.post_url or p.url for p in payload.posts if (p.post_url or p.url)]
    existing_urls = set()
    if all_post_urls:
        try:
            res_existing = supabase.table("facebook_posts").select("post_url").in_("post_url", all_post_urls).execute()
            existing_urls = {item["post_url"] for item in (res_existing.data or []) if item.get("post_url")}
        except Exception as e:
            logger.warning(f"Could not check existing urls in facebook_posts: {e}")

    # 3. Resolve authors (author_post)
    author_urls = [p.author_url for p in payload.posts if p.author_url]
    author_map = {}
    if author_urls:
        try:
            res_authors = supabase.table("author_post").select("id, url_profile").in_("url_profile", author_urls).execute()
            author_map = {item["url_profile"]: item["id"] for item in (res_authors.data or [])}
        except Exception as e:
            logger.warning(f"Error fetching authors: {e}")

    new_authors = []
    for p in payload.posts:
        if p.author_url and p.author_url not in author_map:
            new_id = str(uuid.uuid4())
            author_map[p.author_url] = new_id
            new_authors.append({
                "id": new_id,
                "name": p.author_name or "",
                "url_profile": p.author_url,
                "create_at": now_iso
            })
            
    if new_authors:
        try:
            unique_new_authors = {a["url_profile"]: a for a in new_authors}.values()
            supabase.table("author_post").insert(list(unique_new_authors)).execute()
        except Exception as e:
            logger.warning(f"Error inserting authors: {e}")

    # 4. Prepare posts for insertion
    posts_to_insert = []
    for p in payload.posts:
        post_url = p.post_url or p.url
        if not post_url or post_url in existing_urls:
            continue
            
        post_time_str = p.timestamp_raw or p.date
        parsed_time = parse_facebook_time(post_time_str) if post_time_str else None
        
        post_data = {
            "group_id": group_id,
            "post_url": post_url,
            "crawl_date": now_iso,
            "post_time": parsed_time,
            "content": p.content,
            "score": 0,
            "reactions": p.reactions,
            "comments": p.comments,
            "shares": p.shares,
            "media_url": p.video_url or p.media_url,
            "image_urls": p.images or [],
            "created_at": p.crawled_at if legacy else now_iso,
            "updated_at": now_iso,
            "id_author": author_map.get(p.author_url),
            "id_member": payload.id_member or None
        }
        posts_to_insert.append(post_data)

    inserted_count = 0
    if posts_to_insert:
        try:
            res = supabase.table("facebook_posts").insert(posts_to_insert).execute()
            inserted_count = len(res.data or [])
        except Exception as e:
            logger.error(f"Error saving to facebook_posts: {e}")
            raise HTTPException(status_code=500, detail=str(e))
            
    return inserted_count


async def process_and_save_posts(payload: ExtensionCrawlRequest, event_name: str, legacy: bool = False):
    # Offload sync Supabase DB calls to a separate thread to prevent blocking Uvicorn Asyncio EventLoop
    inserted_count = await asyncio.to_thread(sync_process_and_save_posts_db, payload, legacy)

    # Realtime WebSocket Broadcast
    msg_prefix = "Legacy: " if legacy else ""
    await manager.broadcast({
        "event": event_name,
        "platform": "facebook",
        "group_url": payload.group_url,
        "group_name": payload.group_name,
        "posts_count": inserted_count,
        "message": f"{msg_prefix}Đã lưu {inserted_count} bài viết từ {payload.group_name}"
    })

    return {"success": True, "count": inserted_count}

@router.post("/save-posts")
async def save_posts(
    payload: ExtensionCrawlRequest,
    x_api_key: Optional[str] = Header(None)
):
    """Lưu bài viết vào bảng facebook_posts (schema mới)."""
    if x_api_key != "markee-extension-key-2024":
        logger.warning(f"Invalid API Key: {x_api_key}")
        raise HTTPException(status_code=403, detail="Invalid API Key")

    return await process_and_save_posts(payload, event_name="extension_crawl_saved", legacy=False)

@router.post("/crawl-result")
async def crawl_result(
    payload: ExtensionCrawlRequest,
    x_api_key: Optional[str] = Header(None)
):
    """Lưu bài viết vào bảng facebook_posts (Legacy)."""
    if x_api_key != "markee-extension-key-2024":
        logger.warning(f"Invalid API Key: {x_api_key}")
        raise HTTPException(status_code=403, detail="Invalid API Key")

    return await process_and_save_posts(payload, event_name="extension_crawl_saved_legacy", legacy=True)
