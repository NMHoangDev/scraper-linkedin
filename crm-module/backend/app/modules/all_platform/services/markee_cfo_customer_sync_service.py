"""One-way, near-real-time Markee CFO -> CRM customer mirror.

CFO remains the source of truth. CRM users can link deals/contacts to a
mirrored customer, but cannot edit or delete the CFO-owned master fields.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone
from typing import Any

from supabase import Client, create_client

from app.core.config import settings
from app.core.logger import get_logger
from app.core.supabase_client import execute_supabase_query, get_supabase_client

logger = get_logger(__name__)

EXTERNAL_SYSTEM = "markee_cfo"
EXTERNAL_SOURCE_LABEL = "Markee CFO"
CUSTOMER_ROLES = {"", "KHACH_HANG", "CA_HAI"}

_source_client: Client | None = None
_sync_lock = threading.Lock()
_last_sync_monotonic = 0.0


def _get_source_client() -> Client:
    global _source_client
    if _source_client is None:
        if not settings.cfo_supabase_url or not settings.cfo_supabase_service_role_key:
            raise RuntimeError("CFO_SUPABASE_URL/CFO_SUPABASE_SERVICE_ROLE_KEY chua duoc cau hinh.")
        _source_client = create_client(settings.cfo_supabase_url, settings.cfo_supabase_service_role_key)
    return _source_client


def _text(value: Any) -> str | None:
    value = str(value or "").strip()
    return value or None


def _source_timestamp(row: dict[str, Any]) -> str | None:
    return _text(row.get("updatedAt")) or _text(row.get("createdAt"))


def _payload(row: dict[str, Any], accounts: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "workspace_id": row.get("workspaceId"),
        "code": row.get("ma"),
        "short_name": row.get("ten"),
        "legal_name": row.get("tenPhapLy"),
        "partner_role": row.get("vaiTro"),
        "partner_group": row.get("nhom"),
        "industry": row.get("nganhNghe"),
        "active": bool(row.get("hoatDong", True)),
        "created_at": row.get("createdAt"),
        "updated_at": row.get("updatedAt"),
        "bank_accounts": [
            {
                "id": account.get("id"),
                "bank": account.get("nganHang"),
                "account_number": account.get("soTaiKhoan"),
                "bank_display_name": account.get("tenTrenNganHang"),
                "active": bool(account.get("hoatDong", True)),
                "created_at": account.get("createdAt"),
                "updated_at": account.get("updatedAt"),
            }
            for account in accounts
        ],
    }


def _crm_values(row: dict[str, Any], accounts: list[dict[str, Any]]) -> dict[str, Any]:
    short_name = _text(row.get("ten"))
    legal_name = _text(row.get("tenPhapLy"))
    code = _text(row.get("ma"))
    active = bool(row.get("hoatDong", True))
    return {
        "customer_name": short_name or legal_name or code or "Khach hang Markee CFO",
        "company_name": legal_name or short_name,
        "tax_code": code,
        "industry": _text(row.get("nganhNghe")),
        "source": EXTERNAL_SOURCE_LABEL,
        "status": "current_customer" if active else "not_fit",
        "external_system": EXTERNAL_SYSTEM,
        "external_id": str(row["id"]),
        "external_updated_at": _source_timestamp(row),
        "external_payload": _payload(row, accounts),
        "external_active": True,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "instance": settings.crm_instance,
    }


def sync_markee_cfo_customers() -> dict[str, int]:
    """Reconcile customer-like partners from CFO workspace `default`.

    Pure suppliers and personnel are intentionally excluded. Legacy partners
    with an empty role are treated as customers, matching CFO's current UI.
    Missing/reclassified source rows are soft-hidden so existing CRM foreign
    keys and history are never destroyed.
    """
    if settings.crm_instance != "markee":
        return {"created": 0, "updated": 0, "unchanged": 0, "hidden": 0, "source": 0}

    source = _get_source_client()
    target = get_supabase_client()
    partner_res = execute_supabase_query(
        lambda: source.table("KhachHang")
        .select("id,workspaceId,ma,ten,tenPhapLy,vaiTro,nhom,nganhNghe,hoatDong,createdAt,updatedAt")
        .eq("workspaceId", settings.cfo_workspace_id)
        .execute()
    )
    partners = [
        row for row in (partner_res.data or [])
        if str(row.get("vaiTro") or "").strip().upper() in CUSTOMER_ROLES
    ]
    partner_ids = [str(row["id"]) for row in partners]

    accounts_by_partner: dict[str, list[dict[str, Any]]] = {}
    if partner_ids:
        account_res = execute_supabase_query(
            lambda: source.table("TaiKhoanDoiTac")
            .select("id,khachHangId,nganHang,soTaiKhoan,tenTrenNganHang,hoatDong,createdAt,updatedAt")
            .eq("workspaceId", settings.cfo_workspace_id)
            .in_("khachHangId", partner_ids)
            .execute()
        )
        for account in account_res.data or []:
            accounts_by_partner.setdefault(str(account.get("khachHangId")), []).append(account)

    existing_res = execute_supabase_query(
        lambda: target.table("crm_customers")
        .select("id,external_id,external_updated_at,external_payload,external_active")
        .eq("instance", settings.crm_instance)
        .eq("external_system", EXTERNAL_SYSTEM)
        .execute()
    )
    existing = {str(row.get("external_id")): row for row in (existing_res.data or [])}

    created = 0
    updated = 0
    unchanged = 0
    seen: set[str] = set()
    for partner in partners:
        external_id = str(partner["id"])
        seen.add(external_id)
        values = _crm_values(partner, accounts_by_partner.get(external_id, []))
        current = existing.get(external_id)
        if current:
            if current.get("external_active") and current.get("external_payload") == values["external_payload"]:
                unchanged += 1
                continue
            # Only CFO-owned columns are overwritten. CRM owner/contact data,
            # deals and audit creator remain untouched.
            execute_supabase_query(
                lambda current=current, values=values: target.table("crm_customers")
                .update({key: value for key, value in values.items() if key != "instance"})
                .eq("id", current["id"])
                .eq("instance", settings.crm_instance)
                .execute()
            )
            updated += 1
        else:
            execute_supabase_query(lambda values=values: target.table("crm_customers").insert(values).execute())
            created += 1

    stale_ids = [row["id"] for external_id, row in existing.items() if external_id not in seen and row.get("external_active")]
    if stale_ids:
        execute_supabase_query(
            lambda: target.table("crm_customers")
            .update({"external_active": False, "status": "not_fit", "synced_at": datetime.now(timezone.utc).isoformat()})
            .in_("id", stale_ids)
            .eq("instance", settings.crm_instance)
            .execute()
        )
    return {
        "created": created,
        "updated": updated,
        "unchanged": unchanged,
        "hidden": len(stale_ids),
        "source": len(partners),
    }


def ensure_recent_markee_cfo_sync(*, force: bool = False) -> dict[str, int] | None:
    """Sync at most once per configured interval per backend process."""
    global _last_sync_monotonic
    if not settings.cfo_customer_sync_enabled or settings.crm_instance != "markee":
        return None
    now = time.monotonic()
    if not force and now - _last_sync_monotonic < settings.cfo_customer_sync_interval_seconds:
        return None
    if not _sync_lock.acquire(blocking=False):
        return None
    try:
        now = time.monotonic()
        if not force and now - _last_sync_monotonic < settings.cfo_customer_sync_interval_seconds:
            return None
        result = sync_markee_cfo_customers()
        _last_sync_monotonic = time.monotonic()
        return result
    except Exception:
        # Customer listing remains available from the last successful mirror.
        logger.exception("Markee CFO customer sync failed")
        if force:
            raise
        return None
    finally:
        _sync_lock.release()
