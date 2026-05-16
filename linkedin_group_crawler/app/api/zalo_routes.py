"""Zalo crawler API routes."""
from __future__ import annotations

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


class ZaloCrawlRequest(BaseModel):
    groups: Optional[List[str]] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@zalo_router.post("/login/open")
async def open_login_browser(
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    if not zalo_service.PROFILE_DIR:
        raise HTTPException(status_code=503, detail="ZALO_PROFILE_DIR not set in environment")
    return {"success": True, "data": zalo_service.open_browser_for_login()}


@zalo_router.get("/login/status")
async def login_status(
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    return {"success": True, "data": zalo_service.get_login_status()}


@zalo_router.get("/status")
async def get_status(
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    return {"success": True, "data": zalo_service.get_zalo_status()}


@zalo_router.get("/groups")
async def list_groups(
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    return {"success": True, "data": zalo_service.get_configured_groups()}


@zalo_router.get("/groups/{group_id}/messages")
async def get_messages(
    group_id: str,
    limit: int = Query(default=200, ge=1, le=2000),
    offset: int = Query(default=0, ge=0),
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    group_name = urllib.parse.unquote(group_id)
    messages = zalo_service.load_group_messages(group_name)
    if messages is None:
        matched = next(
            (g for g in zalo_service.get_configured_groups() if g["id"] == group_id),
            None,
        )
        if matched:
            messages = zalo_service.load_group_messages(matched["name"])
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


@zalo_router.post("/crawl")
async def start_crawl(
    body: ZaloCrawlRequest,
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    if not zalo_service.PROFILE_DIR:
        raise HTTPException(status_code=503, detail="ZALO_PROFILE_DIR not set in environment")
    if not zalo_service.OUTPUT_DIR:
        raise HTTPException(status_code=503, detail="ZALO_OUTPUT_DIR not set in environment")
    groups = body.groups or [g["name"] for g in zalo_service.get_configured_groups()]
    if not groups:
        raise HTTPException(status_code=400, detail="No groups configured (set ZALO_TARGET_GROUPS)")
    job = zalo_service.start_crawl(groups)
    if job is None:
        raise HTTPException(status_code=409, detail="A crawl is already in progress")
    return {"success": True, "data": zalo_service._job_to_dict(job)}


@zalo_router.get("/crawl/status")
async def crawl_status(
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    return {"success": True, "data": zalo_service.get_crawl_status()}


@zalo_router.get("/groups/{group_id}/images/{filename}")
async def get_image(
    group_id: str,
    filename: str,
    x_api_key: Annotated[Optional[str], Header()] = None,
    api_key_q: Optional[str] = Query(default=None, alias="x-api-key"),
) -> FileResponse:
    _check_api_key(x_api_key or api_key_q)
    group_name = urllib.parse.unquote(group_id)
    matched = next(
        (g for g in zalo_service.get_configured_groups() if g["id"] == group_id),
        None,
    )
    if matched:
        group_name = matched["name"]
    out_dir = zalo_service._group_output_dir(group_name)
    if out_dir is None:
        raise HTTPException(status_code=503, detail="ZALO_OUTPUT_DIR not configured")
    img_path = out_dir / "images" / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(img_path))


@zalo_router.post("/groups/{group_id}/export")
async def export_to_sheets(
    group_id: str,
    x_api_key: Annotated[Optional[str], Header()] = None,
) -> Dict[str, Any]:
    _check_api_key(x_api_key)
    group_name = urllib.parse.unquote(group_id)
    matched = next(
        (g for g in zalo_service.get_configured_groups() if g["id"] == group_id),
        None,
    )
    if matched:
        group_name = matched["name"]
    result = zalo_service.export_group(group_name)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Export failed"))
    return {"success": True, "data": result}
