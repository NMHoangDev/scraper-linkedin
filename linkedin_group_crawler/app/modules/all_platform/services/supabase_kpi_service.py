"""Supabase-based KPI service for all-platform module."""

from __future__ import annotations

from typing import Optional

from supabase import Client

from app.core.supabase_client import get_supabase_client


def assign_kpi(payload: dict) -> dict:
    """Assign KPI to a member — upsert into kpi_tracker."""
    supabase: Client = get_supabase_client()

    # Resolve member email to app_users.id
    email = payload.get("email")
    member_res = supabase.table("app_users").select("id").eq("email", email).execute()
    if not member_res.data:
        raise ValueError(f"Không tìm thấy user với email: {email}")
    id_member = member_res.data[0]["id"]

    # Resolve leader email to app_users.id
    email_leader = payload.get("email_leader")
    leader_res = supabase.table("app_users").select("id").eq("email", email_leader).execute()
    if not leader_res.data:
        raise ValueError(f"Không tìm thấy leader với email: {email_leader}")
    id_leader = leader_res.data[0]["id"]

    id_team = payload.get("id_team")

    kpi_items = payload.get("kpi", [])
    kpi_comment = 0
    kpi_post = 0
    kpi_lead = 0
    kpi_inbox = 0
    start_date = None
    end_date = None

    if kpi_items:
        latest = kpi_items[-1]
        kpi_comment = latest.get("kpi_comment", 0) or latest.get("kpi_per_week", 0) or 0
        kpi_post = latest.get("kpi_post", 0)
        kpi_lead = latest.get("kpi_lead", 0)
        kpi_inbox = latest.get("kpi_inbox", 0)
        start_date = latest.get("start_day")
        end_date = latest.get("end_day")

    upsert_data = {
        "id_member": id_member,
        "id_leader": id_leader,
        "id_platform": payload.get("id_platform", 1),
        "id_team": id_team,
        "kpi_comment": kpi_comment,
        "kpi_post": kpi_post,
        "kpi_lead": kpi_lead,
        "kpi_inbox": kpi_inbox,
        "start_date": start_date,
        "end_date": end_date,
        "status": "active",
    }

    # Check if there is already an active KPI for this member in this team
    query = (
        supabase.table("kpi_tracker")
        .select("id")
        .eq("id_member", id_member)
        .eq("status", "active")
    )
    if id_team:
        query = query.eq("id_team", id_team)
    else:
        query = query.is_("id_team", "null")
        
    existing = query.execute()

    if existing.data:
        # Update existing
        kpi_id = existing.data[0]["id"]
        result = (
            supabase.table("kpi_tracker")
            .update(upsert_data)
            .eq("id", kpi_id)
            .execute()
        )
    else:
        # Insert new
        result = (
            supabase.table("kpi_tracker")
            .insert(upsert_data)
            .execute()
        )

    return result.data[0] if result.data else {}


def get_all_kpis_for_leader(leader_email: str, id_team: Optional[str] = None) -> dict:
    """Get all KPIs for a leader's team with weekly actual counts."""
    supabase: Client = get_supabase_client()

    # Get leader ID
    leader_res = supabase.table("app_users").select("id").eq("email", leader_email).execute()
    if not leader_res.data:
        return {"total": 0, "members": []}
    leader_id = leader_res.data[0]["id"]

    # Get all members of this leader from member_of_teams
    if id_team:
        members_result = (
            supabase.table("member_of_teams")
            .select("id_member")
            .eq("id_teams", id_team)
            .execute()
        )
    else:
        # Fallback: get all member IDs of all teams led by this leader
        teams_result = (
            supabase.table("teams")
            .select("id")
            .eq("id_leader", leader_id)
            .execute()
        )
        team_ids = [t["id"] for t in (teams_result.data or [])]
        if not team_ids:
            return {"total": 0, "members": []}
        members_result = (
            supabase.table("member_of_teams")
            .select("id_member")
            .in_("id_teams", team_ids)
            .execute()
        )
        
    member_ids = [r["id_member"] for r in (members_result.data or []) if r.get("id_member")]

    if not member_ids:
        return {"total": 0, "members": []}

    # Get user info
    user_result = (
        supabase.table("app_users")
        .select("*")
        .in_("id", member_ids)
        .execute()
    )
    user_map = {str(u["id"]): u for u in (user_result.data or [])}

    # Get KPI for each member
    kpi_query = (
        supabase.table("kpi_tracker")
        .select("*")
        .in_("id_member", member_ids)
        .eq("status", "active")
    )
    if id_team:
        kpi_query = kpi_query.eq("id_team", id_team)
        
    kpi_result = kpi_query.execute()
    kpi_map = {}
    for k in (kpi_result.data or []):
        kpi_map[str(k["id_member"])] = k

    # Calculate default weekly range (current week: Monday to Sunday)
    from datetime import date, timedelta
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    default_start = monday.isoformat()
    default_end = sunday.isoformat()

    # Find minimum start date to fetch records efficiently
    min_start_date = default_start
    for k in kpi_map.values():
        if k.get("start_date") and k["start_date"] < min_start_date:
            min_start_date = k["start_date"]

    # Get seeding content for members (Comments)
    seeding_result = (
        supabase.table("seeding_content_kpi")
        .select("id_member, verify, current_day, content, link_comment, id_social_account, social_accounts(account_name)")
        .in_("id_member", member_ids)
        .gte("current_day", min_start_date)
        .execute()
    )
    seeding_list = seeding_result.data or []

    # Get facebook and linkedin posts for members
    # (Removed fetching posts since post and lead will be 0)
    fb_posts = []
    li_posts = []

    verified_keywords = ("yes", "đã seeding", "xác minh", "verified")

    members_data = []
    for mid in set(str(m) for m in member_ids):
        user = user_map.get(mid)
        if not user:
            continue
        
        active_kpi = kpi_map.get(mid, {})
        start_date = active_kpi.get("start_date") or default_start
        end_date = active_kpi.get("end_date") or default_end

        # Calculate actual Comments within active week
        member_comments = [
            s for s in seeding_list
            if str(s.get("id_member")) == mid
            and s.get("current_day")
            and start_date <= s["current_day"] <= end_date
        ]
        comment_current = len(member_comments)

        # Set Posts and Leads to 0 as requested
        post_current = 0
        lead_current = 0

        members_data.append({
            "id": mid,
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role", "member"),
            "profile_slug": user.get("slug"),
            "email_leader": leader_email,
            "kpi": [active_kpi] if active_kpi else [],
            "seeding_stats": {
                "verified_count": comment_current,
                "kpi_target": active_kpi.get("kpi_comment", 0),
                "kpi_post": active_kpi.get("kpi_post", 0),
                "kpi_post_current": post_current,
                "kpi_lead": active_kpi.get("kpi_lead", 0),
                "kpi_lead_current": lead_current,
                "kpi_inbox": active_kpi.get("kpi_inbox", 0)
            },
            "seeding_items": member_comments,
            "profile_id": user.get("profile_id"),
            "facebook_name": user.get("facebook_name"),
        })

    return {"total": len(members_data), "members": members_data}


def get_kpi_by_email(email: str) -> dict:
    """Get KPI for a specific member."""
    supabase: Client = get_supabase_client()

    # Get user info
    user_result = (
        supabase.table("app_users")
        .select("*")
        .eq("email", email)
        .execute()
    )
    if not user_result.data:
        return {}
    user = user_result.data[0]
    user_id = user["id"]

    result = (
        supabase.table("kpi_tracker")
        .select("*")
        .eq("id_member", user_id)
        .eq("status", "active")
        .execute()
    )

    if result.data:
        kpi = result.data[0]
        # Fetch leader email for compatibility
        leader_res = supabase.table("app_users").select("email").eq("id", kpi.get("id_leader")).execute()
        leader_email = leader_res.data[0]["email"] if leader_res.data else None
        return {
            "email": email,
            "name": user.get("name"),
            "role": user.get("role", "member"),
            "profile_slug": user.get("slug"),
            "email_leader": leader_email,
            "kpi": [kpi],
            "profile_id": user.get("profile_id"),
            "facebook_name": user.get("facebook_name"),
        }
    return {}


def sync_kpi_progress(email: str, posts: list[dict]) -> dict:
    """Sync engagement progress from posts into linkedin_posts table."""
    supabase: Client = get_supabase_client()

    updated = 0
    for post in posts:
        post_url = post.get("post_url")
        if not post_url:
            continue
        update_data = {}
        if "reactions" in post:
            update_data["likes"] = post["reactions"]
        elif "likes" in post:
            update_data["likes"] = post["likes"]
        if "comments" in post:
            update_data["comments"] = post["comments"]
        if "shares" in post:
            update_data["shares"] = post["shares"]

        if update_data:
            user_res = supabase.table("app_users").select("id").eq("email", email.strip().lower()).limit(1).execute()
            user_id = user_res.data[0]["id"] if user_res.data else None
            
            if user_id:
                result = (
                    supabase.table("linkedin_posts")
                    .update(update_data)
                    .eq("post_url", post_url)
                    .eq("id_member", user_id)
                    .execute()
                )
                updated += len(result.data) if result.data else 0

    return {"updated": updated}


def check_permission(email: str) -> dict:
    """Check if user is leader or member."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .select("role, email_leader, name")
        .eq("email", email)
        .execute()
    )

    if result.data:
        user = result.data[0]
        return {
            "role": user.get("role", "member"),
            "email_leader": user.get("email_leader"),
            "name": user.get("name"),
        }

    return {"role": "member", "email_leader": None, "name": None}


def verify_leader_code(code: str) -> dict:
    """Verify leader authorization code."""
    from app.core.config import settings

    if code == settings.leader_code:
        return {"valid": True}
    return {"valid": False}


def update_user_role_to_member(email: str) -> dict:
    """Update user role to member."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("app_users")
        .update({"role": "member", "updated_at": "now()"})
        .eq("email", email)
        .execute()
    )
    return result.data[0] if result.data else {}
