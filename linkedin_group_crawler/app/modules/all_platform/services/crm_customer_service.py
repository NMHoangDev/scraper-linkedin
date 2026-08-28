from __future__ import annotations

import hashlib
import json
from typing import Any

from app.core.phone import vn_phone_to_e164
from app.core.supabase_client import execute_supabase_query, get_supabase_client
from app.modules.all_platform.services.customer_lead_service import BASE_COLUMNS, _normalize_row
from app.modules.all_platform.services.supabase_categories_service import get_categories_by_type

CUSTOMER_COLUMNS = (
    "id, customer_name, company_name, position, phone, phone_normalized, "
    "email, email_normalized, zalo, facebook, telegram, website, tax_code, "
    "address, city, industry, source, status, owner_id, created_by, note, "
    "created_at, updated_at"
)


class DuplicateCustomerError(ValueError):
    def __init__(self, matches: list[dict[str, Any]]) -> None:
        super().__init__("Khach hang da ton tai voi email hoac so dien thoai nay.")
        self.matches = matches


def _is_admin_or_leader(user: dict[str, Any] | None) -> bool:
    role = str((user or {}).get("role") or "").strip().lower()
    return role in {"admin", "leader"}


def _clean_text(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def normalize_email(value: Any) -> str | None:
    text = _clean_text(value)
    return text.lower() if text else None


def normalize_phone(value: Any) -> str | None:
    text = _clean_text(value)
    if not text:
        return None
    return vn_phone_to_e164(text)


def _normalize_payload(payload: dict[str, Any], actor_id: str | None = None) -> dict[str, Any]:
    out = {key: _clean_text(value) if isinstance(value, str) else value for key, value in payload.items()}
    out["email_normalized"] = normalize_email(out.get("email"))
    out["phone_normalized"] = normalize_phone(out.get("phone"))
    if actor_id:
        # created_by chi de audit (ai tao ho so lan dau) - khong bao gio tin
        # gia tri client gui len, luon ep ve actor that cua request.
        out["created_by"] = actor_id
    return out


def _validate_source(source: str | None) -> None:
    if not source:
        return
    try:
        rows = get_categories_by_type("crm_source")
    except Exception:
        rows = []
    if rows and source not in {row.get("code") for row in rows}:
        raise ValueError("Nguon khach hang khong nam trong danh muc crm_source.")


def _duplicate_query(email_normalized: str | None, phone_normalized: str | None, exclude_id: str | None = None) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    matches: dict[str, dict[str, Any]] = {}
    if email_normalized:
        res = execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .select(CUSTOMER_COLUMNS)
            .eq("email_normalized", email_normalized)
            .execute()
        )
        for row in res.data or []:
            matches[row["id"]] = row
    if phone_normalized:
        res = execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .select(CUSTOMER_COLUMNS)
            .eq("phone_normalized", phone_normalized)
            .execute()
        )
        for row in res.data or []:
            matches[row["id"]] = row
    if exclude_id:
        matches.pop(exclude_id, None)
    return list(matches.values())


def _customer_ids_visible_to(user: dict[str, Any]) -> set[str] | None:
    if _is_admin_or_leader(user):
        return None

    uid = str(user.get("id") or "")
    if not uid:
        return set()

    supabase = get_supabase_client()
    visible: set[str] = set()
    owned = execute_supabase_query(
        lambda: supabase.table("crm_customers").select("id").eq("owner_id", uid).execute()
    )
    visible.update(row["id"] for row in owned.data or [] if row.get("id"))

    by_leaded = execute_supabase_query(
        lambda: supabase.table("customer_leads").select("customer_id").eq("leaded_by", uid).execute()
    )
    by_sdr = execute_supabase_query(
        lambda: supabase.table("customer_leads").select("customer_id").eq("sdr_id", uid).execute()
    )
    for row in (by_leaded.data or []) + (by_sdr.data or []):
        if row.get("customer_id"):
            visible.add(row["customer_id"])
    return visible


def can_edit_customer(user: dict[str, Any], customer: dict[str, Any] | None) -> bool:
    if not user or not customer:
        return False
    if _is_admin_or_leader(user):
        return True
    return str(customer.get("owner_id") or "") == str(user.get("id") or "")


def can_view_customer(user: dict[str, Any], customer: dict[str, Any] | None) -> bool:
    if not user or not customer:
        return False
    if can_edit_customer(user, customer):
        return True
    visible = _customer_ids_visible_to(user)
    return visible is None or str(customer.get("id")) in visible


def _deal_visible_to(user: dict[str, Any], deal: dict[str, Any]) -> bool:
    if _is_admin_or_leader(user):
        return True
    uid = str(user.get("id") or "")
    return bool(uid) and (str(deal.get("leaded_by") or "") == uid or str(deal.get("sdr_id") or "") == uid)


def _attach_customer_metrics(customers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not customers:
        return []
    supabase = get_supabase_client()
    ids = [row["id"] for row in customers]
    lead_res = execute_supabase_query(
        lambda: supabase.table("customer_leads")
        .select("id, customer_id, estimated_budget, lifetime_value, updated_at, created_at")
        .in_("customer_id", ids)
        .execute()
    )
    by_customer: dict[str, list[dict[str, Any]]] = {}
    for lead in lead_res.data or []:
        by_customer.setdefault(lead.get("customer_id"), []).append(lead)

    for customer in customers:
        leads = by_customer.get(customer["id"], [])
        customer["deal_count"] = len(leads)
        customer["total_value"] = sum(float(lead.get("estimated_budget") or lead.get("lifetime_value") or 0) for lead in leads)
        customer["last_deal_at"] = max((lead.get("updated_at") or lead.get("created_at") for lead in leads), default=None)
    return customers


def _kpi(customers: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "total": len(customers),
        "new_lead": sum(1 for row in customers if row.get("status") == "new_lead"),
        "following": sum(1 for row in customers if row.get("status") == "following"),
        "current_customer": sum(1 for row in customers if row.get("status") == "current_customer"),
        "not_fit": sum(1 for row in customers if row.get("status") == "not_fit"),
    }


def list_customers(
    user: dict[str, Any],
    *,
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
    owner_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict[str, Any]:
    supabase = get_supabase_client()
    query = supabase.table("crm_customers").select(CUSTOMER_COLUMNS)
    if search:
        query = query.or_(
            f"customer_name.ilike.%{search}%,company_name.ilike.%{search}%,"
            f"phone.ilike.%{search}%,email.ilike.%{search}%"
        )
    if status:
        query = query.eq("status", status)
    if source:
        query = query.eq("source", source)
    if owner_id:
        query = query.eq("owner_id", owner_id)

    res = execute_supabase_query(lambda: query.order("updated_at", desc=True).execute())
    rows = res.data or []
    visible = _customer_ids_visible_to(user)
    if visible is not None:
        rows = [row for row in rows if row.get("id") in visible]

    total = len(rows)
    start = (page - 1) * page_size
    page_rows = _attach_customer_metrics(rows[start:start + page_size])
    for customer in page_rows:
        customer["can_edit"] = can_edit_customer(user, customer)
    return {"items": page_rows, "total": total, "page": page, "page_size": page_size, "kpi": _kpi(rows)}


def quick_search_customers(user: dict[str, Any], q: str, limit: int = 8) -> list[dict[str, Any]]:
    result = list_customers(user, search=q, page=1, page_size=limit)
    return result["items"]


def get_customer(customer_id: str, user: dict[str, Any]) -> dict[str, Any]:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_customers").select(CUSTOMER_COLUMNS).eq("id", customer_id).single().execute()
    )
    customer = res.data
    if not can_view_customer(user, customer):
        raise PermissionError("Khong co quyen xem ho so khach hang nay.")
    return _attach_customer_metrics([customer])[0]


def create_customer(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    actor_id = str(user.get("id") or "")
    data = _normalize_payload(payload, actor_id=actor_id)
    _validate_source(data.get("source"))
    matches = _duplicate_query(data.get("email_normalized"), data.get("phone_normalized"))
    if matches:
        raise DuplicateCustomerError(matches)
    # Khong tin owner_id client gui len - chi admin/leader duoc chi dinh chu
    # ho so khac minh luc tao; con lai luon la chinh nguoi tao (dung quy dinh
    # "owner_id duoc sua" - khong cho tu gan/gan ho quyen sua cho nguoi khac).
    if _is_admin_or_leader(user) and data.get("owner_id"):
        pass
    else:
        data["owner_id"] = actor_id or None
    supabase = get_supabase_client()
    res = execute_supabase_query(lambda: supabase.table("crm_customers").insert(data).execute())
    return res.data[0]


def update_customer(customer_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    current = get_customer(customer_id, user)
    if not can_edit_customer(user, current):
        raise PermissionError("Khong co quyen sua ho so khach hang nay.")
    data = _normalize_payload(payload)
    _validate_source(data.get("source"))
    matches = _duplicate_query(data.get("email_normalized"), data.get("phone_normalized"), exclude_id=customer_id)
    if matches:
        raise DuplicateCustomerError(matches)
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_customers")
        .update({key: value for key, value in data.items() if key not in {"id", "created_by"}})
        .eq("id", customer_id)
        .execute()
    )
    return res.data[0]


def related_records(customer_id: str, user: dict[str, Any]) -> dict[str, Any]:
    customer = get_customer(customer_id, user)
    supabase = get_supabase_client()
    lead_res = execute_supabase_query(
        lambda: supabase.table("customer_leads").select(BASE_COLUMNS).eq("customer_id", customer_id).execute()
    )
    deals = [_normalize_row(row) for row in lead_res.data or []]
    deals = [deal for deal in deals if _deal_visible_to(user, deal)]
    deal_ids = [deal["id"] for deal in deals]

    quotes: list[dict[str, Any]] = []
    contracts: list[dict[str, Any]] = []
    if deal_ids:
        quote_res = execute_supabase_query(
            lambda: supabase.table("quotes").select("*").in_("deal_id", deal_ids).execute()
        )
        quotes = quote_res.data or []
        try:
            contract_res = execute_supabase_query(
                lambda: supabase.table("contracts").select("*").in_("deal_id", deal_ids).execute()
            )
            contracts = contract_res.data or []
        except Exception:
            contracts = []

    total_value = sum(float(deal.get("estimated_budget") or deal.get("lifetime_value") or 0) for deal in deals)
    return {
        "customer": customer,
        "deals": deals,
        "quotes": quotes,
        "contracts": contracts,
        "kpi": {"deal_count": len(deals), "quote_count": len(quotes), "contract_count": len(contracts), "total_value": total_value},
    }


def _request_hash(payload: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _idempotent_replay(idempotency_key: str) -> dict[str, Any] | None:
    """Neu idempotency_key nay da co response luu san (request truoc da chay
    xong RPC thanh cong - xem UPDATE ... SET response cuoi ham SQL) thi tra ve
    NGUYEN response do, khong chay lai bat ky logic nao khac (bao gom ca
    duplicate-check ben duoi) - dung y nghia idempotent that: request lap lai
    (double-submit/network retry) phai tra ve KET QUA CU, khong bi hieu nham
    la "khach hang trung" chi vi lan truoc vua tao xong khach do."""
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_request_idempotency")
        .select("response")
        .eq("idempotency_key", idempotency_key)
        .execute()
    )
    rows = res.data or []
    if rows and rows[0].get("response"):
        return rows[0]["response"]
    return None


def create_customer_with_deal(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    actor_id = str(user.get("id") or "")
    customer = _normalize_payload(payload.get("customer") or {}, actor_id=actor_id)
    # Cung 1 quy tac voi create_customer(): khong tin owner_id client gui len
    # tru khi nguoi goi la admin/leader - RPC crm_create_customer_with_deal
    # (migration 077) uu tien p_customer->>'owner_id' neu co, nen phai chan
    # tu day, khong de lot xuong RPC.
    if not (_is_admin_or_leader(user) and customer.get("owner_id")):
        customer["owner_id"] = actor_id or None
    _validate_source(customer.get("source"))
    deal = dict(payload.get("deal") or {})
    customer_id = _clean_text(payload.get("customer_id"))
    update_customer_profile = bool(payload.get("update_customer_profile"))
    partial = False
    partial_message = None

    if not deal.get("leaded_by"):
        deal["leaded_by"] = actor_id
    idempotency_key = _clean_text(payload.get("idempotency_key")) or _request_hash({"customer": customer, "deal": deal, "actor": actor_id})

    # Kiem tra replay TRUOC duplicate-check va truoc RPC - xem docstring
    # _idempotent_replay(). Phai dat truoc ca nhanh customer_id/duplicate o
    # duoi, khong thi lan retry se bi chinh du lieu lan tao truoc chan lai.
    replayed = _idempotent_replay(idempotency_key)
    if replayed is not None:
        return replayed

    if customer_id:
        existing = get_customer(customer_id, user)
        if update_customer_profile and not can_edit_customer(user, existing):
            update_customer_profile = False
            partial = True
            partial_message = "Deal da tao, nhung ho so khach hang khong duoc cap nhat vi ban khong co quyen sua."
        deal["customer_id"] = customer_id
    else:
        matches = _duplicate_query(customer.get("email_normalized"), customer.get("phone_normalized"))
        if matches:
            raise DuplicateCustomerError(matches)

    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.rpc("crm_create_customer_with_deal", {
            "p_customer": customer,
            "p_deal": deal,
            "p_actor_id": actor_id,
            "p_idempotency_key": idempotency_key,
            "p_update_customer": update_customer_profile,
        }).execute()
    )
    data = res.data or {}
    data["partial"] = partial
    if partial_message:
        data["partial_message"] = partial_message
    return data
