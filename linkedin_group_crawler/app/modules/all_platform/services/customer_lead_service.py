import logging
from typing import List, Dict, Any, Optional
from app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

ALL_COLUMNS = (
    "id, customer_name, company_name, phone, email, address, city, website, industry, tax_code, "
    "leaded_by, conv_id, source_platform, is_assigned, sdr_id, status, activity_status, "
    "customer_since, service_package, lifetime_value, contract_signed_at, contract_status, "
    "warranty_expires_at, care_note, last_care_at, "
    "tags, has_budget, note, reject_reason, reject_reason_type, review_result, "
    "created_at, updated_at, leader:leaded_by(name), sdr:sdr_id(name)"
)


def _normalize_row(row: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten joined objects and ensure tags is a list."""
    if row.get("leader"):
        row["leader_name"] = row["leader"].get("name")
        del row["leader"]
    if row.get("sdr"):
        row["sdr_name"] = row["sdr"].get("name")
        del row["sdr"]
    if row.get("tags") is None:
        row["tags"] = []
    return row


def get_all_customer_leads(
    current_user: Optional[Dict[str, Any]] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    industry: Optional[str] = None,
    source_platform: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Dict[str, Any]:
    """
    Returns { items: [...], total: int }.
    Supports filtering by search text, status, city, industry, source_platform.
    """
    try:
        supabase = get_supabase_client()
        query = supabase.table("customer_leads").select(ALL_COLUMNS, count="exact")

        # Filters
        if search:
            query = query.or_(
                f"customer_name.ilike.%{search}%,"
                f"company_name.ilike.%{search}%,"
                f"phone.ilike.%{search}%,"
                f"email.ilike.%{search}%"
            )
        if status:
            query = query.eq("status", status)
        if city:
            query = query.eq("city", city)
        if industry:
            query = query.eq("industry", industry)
        if source_platform:
            query = query.eq("source_platform", source_platform)

        # Role-based access
        if current_user and current_user.get("role") not in ["admin", "leader"]:
            uid = current_user.get("id")
            if uid:
                query = query.or_(f"leaded_by.eq.{uid},sdr_id.eq.{uid}")

        # Order + pagination
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

        res = query.execute()

        items = [_normalize_row(row) for row in (res.data or [])]
        total = res.count or 0

        return {"items": items, "total": total, "page": page, "page_size": page_size}
    except Exception as e:
        logger.error(f"Error getting customer leads: {e}")
        return {"items": [], "total": 0, "page": page, "page_size": page_size}


def get_customer_lead_by_id(lead_id: str) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = (
            supabase.table("customer_leads")
            .select(ALL_COLUMNS)
            .eq("id", lead_id)
            .execute()
        )
        if res.data:
            return _normalize_row(res.data[0])
        return None
    except Exception as e:
        logger.error(f"Error getting customer lead {lead_id}: {e}")
        return None


def get_customer_lead_by_conv_id(conv_id: str) -> Optional[Dict[str, Any]]:
    """Find existing customer by conv_id (to avoid duplicate when saving from inbox)."""
    try:
        supabase = get_supabase_client()
        res = (
            supabase.table("customer_leads")
            .select(ALL_COLUMNS)
            .eq("conv_id", conv_id)
            .maybe_single()
            .execute()
        )
        if res.data:
            return _normalize_row(res.data)
        return None
    except Exception as e:
        logger.error(f"Error getting customer by conv_id {conv_id}: {e}")
        return None


def create_customer_lead(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        # Ensure tags is a list
        if "tags" not in data or data["tags"] is None:
            data["tags"] = []
        # Ensure has_budget default
        if "has_budget" not in data:
            data["has_budget"] = False
        # Set source_platform default if not provided
        if "source_platform" not in data or not data["source_platform"]:
            data["source_platform"] = "FB_Inbox"
        res = supabase.table("customer_leads").insert(data).execute()
        if res.data:
            return _normalize_row(res.data[0])
        return None
    except Exception as e:
        logger.error(f"Error creating customer lead: {e}")
        raise e


def update_customer_lead(lead_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        # Chi loai key khong duoc gui len (None o day nghia la "khong sua"),
        # KHONG loai key ma client co gui nhung gia tri la null that su (nghia la "xoa trang truong nay").
        clean_data = dict(data)
        res = (
            supabase.table("customer_leads")
            .update(clean_data)
            .eq("id", lead_id)
            .execute()
        )
        if res.data:
            return _normalize_row(res.data[0])
        return None
    except Exception as e:
        logger.error(f"Error updating customer lead {lead_id}: {e}")
        raise e


def delete_customer_lead(lead_id: str) -> bool:
    try:
        supabase = get_supabase_client()
        supabase.table("customer_leads").delete().eq("id", lead_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error deleting customer lead {lead_id}: {e}")
        return False


def get_all_sdrs() -> List[Dict[str, Any]]:
    try:
        supabase = get_supabase_client()
        res = (
            supabase.table("app_users")
            .select("id, name, role")
            .in_("role", ["admin", "leader"])
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Error getting SDRs: {e}")
        return []
