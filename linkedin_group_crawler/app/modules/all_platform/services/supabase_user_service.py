"""Supabase-based user service for all-platform module."""

from __future__ import annotations

import copy
import logging
import time
from typing import Any, Dict, Optional

from supabase import Client

from app.core.supabase_client import execute_supabase_query, get_supabase_client, reset_supabase_client

logger = logging.getLogger(__name__)


_TEAMS_CACHE: dict[str, object] = {"expires_at": 0.0, "data": []}
_TEAMS_CACHE_TTL_SECONDS = 60.0
_TEAM_MEMBERS_CACHE: dict[str, tuple[float, list[dict]]] = {}
_ALL_USERS_CACHE: dict[str, object] = {"expires_at": 0.0, "data": []}
_USER_LIST_CACHE_TTL_SECONDS = 60.0


def _clone_rows(rows: list[dict]) -> list[dict]:
    return copy.deepcopy(rows)


def _clear_people_caches() -> None:
    _TEAMS_CACHE["expires_at"] = 0.0
    _TEAMS_CACHE["data"] = []
    _TEAM_MEMBERS_CACHE.clear()
    _ALL_USERS_CACHE["expires_at"] = 0.0
    _ALL_USERS_CACHE["data"] = []


def _clear_auth_cache(user_id: str | None = None, email: str | None = None) -> None:
    try:
        from app.modules.all_platform.services.auth_service import clear_user_cache

        clear_user_cache(user_id=user_id, email=email)
    except Exception:
        pass


def _is_transient_supabase_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(part in msg for part in ("server disconnected", "remoteprotocolerror", "timed out", "timeout"))


_SAFE_USER_COLUMNS = "id, email, name, role, is_active, created_at, updated_at"


def get_user(email: str) -> dict:
    """Get user by email. Never returns the password hash."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .select(_SAFE_USER_COLUMNS)
        .eq("email", email)
        .execute()
    )
    return result.data[0] if result.data else {}


def upsert_user(payload: dict) -> dict:
    """Insert or update a user."""
    supabase: Client = get_supabase_client()

    upsert_data = {
        "email": payload["email"],
        "name": payload.get("name"),
        "slug": payload.get("slug"),
        "role": payload.get("role", "member"),
        "email_leader": payload.get("email_leader"),
        "profile_id": payload.get("profile_id"),
        "facebook_name": payload.get("facebook_name"),
    }

    result = (
        supabase.table("app_users")
        .upsert(upsert_data, on_conflict="email")
        .execute()
    )
    _clear_people_caches()
    _clear_auth_cache(email=payload.get("email"))
    return result.data[0] if result.data else {}


def update_user_slug(email: str, slug: str) -> dict:
    """Update a user's profile slug."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .update({"slug": slug, "updated_at": "now()"})
        .eq("email", email)
        .execute()
    )
    _clear_people_caches()
    _clear_auth_cache(email=email)
    return result.data[0] if result.data else {}


def update_user_role(email: str, role: str) -> dict:
    """Update a user's role."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .update({"role": role, "updated_at": "now()"})
        .eq("email", email)
        .execute()
    )
    _clear_people_caches()
    _clear_auth_cache(email=email)
    return result.data[0] if result.data else {}


def get_team_members(leader_id: str) -> list[dict]:
    """Get all members of a leader's team by leader user id."""
    cache_key = str(leader_id)
    now = time.monotonic()
    cached = _TEAM_MEMBERS_CACHE.get(cache_key)
    if cached and cached[0] > now:
        return _clone_rows(cached[1])

    # Get all teams led by this leader
    teams_res = execute_supabase_query(
        lambda: get_supabase_client().table("teams").select("id").eq("id_leader", leader_id).execute()
    )
    team_ids = [t["id"] for t in (teams_res.data or [])]
    if not team_ids:
        _TEAM_MEMBERS_CACHE[cache_key] = (time.monotonic() + _USER_LIST_CACHE_TTL_SECONDS, [])
        return []

    # Get all member IDs of those teams
    mot_res = execute_supabase_query(
        lambda: get_supabase_client().table("member_of_teams").select("id_member").in_("id_teams", team_ids).execute()
    )
    member_ids = list(set([r["id_member"] for r in (mot_res.data or []) if r.get("id_member")]))

    if not member_ids:
        _TEAM_MEMBERS_CACHE[cache_key] = (time.monotonic() + _USER_LIST_CACHE_TTL_SECONDS, [])
        return []

    users_result = execute_supabase_query(
        lambda: (
            get_supabase_client().table("app_users")
            .select(_SAFE_USER_COLUMNS)
            .in_("id", member_ids)
            .execute()
        )
    )
    rows = users_result.data or []
    _TEAM_MEMBERS_CACHE[cache_key] = (time.monotonic() + _USER_LIST_CACHE_TTL_SECONDS, _clone_rows(rows))
    if len(_TEAM_MEMBERS_CACHE) > 500:
        for key in list(_TEAM_MEMBERS_CACHE.keys())[:-500]:
            _TEAM_MEMBERS_CACHE.pop(key, None)
    return _clone_rows(rows)


def add_team_member(leader_id: str, member_id: str) -> dict:
    """Add a member to a leader's team by ids (adds to their first team)."""
    supabase: Client = get_supabase_client()

    # Find the leader's teams
    teams_res = supabase.table("teams").select("id").eq("id_leader", leader_id).execute()
    if not teams_res.data:
        # Create a default team if they don't have one
        default_team = supabase.table("teams").insert({"name_team": "Default Team", "id_leader": leader_id}).execute()
        if not default_team.data:
            return {}
        team_id = default_team.data[0]["id"]
    else:
        team_id = teams_res.data[0]["id"]

    # Insert into member_of_teams
    result = (
        supabase.table("member_of_teams")
        .insert({"id_teams": team_id, "id_member": member_id})
        .execute()
    )
    _clear_people_caches()
    return result.data[0] if result.data else {}


def get_all_users() -> list[dict]:
    """Get all users."""
    now = time.monotonic()
    cached = _ALL_USERS_CACHE.get("data")
    if isinstance(cached, list) and cached and float(_ALL_USERS_CACHE.get("expires_at") or 0) > now:
        return _clone_rows(cached)

    result = execute_supabase_query(lambda: get_supabase_client().table("app_users").select(_SAFE_USER_COLUMNS).execute())
    rows = result.data or []
    _ALL_USERS_CACHE["data"] = _clone_rows(rows)
    _ALL_USERS_CACHE["expires_at"] = time.monotonic() + _USER_LIST_CACHE_TTL_SECONDS
    return _clone_rows(rows)


def get_users_by_role(role: str) -> list[dict]:
    """Get users filtered by role (e.g. 'leader', 'member')."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .select("id, email, name, role")
        .eq("role", role)
        .order("email")
        .execute()
    )
    return result.data or []


# ── Teams CRUD ─────────────────────────────────────────────────────────────────

def _resolve_user_id(supabase: Client, identifier: str) -> str:
    """Resolve a user identifier (email or UUID) to a UUID string."""
    if not identifier or not identifier.strip():
        raise ValueError("User identifier cannot be empty")
    identifier = identifier.strip()
    if len(identifier) >= 32 or "-" in identifier:
        return identifier
    row = (
        supabase.table("app_users")
        .select("id")
        .eq("email", identifier)
        .limit(1)
        .execute()
    )
    if row.data:
        return str(row.data[0]["id"])
    raise ValueError(f"Không tìm thấy user với email: {identifier}")


def _load_all_teams() -> list[dict]:
    supabase: Client = get_supabase_client()

    # Fetch teams
    teams_result = (
        supabase.table("teams")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    teams_rows = teams_result.data or []

    # Fetch member_of_teams associations
    mot_result = (
        supabase.table("member_of_teams")
        .select("*")
        .execute()
    )
    mot_rows = mot_result.data or []

    # Map team ID to list of member IDs
    team_members_map = {}
    for mot in mot_rows:
        tid = str(mot["id_teams"])
        mid = str(mot["id_member"])
        if tid not in team_members_map:
            team_members_map[tid] = []
        team_members_map[tid].append(mid)

    # Collect all user IDs (leaders and members) to fetch in one query
    user_ids = set()
    for t in teams_rows:
        if t.get("id_leader"):
            user_ids.add(str(t["id_leader"]))
    for mids in team_members_map.values():
        for mid in mids:
            user_ids.add(mid)

    user_map = {}
    if user_ids:
        users_result = (
            supabase.table("app_users")
            .select("id, email, name")
            .in_("id", list(user_ids))
            .execute()
        )
        for u in (users_result.data or []):
            user_map[str(u["id"])] = u

    # Build the final output list
    teams_list = []
    for r in teams_rows:
        tid = str(r["id"])
        leader_id = str(r.get("id_leader")) if r.get("id_leader") else ""
        leader = user_map.get(leader_id) or {}
        
        # Build member list for this team
        mids = team_members_map.get(tid, [])
        members = []
        for mid in mids:
            mem = user_map.get(mid)
            if mem:
                members.append({
                    "id": mem["id"],
                    "email": mem["email"],
                    "name": mem.get("name") or mem["email"].split("@")[0],
                })

        teams_list.append({
            "id": tid,
            "name_team": r.get("name_team"),
            "id_leader": leader_id,
            "leader_email": leader.get("email") or "",
            "leader_name": leader.get("name") or (leader.get("email") or "").split("@")[0],
            "members": members,
            "number_of_member": len(members),
        })

    return teams_list


def get_all_teams() -> list[dict]:
    """Get all teams, with short cache/retry to survive flaky Supabase HTTP/2 connections."""
    now = time.monotonic()
    cached = _TEAMS_CACHE.get("data")
    if isinstance(cached, list) and cached and float(_TEAMS_CACHE.get("expires_at") or 0) > now:
        return cached

    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            data = _load_all_teams()
            _TEAMS_CACHE["data"] = data
            _TEAMS_CACHE["expires_at"] = time.monotonic() + _TEAMS_CACHE_TTL_SECONDS
            return data
        except Exception as exc:
            last_exc = exc
            reset_supabase_client()
            if not _is_transient_supabase_error(exc) or attempt == 2:
                break
            time.sleep(0.25 * (attempt + 1))

    if isinstance(cached, list) and cached:
        return cached
    if last_exc:
        raise last_exc
    return []


# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Admin teams-management combined RPC (replaces 1 + N HTTP)
# ─────────────────────────────────────────────────────────────────────────────
#
# Trước: FE gọi `/teams` (1 endpoint, có cache 60s) + N lần `/kpi/get-team-overview-v3`
# song song (mỗi team 1 RPC). Với 10 team → tổng ~2-3s.
#
# Sau: 1 RPC duy nhất `get_admin_teams_kpi_overview` trả về
#   { teams: [{id, name_team, leader_email, members, number_of_member}, ...],
#     kpi_data: [{team_id, member_id, kpi_*, post/inbox/lead actual}, ...],
#     range: {start, end} }
# ─────────────────────────────────────────────────────────────────────────────

_TEAMS_WITH_KPI_CACHE_TTL_SECONDS = 30.0
_TEAMS_WITH_KPI_CACHE: dict[str, tuple[float, dict]] = {}


def _teams_with_kpi_cache_get(key: str) -> dict | None:
    item = _TEAMS_WITH_KPI_CACHE.get(key)
    if not item:
        return None
    expires_at, value = item
    if expires_at > time.monotonic():
        return value
    _TEAMS_WITH_KPI_CACHE.pop(key, None)
    return None


def _teams_with_kpi_cache_set(key: str, value: dict) -> dict:
    _TEAMS_WITH_KPI_CACHE[key] = (time.monotonic() + _TEAMS_WITH_KPI_CACHE_TTL_SECONDS, value)
    return value


def get_all_teams_with_kpi(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Trả về teams + KPI combined cho admin teams-management page.

    Cache TTL 30s (khoảng ngày thường ít thay đổi trong phiên admin).
    Fallback graceful nếu RPC fail → trả teams rỗng để FE không crash.
    QUAN TRỌNG: KHÔNG cache empty payload — nếu RPC fail ta vẫn retry cache
    miss lần sau (vd migration chưa chạy xong hoặc network blip).
    """
    cache_key = f"teams_kpi|{start_date or ''}|{end_date or ''}"
    cached = _teams_with_kpi_cache_get(cache_key)
    if cached is not None:
        return cached

    supabase: Client = get_supabase_client()
    payload: dict = {"teams": [], "kpi_data": [], "range": {}}
    try:
        res = execute_supabase_query(
            lambda: supabase.rpc(
                "get_admin_teams_kpi_overview",
                {"p_start": start_date, "p_end": end_date},
            ).execute()
        )
        if res and res.data:
            payload = res.data if isinstance(res.data, dict) else dict(res.data)
    except Exception as exc:
        # Fallback: trả rỗng, FE vẫn render bảng rỗng (không crash).
        # KHÔNG cache — lần gọi tới sẽ thử lại (hữu ích khi migration
        # vừa được apply hoặc Supabase vừa thoát khỏi transient outage).
        try:
            logger.warning(
                "get_admin_teams_kpi_overview RPC failed (no cache): %s", exc
            )
        except Exception:
            pass
        return payload

    # Chỉ cache khi RPC thành công VÀ có data (không cache empty)
    if payload.get("teams") or payload.get("kpi_data"):
        return _teams_with_kpi_cache_set(cache_key, payload)
    return payload


def create_team(name_team: str, leader_email_or_id: str, member_emails_or_ids: list[str]) -> list[dict]:
    """Create a new team in the teams table and associate members in member_of_teams."""
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    # 1. Insert into teams table
    team_data = {
        "name_team": name_team,
        "id_leader": leader_id,
    }
    team_res = supabase.table("teams").insert(team_data).execute()
    if not team_res.data:
        return []
    
    new_team = team_res.data[0]
    team_id = new_team["id"]

    # 2. Insert into member_of_teams table
    mot_records = []
    for mid in member_emails_or_ids:
        m_str = str(mid).strip()
        if not m_str:
            continue
        try:
            resolved_member_id = _resolve_user_id(supabase, m_str)
        except ValueError:
            continue
        mot_records.append({
            "id_teams": team_id,
            "id_member": resolved_member_id
        })

    if mot_records:
        supabase.table("member_of_teams").insert(mot_records).execute()

    _clear_people_caches()
    return [new_team]


def update_team(team_name: str, leader_email_or_id: str, member_emails_or_ids: list[str], team_id: str | None = None) -> list[dict]:
    """Replace members of a team in member_of_teams, and optionally update its leader/name.

    Neu co team_id (sua tu UI, biet chac team nao) thi tim theo id de ho tro doi ten team
    an toan. Neu khong co team_id (cac noi goi cu hon) thi fallback ve tim theo name_team
    nhu truoc, giu tuong thich nguoc.
    """
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    # 1. Find the team - uu tien theo id neu co, tranh truong hop doi ten lam mat team cu
    if team_id:
        team_res = supabase.table("teams").select("id").eq("id", team_id).execute()
    else:
        team_res = supabase.table("teams").select("id").eq("name_team", team_name).execute()
    if not team_res.data:
        # If team doesn't exist, create it
        return create_team(team_name, leader_id, member_emails_or_ids)

    found_team_id = team_res.data[0]["id"]

    # 2. Update leader + name_team (ho tro doi ten team) trong bang teams
    supabase.table("teams").update({"id_leader": leader_id, "name_team": team_name}).eq("id", found_team_id).execute()
    team_id = found_team_id

    # 3. Resolve danh sach member moi duoc gui len
    desired_member_ids: set[str] = set()
    for mid in member_emails_or_ids:
        m_str = str(mid).strip()
        if not m_str:
            continue
        try:
            resolved_member_id = _resolve_user_id(supabase, m_str)
        except ValueError:
            continue
        desired_member_ids.add(resolved_member_id)

    # 4. Chi xoa/them phan THAY DOI (khong con xoa het roi insert lai toan bo).
    # Truoc day xoa het + insert lai toan bo -> neu 1 member vua duoc them thang
    # vao DB (vd fix du lieu tay) ma khong nam trong danh sach FE dang gui (FE
    # load form tu truoc, chua biet ve thay doi do) thi lan luu tiep theo se
    # xoa mat member do, du nguoi sua team khong co y dinh xoa ai ca.
    existing_res = supabase.table("member_of_teams").select("id_member").eq("id_teams", team_id).execute()
    existing_member_ids = {r["id_member"] for r in (existing_res.data or [])}

    to_remove = existing_member_ids - desired_member_ids
    to_add = desired_member_ids - existing_member_ids

    if to_remove:
        supabase.table("member_of_teams").delete().eq("id_teams", team_id).in_("id_member", list(to_remove)).execute()

    if to_add:
        supabase.table("member_of_teams").insert(
            [{"id_teams": team_id, "id_member": mid} for mid in to_add]
        ).execute()

    _clear_people_caches()
    return [{"id": team_id, "name_team": team_name, "id_leader": leader_id}]


def delete_team(team_name: str, leader_email_or_id: str) -> int:
    """Delete a team and its member associations."""
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    # 1. Find the team by name_team and leader_id
    team_res = supabase.table("teams").select("id").eq("name_team", team_name).eq("id_leader", leader_id).execute()
    if not team_res.data:
        return 0
        
    team_id = team_res.data[0]["id"]

    # 2. Delete member relationships first (due to foreign keys)
    supabase.table("member_of_teams").delete().eq("id_teams", team_id).execute()

    # 3. Delete the team
    res = supabase.table("teams").delete().eq("id", team_id).execute()
    _clear_people_caches()
    return len(res.data) if res.data else 0
