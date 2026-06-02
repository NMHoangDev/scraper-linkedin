"""Supabase-based user service for all-platform module."""

from __future__ import annotations

from supabase import Client

from app.core.supabase_client import get_supabase_client


def get_user(email: str) -> dict:
    """Get user by email."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .select("*")
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
    return result.data[0] if result.data else {}


def get_team_members(leader_id: str) -> list[dict]:
    """Get all members of a leader's team by leader user id."""
    supabase: Client = get_supabase_client()

    teams_result = (
        supabase.table("teams")
        .select("id_member")
        .eq("id_leader", leader_id)
        .execute()
    )
    member_ids = [r.get("id_member") for r in (teams_result.data or []) if r.get("id_member")]

    if not member_ids:
        return []

    users_result = (
        supabase.table("app_users")
        .select("*")
        .in_("id", member_ids)
        .execute()
    )
    return users_result.data or []


def add_team_member(leader_id: str, member_id: str) -> dict:
    """Add a member to a leader's team by ids."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("teams")
        .insert({"id_leader": leader_id, "id_member": member_id})
        .execute()
    )
    return result.data[0] if result.data else {}


def get_all_users() -> list[dict]:
    """Get all users."""
    supabase: Client = get_supabase_client()

    result = supabase.table("app_users").select("*").execute()
    return result.data or []


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


def get_all_teams() -> list[dict]:
    """Get all teams from the teams table, enriched with user names via app_users join."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("teams")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []

    user_ids = set()
    for r in rows:
        if r.get("id_member"):
            user_ids.add(str(r["id_member"]))
        if r.get("id_leader"):
            user_ids.add(str(r["id_leader"]))

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

    teams_map: dict[str, dict] = {}
    for r in rows:
        key = f"{r.get('name_team')}_{r.get('id_leader')}"
        leader_id = str(r.get("id_leader")) if r.get("id_leader") else ""
        leader = user_map.get(leader_id) or {}
        
        if key not in teams_map:
            teams_map[key] = {
                "id": r.get("id"),
                "name_team": r.get("name_team"),
                "id_leader": leader_id,
                "leader_email": leader.get("email") or "",
                "leader_name": leader.get("name") or (leader.get("email") or "").split("@")[0],
                "members": [],
                "number_of_member": 0,
            }
        
        mid = str(r.get("id_member")) if r.get("id_member") else ""
        if mid and mid in user_map:
            mem = user_map[mid]
            teams_map[key]["members"].append({
                "id": mem["id"],
                "email": mem["email"],
                "name": mem.get("name") or mem["email"].split("@")[0],
            })
            teams_map[key]["number_of_member"] = len(teams_map[key]["members"])

    return list(teams_map.values())


def create_team(name_team: str, leader_email_or_id: str, member_emails_or_ids: list[str]) -> list[dict]:
    """Create a new team with one row per member (or one row if no members).

    Accepts leader_email_or_id and member_emails_or_ids as either email strings or UUIDs.
    """
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    records: list[dict] = []
    for mid in member_emails_or_ids:
        m_str = str(mid).strip()
        if not m_str:
            continue
        try:
            resolved_id = _resolve_user_id(supabase, m_str)
        except ValueError:
            continue
        records.append({
            "name_team": name_team,
            "id_leader": leader_id,
            "id_member": resolved_id,
        })

    if not records:
        records.append({
            "name_team": name_team,
            "id_leader": leader_id,
            "id_member": None,
        })

    result = supabase.table("teams").insert(records).execute()
    return result.data or []


def update_team(team_name: str, leader_email_or_id: str, member_emails_or_ids: list[str]) -> list[dict]:
    """Replace all rows for a team (identified by name_team + leader_id).

    Accepts leader_email_or_id and member_emails_or_ids as either email strings or UUIDs.
    """
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    supabase.table("teams").delete().eq("name_team", team_name).eq("id_leader", leader_id).execute()
    return create_team(team_name, leader_id, member_emails_or_ids)


def delete_team(team_name: str, leader_email_or_id: str) -> int:
    """Delete all rows for a team identified by name_team + leader_id.

    Accepts leader_email_or_id as either email string or UUID.
    """
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    result = (
        supabase.table("teams")
        .delete()
        .eq("name_team", team_name)
        .eq("id_leader", leader_id)
        .execute()
    )
    return len(result.data) if result.data else 0
