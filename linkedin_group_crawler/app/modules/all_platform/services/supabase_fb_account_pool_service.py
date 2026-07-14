"""Pool tài khoản Facebook seeding cho VPS worker (claim/lock atomic, cùng mô hình
với crawl_workers/crawl_jobs) — thay cho việc RDP tay đăng nhập từng VM."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

_SAME_SITE_MAP = {"Strict": "strict", "Lax": "lax", "None": "no_restriction"}


def _playwright_cookies_to_chrome(state: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Convert cookie Playwright storage_state() -> format chrome.cookies.set() cần.

    Khác biệt chính:
    - Playwright: expires (epoch giây, -1 = session cookie), sameSite "Strict/Lax/None".
    - Chrome ext: cần thêm "url", "expirationDate" (BỎ nếu là session cookie),
      sameSite viết thường "strict/lax/no_restriction/unspecified".
    """
    chrome_cookies: List[Dict[str, Any]] = []
    for c in (state or {}).get("cookies") or []:
        domain = c.get("domain") or ""
        if "facebook.com" not in domain:
            continue  # bỏ cookie của origin khác (nếu storage_state có lẫn)

        host = domain.lstrip(".")
        item = {
            "url": f"https://{host}/",
            "name": c.get("name"),
            "value": c.get("value"),
            "domain": domain,
            "path": c.get("path") or "/",
            "secure": bool(c.get("secure", True)),
            "httpOnly": bool(c.get("httpOnly", False)),
            "sameSite": _SAME_SITE_MAP.get(c.get("sameSite"), "unspecified"),
        }
        expires = c.get("expires")
        if expires and expires != -1:
            item["expirationDate"] = expires
        chrome_cookies.append(item)
    return chrome_cookies


def upsert_account_cookie(email: str, cookie_state: Dict[str, Any]) -> None:
    """Gọi ngay sau khi Playwright login/re-login thành công (facebook_auth.py).
    Ghi đè cookie mới nhất + reset về 'available' (nhả khỏi trạng thái invalid cũ nếu có)."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("crawl_fb_accounts").upsert(
        {
            "email": email,
            "cookie_playwright": cookie_state,
            "status": "available",
            "assigned_worker_id": None,
            "assigned_at": None,
            "error_message": None,
            "fail_count": 0,
            "updated_at": now_iso,
        },
        on_conflict="email",
    ).execute()
    logger.info(f"[FB-ACCOUNT-POOL] Đã nạp/refresh cookie cho {email} (status=available).")


def claim_next_account(worker_id: str) -> Optional[Dict[str, Any]]:
    """Worker gọi khi chưa có cookie login hợp lệ. Idempotent: nếu worker đang giữ
    sẵn 1 acc 'assigned' rồi thì trả lại chính acc đó, không claim thêm."""
    supabase = get_supabase_client()

    held = (
        supabase.table("crawl_fb_accounts")
        .select("*")
        .eq("assigned_worker_id", worker_id)
        .eq("status", "assigned")
        .limit(1)
        .execute()
    )
    account = (held.data or [None])[0]

    if not account:
        res = supabase.rpc("claim_next_fb_account", {"p_worker_id": worker_id}).execute()
        account = (res.data or [None])[0]

    if not account:
        return None

    return {
        "id": account["id"],
        "email": account["email"],
        "cookies": _playwright_cookies_to_chrome(account["cookie_playwright"]),
    }


def mark_account_invalid(account_id: str, worker_id: str, error_message: Optional[str] = None) -> None:
    """Worker báo acc đang dùng bị logout/khoá -> loại khỏi pool (không tự requeue,
    chỉ 'available' lại khi ops đăng nhập tay/API lại và upsert_account_cookie ghi đè)."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    supabase.table("crawl_fb_accounts").update(
        {"status": "invalid", "error_message": error_message, "updated_at": now_iso}
    ).eq("id", account_id).eq("assigned_worker_id", worker_id).execute()
    logger.warning(f"[FB-ACCOUNT-POOL] Worker {worker_id} báo acc {account_id} hỏng: {error_message}")


def release_stale_account_claims() -> int:
    """Acc 'assigned' cho worker đã mất heartbeat quá lâu (dùng chung WORKER_STALE_SECONDS
    của crawl_workers) -> thả về 'available'. Tương tự requeue_stale_jobs."""
    from app.modules.all_platform.services.supabase_crawl_queue_service import WORKER_STALE_SECONDS

    supabase = get_supabase_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=WORKER_STALE_SECONDS)).isoformat()

    stale_res = supabase.table("crawl_workers").select("worker_id").lt("last_heartbeat", cutoff).execute()
    stale_worker_ids = [w["worker_id"] for w in (stale_res.data or [])]
    if not stale_worker_ids:
        return 0

    released = (
        supabase.table("crawl_fb_accounts")
        .update({"status": "available", "assigned_worker_id": None, "assigned_at": None})
        .in_("assigned_worker_id", stale_worker_ids)
        .eq("status", "assigned")
        .execute()
    )
    count = len(released.data or [])
    if count:
        logger.warning(f"[FB-ACCOUNT-POOL] Đã thả {count} acc về 'available' do worker mất heartbeat: {stale_worker_ids}")
    return count
