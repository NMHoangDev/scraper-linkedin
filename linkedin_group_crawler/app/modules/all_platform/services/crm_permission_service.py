"""CRM/Pipeline permission helpers.

Nguyen tac phan quyen (thay cho phan quyen thuan role admin/leader/member
truoc day):

  - admin, leader: toan quyen (khong doi).
  - "Sale": nguoi thuoc 1 team co teams.team_type = 'sale' (migration 049) -
    duoc nang len ngang leader CHO RIENG Pipeline + Phan tich CRM, KHONG
    dua theo TEN team (ten team la text tu do, khong dang tin cay).
  - member thuong: doc (xem) toan bo Pipeline nhu moi nguoi, nhung chi
    sua/xoa deal do chinh minh tao (leaded_by) hoac duoc giao (sdr_id).
"""

from __future__ import annotations

import time
from typing import Any

from app.core.supabase_client import execute_supabase_query, get_supabase_client

_SALE_TEAM_TYPE = "sale"

_TEAM_TYPES_CACHE_TTL_SECONDS = 60.0
_TEAM_TYPES_CACHE: dict[str, tuple[float, set[str]]] = {}


def get_user_team_types(user_id: str | None) -> set[str]:
    """Tra ve tap hop team_type cua moi team ma user_id (app_users.id) dang
    la thanh vien (qua member_of_teams.id_member - luon la app_users.id,
    khong phai members.id - xem add_team_member/create_team)."""
    if not user_id:
        return set()

    now = time.monotonic()
    cached = _TEAM_TYPES_CACHE.get(user_id)
    if cached and cached[0] > now:
        return cached[1]

    try:
        supabase = get_supabase_client()
        mot_result = execute_supabase_query(
            lambda: supabase.table("member_of_teams").select("id_teams").eq("id_member", user_id).execute()
        )
        team_ids = list({r["id_teams"] for r in (mot_result.data or []) if r.get("id_teams")})
        if not team_ids:
            team_types: set[str] = set()
        else:
            teams_result = execute_supabase_query(
                lambda: supabase.table("teams").select("team_type").in_("id", team_ids).execute()
            )
            team_types = {r.get("team_type") for r in (teams_result.data or []) if r.get("team_type")}
    except Exception:
        # Loi tam thoi (mat ket noi...) -> coi nhu khong co team nao, an toan
        # hon la crash toan bo request Pipeline.
        team_types = set()

    _TEAM_TYPES_CACHE[user_id] = (now + _TEAM_TYPES_CACHE_TTL_SECONDS, team_types)
    if len(_TEAM_TYPES_CACHE) > 1000:
        for key in list(_TEAM_TYPES_CACHE.keys())[:-1000]:
            _TEAM_TYPES_CACHE.pop(key, None)
    return team_types


def clear_team_types_cache(user_id: str | None = None) -> None:
    if user_id:
        _TEAM_TYPES_CACHE.pop(user_id, None)
    else:
        _TEAM_TYPES_CACHE.clear()


def is_sale_member(user_id: str | None) -> bool:
    return _SALE_TEAM_TYPE in get_user_team_types(user_id)


def has_full_crm_access(user: dict[str, Any] | None) -> bool:
    """True neu user duoc xem/sua toan bo Pipeline + Phan tich CRM: admin,
    leader, hoac thanh vien 1 team team_type='sale'."""
    if not user:
        return False
    role = str(user.get("role") or "").strip().lower()
    if role in ("admin", "leader"):
        return True
    return is_sale_member(user.get("id"))


def can_write_deal(user: dict[str, Any] | None, lead: dict[str, Any] | None) -> bool:
    """True neu user duoc sua/xoa deal `lead` nay: co full CRM access, hoac
    la nguoi tao (leaded_by) / duoc giao (sdr_id) deal do."""
    if not user:
        return False
    if has_full_crm_access(user):
        return True
    if not lead:
        return False
    uid = str(user.get("id") or "")
    if not uid:
        return False
    return str(lead.get("leaded_by") or "") == uid or str(lead.get("sdr_id") or "") == uid


def can_approve_quote(user: dict[str, Any] | None) -> bool:
    """True neu user duoc duyet bao gia: admin luon duoc (khong doi qua UI).
    Leader/member deu di qua co app_users.can_approve_quotes (migration 053) -
    leader mac dinh duoc bat co nay (backfill migration 054 + tu dong bat khi
    thang role len leader, xem update_user_role()), nhung admin van tuy chinh
    tat duoc cho tung leader cu the qua UI Quan ly thanh vien neu can."""
    if not user:
        return False
    role = str(user.get("role") or "").strip().lower()
    if role == "admin":
        return True
    return bool(user.get("can_approve_quotes"))


def can_edit_quote(user: dict[str, Any] | None, quote: dict[str, Any] | None, lead: dict[str, Any] | None) -> bool:
    """True neu user duoc xem/sua 1 bao gia CHUA duyet: nguoi tao bao gia,
    nguoi quan ly/phu trach deal gan voi bao gia (leaded_by/sdr_id), nguoi co
    full CRM access (admin/leader/sale-team), hoac nguoi co quyen duyet bao gia
    (can duoc xem/sua truoc khi quyet dinh duyet). KHONG tu dong cho phep chi
    vi la nguoi tao deal khac - phai gan dung deal cua bao gia nay."""
    if not user:
        return False
    if has_full_crm_access(user):
        return True
    if can_approve_quote(user):
        return True
    uid = str(user.get("id") or "")
    if not uid:
        return False
    if quote and str(quote.get("created_by") or quote.get("createdById") or "") == uid:
        return True
    if lead and (str(lead.get("leaded_by") or "") == uid or str(lead.get("sdr_id") or "") == uid):
        return True
    return False


def can_edit_contract(user: dict[str, Any] | None, contract: dict[str, Any] | None, lead: dict[str, Any] | None) -> bool:
    """True neu user duoc xem/sua 1 hop dong: nguoi tao hop dong, nguoi quan
    ly/phu trach deal gan voi hop dong nay (leaded_by/sdr_id), hoac nguoi co
    full CRM access (admin/leader/sale-team). Cung logic can_edit_quote."""
    if not user:
        return False
    if has_full_crm_access(user):
        return True
    uid = str(user.get("id") or "")
    if not uid:
        return False
    if contract and str(contract.get("createdById") or "") == uid:
        return True
    if lead and (str(lead.get("leaded_by") or "") == uid or str(lead.get("sdr_id") or "") == uid):
        return True
    return False


def can_write_lead(user: dict[str, Any] | None, lead: dict[str, Any] | None) -> bool:
    """True neu user duoc sua/xoa 1 Lead (`crm_leads`): co full CRM access
    (admin/leader/sale-team), hoac la SDR duoc giao lead do (sdr_id). Cung
    style/quyet dinh voi can_write_deal - chi khac field so sanh (sdr_id thay
    vi leaded_by/sdr_id, vi Lead luon co dung 1 nguoi phu trach la SDR)."""
    if not user:
        return False
    if has_full_crm_access(user):
        return True
    if not lead:
        return False
    uid = str(user.get("id") or "")
    if not uid:
        return False
    return str(lead.get("sdr_id") or "") == uid


def can_view_lead(user: dict[str, Any] | None, lead: dict[str, Any] | None) -> bool:
    """True neu user duoc xem 1 Lead: co the sua (xem tu nhien duoc), hoac la
    AE duoc gan o buoc qualify (qualification_ae_id), hoac la nguoi phu
    trach/tao deal ma lead nay da duoc convert sang (converted_deal_id ->
    customer_leads.leaded_by/sdr_id) - Sale/AE nhan deal tu 1 lead van can
    xem lai lead goc de biet lich su qualify truoc do."""
    if not user:
        return False
    if can_write_lead(user, lead):
        return True
    if not lead:
        return False
    uid = str(user.get("id") or "")
    if not uid:
        return False
    if str(lead.get("qualification_ae_id") or "") == uid:
        return True
    converted_deal = lead.get("_converted_deal")
    if converted_deal and (str(converted_deal.get("leaded_by") or "") == uid or str(converted_deal.get("sdr_id") or "") == uid):
        return True
    return False


# Luu y: quyen ho so `crm_customers` (sua/xem) KHONG dat o day - da co san,
# dung, va dang duoc dung that trong crm_customer_service.py
# (can_edit_customer/can_view_customer/_customer_ids_visible_to), cung logic
# chot voi sep (admin/leader toan quyen; owner_id duoc sua; Sale chi co deal
# lien quan duoc XEM khong duoc SUA; created_by chi audit) nhung can 1 truy
# van DB rieng (_customer_ids_visible_to) de loc danh sach hang loat cho
# list_customers - khong hop voi chu ky ham (user, customer, linked_deals)
# dung chung cho deal/quote/contract o file nay. Khong nhan doi 1 ban thu 2
# khong dung o day de tranh 2 nguon quyen lech nhau theo thoi gian.
