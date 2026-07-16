"""API pool tài khoản Facebook seeding cho VPS worker — claim/report-invalid
(mô hình PULL, claim atomic giống crawl_queue.py/claim_next_crawl_job)."""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.modules.all_platform.schemas.fb_account_pool import ReportAccountInvalidRequest
from app.modules.all_platform.services import supabase_fb_account_pool_service as pool_service

logger = logging.getLogger(__name__)

router = APIRouter()

EXTENSION_API_KEY = "markee-extension-key-2024"


def _check_api_key(x_api_key: Optional[str]) -> None:
    if x_api_key != EXTENSION_API_KEY:
        logger.warning(f"[FB-ACCOUNT-POOL] Invalid API Key: {x_api_key}")
        raise HTTPException(status_code=403, detail="Invalid API Key")


@router.get("/claim")
async def claim_account(
    worker_id: str,
    worker_name: Optional[str] = None,
    id_member: Optional[str] = None,
    x_api_key: Optional[str] = Header(None),
):
    """Worker gọi khi VM chưa có cookie login hợp lệ (mới cấp máy / bị logout), hoặc khi
    cần đổi acc cho đúng chủ (`id_member`) của job kế tiếp sắp cào."""
    _check_api_key(x_api_key)
    account = pool_service.claim_next_account(worker_id, id_member)
    if not account:
        return {"account": None}
    return {"account": account}


@router.post("/report-invalid")
async def report_invalid(payload: ReportAccountInvalidRequest, x_api_key: Optional[str] = Header(None)):
    """Worker gọi khi phát hiện acc đang dùng bị mất login -> đánh dấu invalid, loại khỏi pool."""
    _check_api_key(x_api_key)
    pool_service.mark_account_invalid(payload.account_id, payload.worker_id, payload.error_message)
    return {"success": True}
