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

    # Get all teams led by this leader
    teams_res = supabase.table("teams").select("id").eq("id_leader", leader_id).execute()
    team_ids = [t["id"] for t in (teams_res.data or [])]
    if not team_ids:
        return []

    # Get all member IDs of those teams
    mot_res = supabase.table("member_of_teams").select("id_member").in_("id_teams", team_ids).execute()
    member_ids = list(set([r["id_member"] for r in (mot_res.data or []) if r.get("id_member")]))

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
    """Get all teams from the teams table, enriched with user names and members via member_of_teams."""
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

    return [new_team]


def update_team(team_name: str, leader_email_or_id: str, member_emails_or_ids: list[str]) -> list[dict]:
    """Replace members of a team in member_of_teams, and optionally update its leader."""
    supabase: Client = get_supabase_client()
    leader_id = _resolve_user_id(supabase, leader_email_or_id)

    # 1. Find the team by name_team
    team_res = supabase.table("teams").select("id").eq("name_team", team_name).execute()
    if not team_res.data:
        # If team doesn't exist, create it
        return create_team(team_name, leader_id, member_emails_or_ids)
    
    team_id = team_res.data[0]["id"]

    # 2. Update leader in teams table if changed
    supabase.table("teams").update({"id_leader": leader_id}).eq("id", team_id).execute()

    # 3. Remove all existing members from member_of_teams for this team
    supabase.table("member_of_teams").delete().eq("id_teams", team_id).execute()

    # 4. Insert new members
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
    return len(res.data) if res.data else 0
