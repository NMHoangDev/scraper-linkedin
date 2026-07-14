"""Hàng đợi job cào bài cho các VPS worker (mô hình PULL qua Supabase)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# Worker không gửi heartbeat trong khoảng thời gian này bị coi là mất kết nối
# -> job đang xử lý dở của nó được thả về "pending" cho worker khác nhận.
WORKER_STALE_SECONDS = 90


def upsert_worker_heartbeat(worker_id: str, name: Optional[str], status: str) -> None:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("crawl_workers").upsert(
        {
            "worker_id": worker_id,
            "name": name,
            "status": status,
            "last_heartbeat": now_iso,
            "updated_at": now_iso,
        },
        on_conflict="worker_id",
    ).execute()


def enqueue_crawl_job(
    group_url: str,
    group_name: Optional[str] = None,
    group_id: Optional[str] = None,
    id_member: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    post_limit: Optional[int] = None,
    platform: str = "facebook",
) -> Dict[str, Any]:
    supabase = get_supabase_client()
    row = {
        "platform": platform,
        "group_url": group_url,
        "group_name": group_name,
        "group_id": group_id,
        "id_member": id_member,
        "keywords": keywords or None,
        "post_limit": post_limit,
        "status": "pending",
    }
    res = supabase.table("crawl_jobs").insert(row).execute()
    return (res.data or [None])[0]


def claim_next_job(worker_id: str, worker_name: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Worker gọi định kỳ để xin job. Đồng thời cập nhật heartbeat/trạng thái busy/idle."""
    supabase = get_supabase_client()
    res = supabase.rpc("claim_next_crawl_job", {"p_worker_id": worker_id}).execute()
    job = (res.data or [None])[0]

    upsert_worker_heartbeat(
        worker_id,
        worker_name,
        status="busy" if job else "idle",
    )
    if job:
        supabase.table("crawl_workers").update({"current_job_id": job["id"]}).eq(
            "worker_id", worker_id
        ).execute()
        # Job vừa claim chuyển ngay sang processing (extension bắt đầu cào thật).
        supabase.table("crawl_jobs").update({"status": "processing"}).eq("id", job["id"]).execute()
        job["status"] = "processing"
    return job


def complete_job(job_id: str, success: bool, result_count: Optional[int] = None, error_message: Optional[str] = None) -> None:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("crawl_jobs").update(
        {
            "status": "done" if success else "failed",
            "result_count": result_count,
            "error_message": error_message,
            "completed_at": now_iso,
        }
    ).eq("id", job_id).execute()
    supabase.table("crawl_workers").update({"current_job_id": None, "status": "idle"}).eq(
        "current_job_id", job_id
    ).execute()


def requeue_stale_jobs() -> int:
    """Job đang 'assigned'/'processing' mà worker phụ trách đã mất heartbeat quá lâu
    -> thả về 'pending' để worker khác nhận. Tránh job treo vĩnh viễn khi worker crash.
    """
    supabase = get_supabase_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=WORKER_STALE_SECONDS)).isoformat()

    stale_workers_res = (
        supabase.table("crawl_workers")
        .select("worker_id")
        .lt("last_heartbeat", cutoff)
        .neq("status", "offline")
        .execute()
    )
    stale_worker_ids = [w["worker_id"] for w in (stale_workers_res.data or [])]
    if not stale_worker_ids:
        return 0

    supabase.table("crawl_workers").update({"status": "offline", "current_job_id": None}).in_(
        "worker_id", stale_worker_ids
    ).execute()

    requeued = (
        supabase.table("crawl_jobs")
        .update({"status": "pending", "assigned_worker_id": None, "assigned_at": None})
        .in_("assigned_worker_id", stale_worker_ids)
        .in_("status", ["assigned", "processing"])
        .execute()
    )
    count = len(requeued.data or [])
    if count:
        logger.warning(f"[CRAWL-QUEUE] Đã thả {count} job về 'pending' do worker mất heartbeat: {stale_worker_ids}")
    return count
