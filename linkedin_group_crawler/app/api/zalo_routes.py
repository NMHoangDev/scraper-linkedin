"""Zalo crawler API routes — per-user login via QR screenshot."""
from __future__ import annotations

import re
import urllib.parse
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing_extensions import Annotated

from app.config import settings
from app.services import zalo_service

zalo_router = APIRouter(prefix="/zalo", tags=["zalo"])


def _check_api_key(x_api_key: Optional[str]) -> None:
    if settings.api_key and x_api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


def _require_user_id(user_id: Optional[str]) -> str:
    if not user_id or not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id is required")
    return re.sub(r"[^\w@.-]", "_", user_id.strip())[:64]


class ZaloCrawlRequest(BaseModel):
    groups: Optional[List[str]] = None
    user_id: str


# ── Login endpoints ───────────────────────────────────────────────────────────

@zalo_router.post("/login/open")
async def open_login_browser(
    user_id: str = Query(..., description="User identifier (email or username)"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    if not zalo_service.PROFILE_DIR:
        raise HTTPException(status_code=503, detail="ZALO_PROFILE_DIR not set in environment")
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.open_browser_for_login(uid)}


@zalo_router.get("/login/screenshot")
async def get_login_screenshot(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    """Return the latest base64 PNG screenshot of the user's login browser (shows QR code)."""
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    screenshot = zalo_service.get_login_screenshot(uid)
    if screenshot is None:
        raise HTTPException(status_code=404, detail="No active login session for this user")
    return {"success": True, "data": {"screenshot": screenshot}}


@zalo_router.get("/login/status")
async def login_status(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.get_login_status(uid)}


@zalo_router.post("/login/close")
async def close_login_browser(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    zalo_service.close_login_browser(uid)
    return {"success": True}


# ── Status & groups ───────────────────────────────────────────────────────────

@zalo_router.get("/status")
async def get_status(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.get_zalo_status(uid)}


@zalo_router.get("/groups")
async def list_groups(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.get_configured_groups(uid)}


@zalo_router.get("/groups/{group_id}/messages")
async def get_messages(
    group_id: str,
    user_id: str = Query(..., description="User identifier"),
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    group_name = urllib.parse.unquote(group_id)
    messages = zalo_service.load_group_messages(group_name, uid)
    if messages is None:
        matched = next(
            (g for g in zalo_service.get_configured_groups(uid) if g["id"] == group_id),
            None,
        )
        if matched:
            messages = zalo_service.load_group_messages(matched["name"], uid)
    if messages is None:
        raise HTTPException(status_code=404, detail="Group not found or not yet crawled")
    return {
        "success": True,
        "data": {
            "messages": messages[offset: offset + limit],
            "total": len(messages),
            "offset": offset,
            "limit": limit,
        },
    }


# ── Crawl endpoints ───────────────────────────────────────────────────────────

@zalo_router.post("/crawl")
async def start_crawl(
    body: ZaloCrawlRequest,
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    if not zalo_service.OUTPUT_DIR:
        raise HTTPException(status_code=503, detail="ZALO_OUTPUT_DIR not set in environment")
    uid = _require_user_id(body.user_id)

    groups = body.groups or [g["name"] for g in zalo_service.get_configured_groups(uid)]
    if not groups:
        raise HTTPException(status_code=400, detail="No groups configured (set ZALO_TARGET_GROUPS)")
    job = zalo_service.start_crawl(uid, groups)
    if job is None:
        raise HTTPException(status_code=409, detail="A crawl is already in progress for this user")
    return {"success": True, "data": zalo_service._job_to_dict(job)}


@zalo_router.post("/crawl/stop")
async def stop_crawl(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.stop_crawl(uid)}


@zalo_router.get("/crawl/screenshot")
async def get_crawl_screenshot(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    """Return a screenshot of the current login browser (QR code). On-demand only."""
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    screenshot = zalo_service.get_crawl_screenshot(uid)
    if screenshot is None:
        raise HTTPException(status_code=404, detail="No QR screenshot available")
    return {"success": True, "data": {"screenshot": screenshot}}


@zalo_router.get("/crawl/status")
async def crawl_status(
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    return {"success": True, "data": zalo_service.get_crawl_status(uid)}


# ── Image & export ────────────────────────────────────────────────────────────

@zalo_router.get("/groups/{group_id}/images/{filename}")
async def get_image(
    group_id: str,
    filename: str,
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
    api_key_q: Optional[str] = Query(default=None, alias="x-api-key"),
) -> FileResponse:
    _check_api_key(x_api_key or api_key_q)
    uid = _require_user_id(user_id)
    group_name = urllib.parse.unquote(group_id)
    matched = next(
        (g for g in zalo_service.get_configured_groups(uid) if g["id"] == group_id),
        None,
    )
    if matched:
        group_name = matched["name"]
    out_dir = zalo_service._group_output_dir(group_name, uid)
    if out_dir is None:
        raise HTTPException(status_code=503, detail="ZALO_OUTPUT_DIR not configured")
    img_path = out_dir / "images" / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(img_path))


@zalo_router.post("/groups/{group_id}/export")
async def export_to_sheets(
    group_id: str,
    user_id: str = Query(..., description="User identifier"),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    uid = _require_user_id(user_id)
    group_name = urllib.parse.unquote(group_id)
    matched = next(
        (g for g in zalo_service.get_configured_groups(uid) if g["id"] == group_id),
        None,
    )
    if matched:
        group_name = matched["name"]
    result = zalo_service.export_group(group_name, uid)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Export failed"))
    return {"success": True, "data": result}
