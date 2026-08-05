"""Supabase-based Quote Forms + Quotes service — real báo giá gắn với customer_leads.

Response dicts dùng camelCase để khớp thẳng với các TS type QuoteForm/Quote/QuoteItem/
QuoteReference phía frontend (modules/quotes) — tránh phải map lại 2 lần.
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from supabase import Client

from app.core.supabase_client import get_supabase_client

FORMS_TABLE = "quote_forms"
QUOTES_TABLE = "quotes"
ITEMS_TABLE = "quote_items"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _count_fields(sections: list[dict]) -> int:
    total = 0
    for section in sections or []:
        for f in section.get("fields", []):
            if f.get("type") == "repeater-table":
                total += len(f.get("config", {}).get("columns", []) or []) or 1
            else:
                total += 1
    return total


def _row_to_form(row: dict) -> dict:
    schema_json = row.get("schema_json") or {}
    sections = schema_json.get("sections") or []
    return {
        "id": row["id"],
        "code": row["code"],
        "name": row["name"],
        "description": row.get("description") or "",
        "status": row["status"],
        "schemaVersion": row["schema_version"],
        "schemaJson": schema_json,
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
        "sectionCount": len(sections),
        "fieldCount": _count_fields(sections),
        "shareToken": row.get("share_token"),
        "shareEnabled": row.get("share_enabled") or False,
        "shareUrl": f"/public/quote-forms/{row['share_token']}" if row.get("share_token") else None,
    }


def _row_to_item(row: dict) -> dict:
    return {
        "id": row["id"],
        "quoteId": row["quote_id"],
        "description": row.get("description") or "",
        "unit": row.get("unit"),
        "quantity": float(row.get("quantity") or 0),
        "unitPrice": float(row.get("unit_price") or 0),
        "vatRate": float(row.get("vat_rate") or 0),
        "subtotalAmount": float(row.get("subtotal_amount") or 0),
        "vatAmount": float(row.get("vat_amount") or 0),
        "totalAmount": float(row.get("total_amount") or 0),
        "sortOrder": row.get("sort_order") or 0,
    }


def _row_to_quote(row: dict, items: list[dict] | None = None) -> dict:
    return {
        "id": row["id"],
        "dealId": row.get("deal_id"),
        "quoteFormId": row["quote_form_id"],
        "quoteNumber": row["quote_number"],
        "status": row["status"],
        "formSchemaVersion": row["form_schema_version"],
        "formSnapshot": row.get("form_snapshot") or {},
        "data": row.get("data") or {},
        "items": [_row_to_item(i) for i in (items or [])],
        "subtotalAmount": float(row.get("subtotal_amount") or 0),
        "vatAmount": float(row.get("vat_amount") or 0),
        "totalAmount": float(row.get("total_amount") or 0),
        "currency": row.get("currency") or "VND",
        "issuedAt": row.get("issued_at"),
        "validUntil": row.get("valid_until"),
        "createdById": row.get("created_by"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
        "publicToken": row.get("public_token"),
        "publicUrl": f"/public/quotes/{row['public_token']}" if row.get("public_token") else None,
        "publicEnabled": row.get("public_enabled") if row.get("public_enabled") is not None else True,
    }


def _quote_items(quote_id: str) -> list[dict]:
    supabase: Client = get_supabase_client()
    result = (
        supabase.table(ITEMS_TABLE)
        .select("*")
        .eq("quote_id", quote_id)
        .order("sort_order")
        .execute()
    )
    return result.data or []


def _slug_code(name: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFD", name)
    ascii_name = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    ascii_name = ascii_name.replace("đ", "d").replace("Đ", "D")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", ascii_name).strip("_").upper()
    return slug or "QUOTE_FORM"


def _unique_code(base_name: str, ignore_id: str | None = None) -> str:
    supabase: Client = get_supabase_client()
    base = _slug_code(base_name)
    candidate = base
    suffix = 2
    while True:
        query = supabase.table(FORMS_TABLE).select("id").eq("code", candidate)
        existing = query.execute().data or []
        existing = [row for row in existing if row["id"] != ignore_id]
        if not existing:
            return candidate
        candidate = f"{base}_{suffix}"
        suffix += 1


def _next_quote_number() -> str:
    supabase: Client = get_supabase_client()
    year = datetime.now(timezone.utc).year
    prefix = f"BG/{year}/"
    result = (
        supabase.table(QUOTES_TABLE)
        .select("quote_number")
        .like("quote_number", f"{prefix}%")
        .execute()
    )
    max_seq = 0
    for row in result.data or []:
        try:
            seq = int(row["quote_number"].split("/")[-1])
            max_seq = max(max_seq, seq)
        except (ValueError, IndexError):
            continue
    return f"{prefix}{max_seq + 1:04d}"


def _calculate_item(quantity: float, unit_price: float, vat_rate: float) -> tuple[float, float, float]:
    subtotal = quantity * unit_price
    vat = subtotal * vat_rate / 100
    return subtotal, vat, subtotal + vat


def _calculate_totals(items: list[dict]) -> tuple[float, float, float]:
    subtotal = sum(i["subtotal"] for i in items)
    vat = sum(i["vat"] for i in items)
    return subtotal, vat, subtotal + vat


def _calculate_villa_totals(solution_items: list[dict]) -> tuple[float, float, float]:
    total = sum(float(item.get("offerPrice") or 0) for item in solution_items)
    return total, 0, total


# ── Quote Forms ────────────────────────────────────────────────────────────

def list_quote_forms(status: str | None = None) -> list[dict]:
    supabase: Client = get_supabase_client()
    query = supabase.table(FORMS_TABLE).select("*").neq("status", "archived")
    if status:
        query = query.eq("status", status)
    result = query.order("updated_at", desc=True).execute()
    return [_row_to_form(row) for row in (result.data or [])]


def get_quote_form(form_id: str) -> dict:
    supabase: Client = get_supabase_client()
    result = supabase.table(FORMS_TABLE).select("*").eq("id", form_id).single().execute()
    return _row_to_form(result.data)


def get_public_quote_form(token: str) -> dict:
    supabase: Client = get_supabase_client()
    result = (
        supabase.table(FORMS_TABLE)
        .select("*")
        .eq("share_token", token)
        .eq("share_enabled", True)
        .single()
        .execute()
    )
    if not result.data:
        raise ValueError("Mẫu báo giá không tồn tại hoặc đã bị khóa.")
    return _row_to_form(result.data)


def create_quote_form(payload: dict) -> dict:
    supabase: Client = get_supabase_client()
    insert_data = {
        "code": _unique_code(payload["name"]),
        "name": payload["name"],
        "description": payload.get("description") or "",
        "status": payload.get("status") or "active",
        "layout_type": payload.get("layout_type") or "cloudgate_standard_quote",
        "schema_version": payload.get("schema_version") or 1,
        "schema_json": payload["schema_json"],
    }
    result = supabase.table(FORMS_TABLE).insert(insert_data).execute()
    return _row_to_form(result.data[0])


def update_quote_form(form_id: str, payload: dict) -> dict:
    supabase: Client = get_supabase_client()
    update_data = {k: v for k, v in payload.items() if v is not None}
    if "layout_type" in update_data and not update_data["layout_type"]:
        update_data.pop("layout_type")
    update_data["updated_at"] = _now_iso()
    result = supabase.table(FORMS_TABLE).update(update_data).eq("id", form_id).execute()
    return _row_to_form(result.data[0])


def delete_quote_form(form_id: str) -> dict:
    supabase: Client = get_supabase_client()
    has_quotes = (
        supabase.table(QUOTES_TABLE).select("id").eq("quote_form_id", form_id).limit(1).execute()
    )
    if has_quotes.data:
        result = (
            supabase.table(FORMS_TABLE)
            .update({"status": "archived", "updated_at": _now_iso()})
            .eq("id", form_id)
            .execute()
        )
        return {"deleted": False, "archived": True, "form": _row_to_form(result.data[0])}
    supabase.table(FORMS_TABLE).delete().eq("id", form_id).execute()
    return {"deleted": True, "archived": False}


def duplicate_quote_form(form_id: str) -> dict:
    supabase: Client = get_supabase_client()
    source = supabase.table(FORMS_TABLE).select("*").eq("id", form_id).single().execute().data
    insert_data = {
        "code": _unique_code(f"{source['name']}_COPY", ignore_id=form_id),
        "name": f"{source['name']} - Bản sao",
        "description": source.get("description") or "",
        "status": source["status"],
        "layout_type": source["layout_type"],
        "schema_version": source["schema_version"],
        "schema_json": source["schema_json"],
    }
    result = supabase.table(FORMS_TABLE).insert(insert_data).execute()
    return _row_to_form(result.data[0])


def share_quote_form(form_id: str, enabled: bool = True) -> dict:
    supabase: Client = get_supabase_client()
    current = supabase.table(FORMS_TABLE).select("share_token").eq("id", form_id).single().execute().data
    token = current.get("share_token") or secrets.token_urlsafe(16)
    result = (
        supabase.table(FORMS_TABLE)
        .update({"share_token": token, "share_enabled": enabled, "updated_at": _now_iso()})
        .eq("id", form_id)
        .execute()
    )
    return _row_to_form(result.data[0])


# ── Quotes ─────────────────────────────────────────────────────────────────

def list_quotes(deal_id: str | None = None) -> list[dict]:
    supabase: Client = get_supabase_client()
    query = supabase.table(QUOTES_TABLE).select("*")
    if deal_id:
        query = query.eq("deal_id", deal_id)
    result = query.order("created_at", desc=True).execute()
    quotes = result.data or []
    return [_row_to_quote(row, _quote_items(row["id"])) for row in quotes]


def get_quote(quote_id: str) -> dict:
    supabase: Client = get_supabase_client()
    row = supabase.table(QUOTES_TABLE).select("*").eq("id", quote_id).single().execute().data
    return _row_to_quote(row, _quote_items(quote_id))


def get_public_quote(token: str) -> dict:
    supabase: Client = get_supabase_client()
    result = (
        supabase.table(QUOTES_TABLE)
        .select("*")
        .eq("public_token", token)
        .eq("public_enabled", True)
        .single()
        .execute()
    )
    if not result.data:
        raise ValueError("Báo giá không tồn tại hoặc đã bị khóa.")
    return _row_to_quote(result.data, _quote_items(result.data["id"]))


def create_quote(payload: dict, created_by: str | None) -> dict:
    supabase: Client = get_supabase_client()
    form = supabase.table(FORMS_TABLE).select("*").eq("id", payload["quote_form_id"]).single().execute().data
    if not form or form["status"] != "active":
        raise ValueError("Mẫu báo giá không còn hoạt động.")

    is_villa = form["layout_type"] == "villa_solution_package"
    data = dict(payload.get("data") or {})
    raw_items = payload.get("items") or []

    if is_villa:
        subtotal, vat, total = _calculate_villa_totals(data.get("solutionItems") or [])
        items_to_insert: list[dict] = []
    else:
        computed_items = []
        for item in raw_items:
            item_subtotal, item_vat, item_total = _calculate_item(
                float(item.get("quantity") or 0), float(item.get("unit_price") or 0), float(item.get("vat_rate") or 0)
            )
            computed_items.append({**item, "subtotal": item_subtotal, "vat": item_vat, "total": item_total})
        subtotal, vat, total = _calculate_totals(computed_items)
        items_to_insert = computed_items

    quote_number = _next_quote_number()
    now = _now_iso()
    insert_data = {
        "deal_id": payload.get("deal_id"),
        "quote_form_id": form["id"],
        "quote_number": quote_number,
        "status": "confirmed",
        "form_schema_version": form["schema_version"],
        "form_snapshot": form["schema_json"],
        "data": {**data, "quoteNumber": quote_number},
        "subtotal_amount": subtotal,
        "vat_amount": vat,
        "total_amount": total,
        "currency": str(data.get("currency") or "VND"),
        "issued_at": now,
        "public_token": secrets.token_urlsafe(16),
        "public_enabled": True,
        "created_by": created_by,
    }
    quote_row = supabase.table(QUOTES_TABLE).insert(insert_data).execute().data[0]

    inserted_items = []
    for index, item in enumerate(items_to_insert):
        row = {
            "quote_id": quote_row["id"],
            "description": item.get("description") or "",
            "unit": item.get("unit"),
            "quantity": float(item.get("quantity") or 0),
            "unit_price": float(item.get("unit_price") or 0),
            "vat_rate": float(item.get("vat_rate") or 0),
            "subtotal_amount": item["subtotal"],
            "vat_amount": item["vat"],
            "total_amount": item["total"],
            "sort_order": index,
        }
        inserted_items.append(supabase.table(ITEMS_TABLE).insert(row).execute().data[0])

    return _row_to_quote(quote_row, inserted_items)


def update_quote(quote_id: str, payload: dict) -> dict:
    supabase: Client = get_supabase_client()
    update_data: dict[str, Any] = {"updated_at": _now_iso()}
    if payload.get("status") is not None:
        update_data["status"] = payload["status"]
    if payload.get("public_enabled") is not None:
        update_data["public_enabled"] = payload["public_enabled"]
    if payload.get("data") is not None:
        update_data["data"] = payload["data"]
    supabase.table(QUOTES_TABLE).update(update_data).eq("id", quote_id).execute()
    return get_quote(quote_id)


def publish_quote(quote_id: str) -> dict:
    """Xác nhận + bật public + gắn QuoteReference ngược vào deal (nếu quote có deal_id),
    trả về QuoteReference {id, number, url, totalAmount}."""
    quote = update_quote(quote_id, {"status": "confirmed", "public_enabled": True})
    reference = {
        "id": quote["id"],
        "number": quote["quoteNumber"],
        "url": quote["publicUrl"],
        "totalAmount": quote["totalAmount"],
    }
    if quote.get("dealId"):
        link_quote_to_deal(quote_id, quote["dealId"], reference)
    return reference


def delete_quote(quote_id: str) -> None:
    supabase: Client = get_supabase_client()
    supabase.table(QUOTES_TABLE).delete().eq("id", quote_id).execute()


def link_quote_to_deal(quote_id: str, deal_id: str, reference: dict | None = None) -> dict:
    """Gắn quote_id (FK thật) + đồng bộ last_attachment_url/name + estimated_budget
    trên customer_leads — Deal Card/Drawer đọc y hệt như tham chiếu thủ công cũ
    (rowToDeal() phía frontend không cần sửa gì), chỉ khác nguồn dữ liệu giờ là
    quote thật thay vì user tự gõ tay."""
    supabase: Client = get_supabase_client()
    supabase.table(QUOTES_TABLE).update({"deal_id": deal_id, "updated_at": _now_iso()}).eq("id", quote_id).execute()

    update_data: dict[str, Any] = {"quote_id": quote_id}
    if reference:
        if reference.get("url"):
            update_data["last_attachment_url"] = reference["url"]
        if reference.get("number"):
            update_data["last_attachment_name"] = reference["number"]
        if reference.get("totalAmount"):
            current = (
                supabase.table("customer_leads").select("estimated_budget").eq("id", deal_id).single().execute().data
            )
            if not (current or {}).get("estimated_budget"):
                update_data["estimated_budget"] = reference["totalAmount"]
    supabase.table("customer_leads").update(update_data).eq("id", deal_id).execute()
    return get_quote(quote_id)
