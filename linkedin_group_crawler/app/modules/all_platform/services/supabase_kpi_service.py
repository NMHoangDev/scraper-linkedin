"""Supabase-based KPI service for all-platform module."""

from __future__ import annotations

from typing import Optional

from supabase import Client

from app.core.supabase_client import get_supabase_client


def assign_kpi(payload: dict) -> dict:
    """Assign KPI to a member — upsert into kpi_tracker."""
    supabase: Client = get_supabase_client()

    kpi_items = payload.get("kpi", [])
    kpi_per_week = 0
    start_date = None
    end_date = None

    if kpi_items:
        latest = kpi_items[-1]
        kpi_per_week = latest.get("kpi_per_week", 0) or 0
        start_date = latest.get("start_day")
        end_date = latest.get("end_day")

    upsert_data = {
        "email_member": payload["email"],
        "name": None,
        "url_profile": payload.get("profile_slug"),
        "email_leader": payload["email_leader"],
        "platform": payload.get("platform", "Facebook"),
        "kpi_per_week": kpi_per_week,
        "start_date": start_date,
        "end_date": end_date,
        "status": "active",
    }

    result = (
        supabase.table("kpi_tracker")
        .upsert(upsert_data, on_conflict="email_member")
        .execute()
    )
    return result.data[0] if result.data else {}


def get_all_kpis_for_leader(leader_email: str) -> dict:
    """Get all KPIs for a leader's team."""
    supabase: Client = get_supabase_client()

    # Get all members of this leader
    members_result = (
        supabase.table("teams")
        .select("member_email")
        .eq("leader_email", leader_email)
        .execute()
    )
    member_emails = [r["member_email"] for r in (members_result.data or [])]

    if not member_emails:
        return {"total": 0, "members": []}

    # Get KPI for each member
    kpi_result = (
        supabase.table("kpi_tracker")
        .select("*")
        .in_("email_member", member_emails)
        .execute()
    )

    # Get user info
    user_result = (
        supabase.table("app_users")
        .select("*")
        .in_("email", member_emails)
        .execute()
    )
    user_map = {u["email"]: u for u in (user_result.data or [])}

    members_data = []
    for kpi in (kpi_result.data or []):
        email = kpi["email_member"]
        user = user_map.get(email, {})
        members_data.append({
            "email": email,
            "name": user.get("name"),
            "role": user.get("role", "member"),
            "profile_slug": user.get("slug"),
            "email_leader": kpi.get("email_leader"),
            "kpi": [kpi],
            "profile_id": user.get("profile_id"),
            "facebook_name": user.get("facebook_name"),
        })

    return {"total": len(members_data), "members": members_data}


def get_kpi_by_email(email: str) -> dict:
    """Get KPI for a specific member."""
    supabase: Client = get_supabase_client()

    result = (
        supabase.table("kpi_tracker")
        .select("*")
        .eq("email_member", email)
        .eq("status", "active")
        .execute()
    )

    # Get user info
    user_result = (
        supabase.table("app_users")
        .select("*")
        .eq("email", email)
        .execute()
    )
    user = (user_result.data or [{}])[0]

    if result.data:
        kpi = result.data[0]
        return {
            "email": email,
            "name": user.get("name"),
            "role": user.get("role", "member"),
            "profile_slug": user.get("slug"),
            "email_leader": kpi.get("email_leader"),
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
