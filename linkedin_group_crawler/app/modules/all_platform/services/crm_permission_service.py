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
