"""API hàng đợi job cào bài cho các VPS worker (extension) — mô hình PULL.

Worker (mỗi VPS chạy Chrome extension) tự poll GET /next-job định kỳ để xin việc,
thay vì main server phải giữ kết nối/broadcast lệnh xuống từng worker (tránh lại
đúng vấn đề ConnectionManager in-memory single-process không đồng bộ đa-worker).
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from app.modules.all_platform.schemas.crawl_queue import (
    EnqueueCrawlJobRequest,
    HeartbeatRequest,
    JobResultRequest,
)
from app.modules.all_platform.services import supabase_crawl_queue_service as queue_service

logger = logging.getLogger(__name__)

router = APIRouter()

EXTENSION_API_KEY = "markee-extension-key-2024"


def _check_api_key(x_api_key: Optional[str]) -> None:
    if x_api_key != EXTENSION_API_KEY:
        logger.warning(f"[CRAWL-QUEUE] Invalid API Key: {x_api_key}")
        raise HTTPException(status_code=403, detail="Invalid API Key")


@router.get("/next-job")
async def next_job(
    worker_id: str,
    worker_name: Optional[str] = None,
    x_api_key: Optional[str] = Header(None),
):
    """Worker gọi định kỳ (poll) để xin job cào tiếp theo."""
    _check_api_key(x_api_key)
    job = queue_service.claim_next_job(worker_id, worker_name)
    if not job:
        return {"job": None}
    return {"job": job}


@router.post("/heartbeat")
async def heartbeat(payload: HeartbeatRequest, x_api_key: Optional[str] = Header(None)):
    """Worker gọi định kỳ khi đang rảnh (không có job) để báo còn sống."""
    _check_api_key(x_api_key)
    queue_service.upsert_worker_heartbeat(payload.worker_id, payload.worker_name, payload.status)
    return {"success": True}


@router.post("/enqueue")
async def enqueue(payload: EnqueueCrawlJobRequest, x_api_key: Optional[str] = Header(None)):
    """Main app (backend) gọi để đẩy 1 job cào mới vào hàng đợi cho worker xử lý."""
    _check_api_key(x_api_key)
    job = queue_service.enqueue_crawl_job(
        group_url=payload.group_url,
        group_name=payload.group_name,
        group_id=payload.group_id,
        id_member=payload.id_member,
        keywords=payload.keywords,
        post_limit=payload.post_limit,
        platform=payload.platform,
    )
    return {"success": True, "job": job}


@router.post("/job-result")
async def job_result(payload: JobResultRequest, x_api_key: Optional[str] = Header(None)):
    """Worker gọi khi job THẤT BẠI (crawl lỗi trước khi kịp gọi /save-posts).
    Khi thành công, job được đóng gián tiếp qua job_id/worker_id gửi kèm /save-posts.
    """
    _check_api_key(x_api_key)
    queue_service.complete_job(
        payload.job_id,
        success=payload.success,
        result_count=payload.result_count,
        error_message=payload.error_message,
    )
    return {"success": True}
