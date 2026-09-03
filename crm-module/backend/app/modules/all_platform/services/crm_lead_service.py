from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

from app.core.config import settings
from app.core.supabase_client import execute_supabase_query, get_supabase_client
from app.modules.all_platform.services.crm_customer_service import (
    _clean_text,
    _customer_ids_visible_to,
    _validate_source,
    normalize_email,
    normalize_phone,
)
from app.modules.all_platform.services.crm_permission_service import (
    can_view_lead,
    can_write_lead,
    has_full_crm_access,
)
from app.modules.all_platform.services.crm_position_service import apply_position_category

LEAD_COLUMNS = (
    "id, lead_name, company_name, position, position_category_id, "
    "position_label_snapshot, phone, phone_normalized, email, "
    "email_normalized, zalo, facebook, telegram, website, source, status, "
    "score, sdr_id, note, qualification_need, qualification_icp_fit, "
    "qualification_estimated_value, qualification_decision_maker, "
    "qualification_expected_timeline, qualification_ae_id, next_step, "
    "follow_up_date, converted_customer_id, converted_contact_id, "
    "converted_deal_id, converted_by, converted_at, created_by, created_at, "
    "updated_at"
)

# sdr_id/qualification_ae_id la UUID nullable - frontend co the gui "" thay vi
# null (cung ly do voi _NULLABLE_UUID_COLUMNS trong customer_lead_service.py).
_NULLABLE_UUID_COLUMNS = ("sdr_id", "qualification_ae_id")


class DuplicateLeadError(ValueError):
    def __init__(self, matches: list[dict[str, Any]]) -> None:
        super().__init__("Lead da ton tai voi so dien thoai hoac email nay.")
        self.matches = matches


def _serialize_datetimes(payload: dict[str, Any]) -> dict[str, Any]:
    """CrmLeadUpdate.follow_up_date la `datetime` (Pydantic tu parse chuoi ISO
    client gui len), nhung supabase-py json.dumps thang dict nay -> no vo voi
    "Object of type datetime is not JSON serializable" ngay khi ai do thuc su
    gui follow_up_date. Doi nguoc ve chuoi ISO ngay truoc khi ghi.
    """
    for key, value in list(payload.items()):
        if isinstance(value, datetime):
            payload[key] = value.isoformat()
    return payload


def _normalize_uuid_fields(payload: dict[str, Any]) -> dict[str, Any]:
    for col in _NULLABLE_UUID_COLUMNS:
        if payload.get(col) == "":
            payload[col] = None
    return payload


def _normalize_payload(payload: dict[str, Any], actor_id: str | None = None) -> dict[str, Any]:
    out = {key: _clean_text(value) if isinstance(value, str) else value for key, value in payload.items()}
    out["email_normalized"] = normalize_email(out.get("email"))
    out["phone_normalized"] = normalize_phone(out.get("phone"))
    _normalize_uuid_fields(out)
    _serialize_datetimes(out)
    if actor_id:
        # created_by chi de audit - khong bao gio tin gia tri client gui len.
        out["created_by"] = actor_id
    return out


def _website_domain(value: str | None) -> str | None:
    text = _clean_text(value)
    if not text:
        return None
    text = text.lower()
    text = text.replace("https://", "").replace("http://", "")
    if text.startswith("www."):
        text = text[4:]
    text = text.rstrip("/")
    text = text.split("/")[0]
    return text or None


def _visible_lead_ids(user: dict[str, Any]) -> set[str] | None:
    """None = xem duoc tat ca (full CRM access). Nguoc lai, tra ve tap id
    crm_leads.id nguoi nay duoc xem: lead duoc giao (sdr_id) hoac gan lam AE
    luc qualify (qualification_ae_id), CONG THEM lead da convert sang 1 deal
    ma nguoi nay phu trach (leaded_by/sdr_id tren customer_leads) - Sale/AE
    nhan deal tu 1 lead van can xem lai lead goc.

    Ap dung dong nhat cho list_leads/company_match/KPI (yeu cau nghiep vu:
    "khong lam lo du lieu team khac qua search, KPI hoac company matching")."""
    if has_full_crm_access(user):
        return None
    uid = str(user.get("id") or "")
    if not uid:
        return set()

    supabase = get_supabase_client()
    visible: set[str] = set()
    own = execute_supabase_query(
        lambda: supabase.table("crm_leads")
        .select("id")
        .eq("instance", settings.crm_instance)
        .or_(f"sdr_id.eq.{uid},qualification_ae_id.eq.{uid}")
        .execute()
    )
    visible.update(row["id"] for row in own.data or [] if row.get("id"))

    deal_res = execute_supabase_query(
        lambda: supabase.table("customer_leads")
        .select("id")
        .eq("instance", settings.crm_instance)
        .or_(f"leaded_by.eq.{uid},sdr_id.eq.{uid}")
        .execute()
    )
    deal_ids = [row["id"] for row in deal_res.data or [] if row.get("id")]
    if deal_ids:
        conv = execute_supabase_query(
            lambda: supabase.table("crm_leads")
            .select("id")
            .eq("instance", settings.crm_instance)
            .in_("converted_deal_id", deal_ids)
            .execute()
        )
        visible.update(row["id"] for row in conv.data or [] if row.get("id"))
    return visible


def _kpi(leads: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "total": len(leads),
        "new_lead": sum(1 for row in leads if row.get("status") == "new_lead"),
        "qualifying": sum(1 for row in leads if row.get("status") == "qualifying"),
        "qualified": sum(1 for row in leads if row.get("status") == "qualified"),
    }


def list_leads(
    user: dict[str, Any],
    *,
    search: str | None = None,
    status: str | None = None,
    source: str | None = None,
    sdr_id: str | None = None,
    page: int = 1,
    page_size: int = 50,
) -> dict[str, Any]:
    supabase = get_supabase_client()
    query = supabase.table("crm_leads").select(LEAD_COLUMNS).eq("instance", settings.crm_instance)
    if search:
        query = query.or_(
            f"lead_name.ilike.%{search}%,company_name.ilike.%{search}%,"
            f"phone.ilike.%{search}%,email.ilike.%{search}%"
        )
    if status:
        query = query.eq("status", status)
    if source:
        query = query.eq("source", source)
    if sdr_id:
        query = query.eq("sdr_id", sdr_id)

    res = execute_supabase_query(lambda: query.order("updated_at", desc=True).execute())
    rows = res.data or []
    visible = _visible_lead_ids(user)
    if visible is not None:
        rows = [row for row in rows if row.get("id") in visible]

    total = len(rows)
    start = (page - 1) * page_size
    page_rows = rows[start:start + page_size]
    for row in page_rows:
        row["can_write"] = can_write_lead(user, row)
    return {"items": page_rows, "total": total, "page": page, "page_size": page_size, "kpi": _kpi(rows)}


def get_lead(lead_id: str, user: dict[str, Any]) -> dict[str, Any]:
    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_leads")
        .select(LEAD_COLUMNS)
        .eq("id", lead_id)
        .eq("instance", settings.crm_instance)
        .single()
        .execute()
    )
    lead = res.data
    if not lead:
        raise ValueError("Khong tim thay lead.")
    if not can_view_lead(user, lead):
        # Neu lead da convert, thu nap deal lien quan de kiem tra quyen xem
        # qua deal (xem docstring can_view_lead) truoc khi tu choi hang.
        if lead.get("converted_deal_id"):
            deal_res = execute_supabase_query(
                lambda: supabase.table("customer_leads")
                .select("id, leaded_by, sdr_id")
                .eq("id", lead["converted_deal_id"])
                .eq("instance", settings.crm_instance)
                .execute()
            )
            deal_rows = deal_res.data or []
            lead["_converted_deal"] = deal_rows[0] if deal_rows else None
        if not can_view_lead(user, lead):
            raise PermissionError("Khong co quyen xem lead nay.")
    lead.pop("_converted_deal", None)
    lead["can_write"] = can_write_lead(user, lead)
    return lead


def _duplicate_query(
    email_normalized: str | None,
    phone_normalized: str | None,
    exclude_id: str | None = None,
    raw_phone_digits: str | None = None,
) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    matches: dict[str, dict[str, Any]] = {}
    if email_normalized:
        res = execute_supabase_query(
            lambda: supabase.table("crm_leads")
            .select(LEAD_COLUMNS)
            .eq("email_normalized", email_normalized)
            .eq("instance", settings.crm_instance)
            .execute()
        )
        for row in res.data or []:
            matches[row["id"]] = row
    if phone_normalized:
        res = execute_supabase_query(
            lambda: supabase.table("crm_leads")
            .select(LEAD_COLUMNS)
            .eq("phone_normalized", phone_normalized)
            .eq("instance", settings.crm_instance)
            .execute()
        )
        for row in res.data or []:
            matches[row["id"]] = row
    # Fallback so sanh chuoi so tho (bo het ky tu khong phai chu so) khi SDT
    # nhap vao KHONG chuan hoa duoc (vn_phone_to_e164 tra None vi sai do dai/
    # dinh dang) - vd du lieu seed/cu co san bi thieu 1 so ("090303811", 9 ky
    # tu thay vi 10). Neu chi dua vao phone_normalized, ca 2 ben (SDT vua nhap
    # va SDT da luu) deu None nen khong bao gio khop duoc, dan den bo lot
    # trung lap hoan toan am tham (bug thuc te nguoi dung phat hien). Chi chay
    # khi phone_normalized rong (SDT hop le da duoc query o tren roi) VA co it
    # nhat vai chu so de tranh quet toan bo bang voi chuoi rong.
    if not phone_normalized and raw_phone_digits and len(raw_phone_digits) >= 6:
        res = execute_supabase_query(
            lambda: supabase.table("crm_leads")
            .select(LEAD_COLUMNS)
            .eq("instance", settings.crm_instance)
            .not_.is_("phone", "null")
            .execute()
        )
        for row in res.data or []:
            stored_digits = "".join(ch for ch in str(row.get("phone") or "") if ch.isdigit())
            if stored_digits and stored_digits == raw_phone_digits:
                matches[row["id"]] = row
    if exclude_id:
        matches.pop(exclude_id, None)
    return list(matches.values())


def duplicate_check(user: dict[str, Any], phone: str | None, email: str | None) -> list[dict[str, Any]]:
    raw_digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    matches = _duplicate_query(normalize_email(email), normalize_phone(phone), raw_phone_digits=raw_digits)
    visible = _visible_lead_ids(user)
    if visible is not None:
        matches = [row for row in matches if row.get("id") in visible]
    return matches


def company_match(user: dict[str, Any], tax_code: str | None, website: str | None, name: str | None) -> list[dict[str, Any]]:
    """Tim crm_customers khop theo tax_code chinh xac, domain website (bo
    protocol/www/dau '/' cuoi ca 2 phia truoc khi so sanh), hoac ten fuzzy
    (ilike - kiem tra DB nay chua bat pg_trgm nen dung ilike thuong, khong
    them extension moi). Loc theo cung visibility voi list_leads/KPI de
    khong lo du lieu khach hang team khac qua company matching."""
    supabase = get_supabase_client()
    matches: dict[str, dict[str, Any]] = {}
    tax_code_clean = _clean_text(tax_code)
    if tax_code_clean:
        res = execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .select("*")
            .eq("tax_code", tax_code_clean)
            .eq("instance", settings.crm_instance)
            .execute()
        )
        for row in res.data or []:
            row["match_reason"] = "tax_code"
            matches[row["id"]] = row

    domain = _website_domain(website)
    if domain:
        res = execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .select("*")
            .ilike("website", f"%{domain}%")
            .eq("instance", settings.crm_instance)
            .execute()
        )
        for row in res.data or []:
            if row["id"] in matches:
                continue
            if _website_domain(row.get("website")) == domain:
                row["match_reason"] = "website"
                matches[row["id"]] = row

    name_clean = _clean_text(name)
    if name_clean:
        res = execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .select("*")
            .ilike("customer_name", f"%{name_clean}%")
            .eq("instance", settings.crm_instance)
            .execute()
        )
        for row in res.data or []:
            if row["id"] in matches:
                continue
            row["match_reason"] = "name"
            matches[row["id"]] = row

    results = list(matches.values())
    visible = _customer_ids_visible_to(user)
    if visible is not None:
        results = [row for row in results if row.get("id") in visible]
    return results


def create_lead(payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    actor_id = str(user.get("id") or "")
    data = _normalize_payload(payload, actor_id=actor_id)
    _validate_source(data.get("source"))
    apply_position_category(data)
    # Khong tin sdr_id client gui len tru khi actor co full CRM access (cung
    # quy tac voi owner_id tren crm_customers.create_customer()).
    if not (has_full_crm_access(user) and data.get("sdr_id")):
        data["sdr_id"] = actor_id or None
    if data.get("status") == "converted":
        raise ValueError("Khong duoc tao lead voi status=converted truc tiep - phai qua Convert Lead.")
    data["instance"] = settings.crm_instance
    supabase = get_supabase_client()
    res = execute_supabase_query(lambda: supabase.table("crm_leads").insert(data).execute())
    return res.data[0]


def update_lead(lead_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    current = get_lead(lead_id, user)
    if not can_write_lead(user, current):
        raise PermissionError("Khong co quyen sua lead nay.")
    data = {key: _clean_text(value) if isinstance(value, str) else value for key, value in payload.items()}
    if "email" in data:
        data["email_normalized"] = normalize_email(data.get("email"))
    if "phone" in data:
        data["phone_normalized"] = normalize_phone(data.get("phone"))
    _normalize_uuid_fields(data)
    _serialize_datetimes(data)
    _validate_source(data.get("source"))
    apply_position_category(data, current_position_category_id=current.get("position_category_id"))

    # Quy tac cot loi: update_lead la PLAIN UPDATE, KHONG BAO GIO duoc tao
    # Customer/Contact/Deal - kem ca chuyen status sang 'qualified'. Rieng
    # status='converted' chi duoc phep di qua convert_lead() (RPC lam dung
    # viec tao ho so + danh dau converted trong 1 transaction).
    if data.get("status") == "converted":
        raise ValueError("Khong duoc tu doi status sang converted - phai goi Convert Lead.")
    if not (has_full_crm_access(user) and "sdr_id" in data):
        data.pop("sdr_id", None)

    data.pop("id", None)
    data.pop("created_by", None)
    data.pop("converted_customer_id", None)
    data.pop("converted_contact_id", None)
    data.pop("converted_deal_id", None)
    data.pop("converted_by", None)
    data.pop("converted_at", None)

    supabase = get_supabase_client()
    res = execute_supabase_query(
        lambda: supabase.table("crm_leads")
        .update(data)
        .eq("id", lead_id)
        .eq("instance", settings.crm_instance)
        .execute()
    )
    return res.data[0]


def _request_hash(payload: dict[str, Any]) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def convert_lead(lead_id: str, payload: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    current = get_lead(lead_id, user)
    if not can_write_lead(user, current):
        raise PermissionError("Khong co quyen chuyen doi lead nay.")

    actor_id = str(user.get("id") or "")
    customer = payload.get("customer")
    if customer:
        customer = _normalize_payload(dict(customer), actor_id=actor_id)
        apply_position_category(customer)
    deal = dict(payload.get("deal") or {})
    apply_position_category(deal)
    contact = payload.get("contact")
    if contact:
        contact = dict(contact)
        apply_position_category(contact)

    update_customer_flag = bool(payload.get("update_customer"))
    customer_id_arg = _clean_text(payload.get("customer_id"))

    args = {
        "p_lead_id": lead_id,
        "p_customer": customer,
        "p_customer_id": _clean_text(payload.get("customer_id")),
        "p_contact": contact,
        "p_contact_id": _clean_text(payload.get("contact_id")),
        "p_deal": deal,
        "p_actor_id": actor_id,
        "p_idempotency_key": _clean_text(payload.get("idempotency_key"))
        or _request_hash({"lead_id": lead_id, "customer": customer, "deal": deal, "contact": contact, "actor": actor_id}),
        "p_update_customer": bool(payload.get("update_customer")),
    }
    supabase = get_supabase_client()
    res = execute_supabase_query(lambda: supabase.rpc("crm_convert_lead", args).execute())
    data = res.data or {}

    # migration 079 — crm_convert_lead (migration 078 SQL, unmodified here)
    # doesn't know about position_category_id/position_label_snapshot yet;
    # stamp them via explicit follow-up updates on whatever rows it created.
    # Deal + a brand-new contact are always fresh; the customer row is only
    # stamped when this call actually created/updated it (mirrors the RPC's
    # own "leave existing profile alone unless p_update_customer" rule).
    new_deal_id = (data.get("deal") or {}).get("id")
    if new_deal_id and deal.get("position_category_id"):
        execute_supabase_query(
            lambda: supabase.table("customer_leads")
            .update({
                "position_category_id": deal.get("position_category_id"),
                "position_label_snapshot": deal.get("position_label_snapshot"),
            })
            .eq("id", new_deal_id)
            .eq("instance", settings.crm_instance)
            .execute()
        )
    new_contact_id = (data.get("contact") or {}).get("id")
    if new_contact_id and contact and not _clean_text(payload.get("contact_id")) and contact.get("position_category_id"):
        execute_supabase_query(
            lambda: supabase.table("crm_contacts")
            .update({
                "position_category_id": contact.get("position_category_id"),
                "position_label_snapshot": contact.get("position_label_snapshot"),
            })
            .eq("id", new_contact_id)
            .eq("instance", settings.crm_instance)
            .execute()
        )
    new_customer_id = (data.get("customer") or {}).get("id")
    customer_was_written = not customer_id_arg or update_customer_flag
    if new_customer_id and customer_was_written and customer and customer.get("position_category_id"):
        execute_supabase_query(
            lambda: supabase.table("crm_customers")
            .update({
                "position_category_id": customer.get("position_category_id"),
                "position_label_snapshot": customer.get("position_label_snapshot"),
            })
            .eq("id", new_customer_id)
            .eq("instance", settings.crm_instance)
            .execute()
        )
    return data
