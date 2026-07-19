"""KPI tracking for Internal Engagement (Tương tác nội bộ) — comments and
reactions (like/love/care/haha/wow/sad/angry) and shares that employees
perform, via the comment-extension, on the company's own MarkeeAI-sourced
Facebook Page posts. Separate table from seeding_content_kpi (group seeding),
since posts here aren't crawled by us and reactions have no equivalent there.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from supabase import Client

from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.services.supabase_user_service import get_all_teams, get_user

_VERIFIED_STATUSES = {"success"}

REACTION_LABELS = {
    "like": "Thích",
    "love": "Yêu thích",
    "care": "Thương thương",
    "haha": "Haha",
    "wow": "Wow",
    "sad": "Buồn",
    "angry": "Phẫn nộ",
}


def _get_member_id(email: str) -> Optional[str]:
    supabase: Client = get_supabase_client()
    res = supabase.table("app_users").select("id").eq("email", email).limit(1).execute()
    return res.data[0].get("id") if res.data else None


def record_action(payload: dict) -> dict:
    """Record the final result of one comment/reaction/share attempt."""
    supabase: Client = get_supabase_client()

    id_member = _get_member_id(payload["email_member"])
    if not id_member:
        raise ValueError("Member email not found in app_users")

    data = {
        "id_member": id_member,
        "fanpage_id": payload["fanpage_id"],
        "fanpage_name": payload.get("fanpage_name"),
        "facebook_post_id": payload.get("facebook_post_id"),
        "link_post": payload["link_post"],
        "action_type": payload["action_type"],
        "content": payload.get("content"),
        "reaction_id": payload.get("reaction_id"),
        "id_social_account": payload.get("id_social_account"),
        "profile_id": payload.get("profile_id"),
        "status": payload.get("status", "success"),
        "error_message": payload.get("error_message"),
    }

    result = supabase.table("internal_engagement_kpi").insert(data).execute()
    return result.data[0] if result.data else {}


def get_marks_by_links(email_member: str, link_posts: list[str]) -> dict[str, str]:
    """Bucket each link_post into need/received/completed for this member.

    - "completed": at least one successful action_type='comment' (or any
      successful reaction) row exists for that link_post.
    - "received": at least one 'pending'/'failed' row exists but no success.
    - "need": no row at all.
    """
    if not link_posts:
        return {}

    supabase: Client = get_supabase_client()
    id_member = _get_member_id(email_member)
    if not id_member:
        return {link: "need" for link in link_posts}

    result = (
        supabase.table("internal_engagement_kpi")
        .select("link_post, status")
        .eq("id_member", id_member)
        .in_("link_post", link_posts)
        .execute()
    )

    best_status: dict[str, str] = {}
    for row in result.data or []:
        link = row["link_post"]
        status = row.get("status")
        if status in _VERIFIED_STATUSES:
            best_status[link] = "completed"
        elif link not in best_status:
            best_status[link] = "received"

    return {link: best_status.get(link, "need") for link in link_posts}


def get_action_summary(
    email_member: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> dict:
    """Count successful actions by type for a member (simple KPI summary)."""
    supabase: Client = get_supabase_client()
    id_member = _get_member_id(email_member)
    if not id_member:
        return {"total": 0, "by_action_type": {}}

    query = (
        supabase.table("internal_engagement_kpi")
        .select("action_type, created_at")
        .eq("id_member", id_member)
        .eq("status", "success")
    )
    if date_from:
        query = query.gte("created_at", date_from)
    if date_to:
        query = query.lte("created_at", date_to)

    result = query.execute()
    rows = result.data or []

    by_action_type: dict[str, int] = {}
    for row in rows:
        action_type = row["action_type"]
        by_action_type[action_type] = by_action_type.get(action_type, 0) + 1

    return {"total": len(rows), "by_action_type": by_action_type}


# ── Team visibility (admin sees all teams, leader sees own team) ──────────────

def resolve_team_scope(email: str, team_id_filter: Optional[str] = None) -> tuple[list[dict], str]:
    """Resolve which teams the caller may see, based on their role.

    - admin: every team (or just `team_id_filter` if given, for the dropdown).
    - leader: only the team(s) they lead — `team_id_filter` is ignored (a
      leader cannot use it to peek at another team).
    - member/unknown: no teams (feature is admin/leader only).
    """
    user = get_user(email)
    role = user.get("role", "member")
    all_teams = get_all_teams()

    if role == "admin":
        teams = all_teams
        if team_id_filter:
            teams = [t for t in teams if t["id"] == team_id_filter]
        return teams, role

    if role == "leader":
        my_id = user.get("id")
        teams = [t for t in all_teams if t.get("id_leader") == my_id]
        return teams, role

    return [], role


def _member_team_map(teams: list[dict]) -> dict[str, dict]:
    """member_id -> {team_id, team_name} (first team wins if a member is in more than one).

    Includes the team's leader too — `get_all_teams()`'s `members` list only
    holds `member_of_teams` rows, which does NOT include the leader
    themselves, so without this a leader's own interactions would never show
    up in their own "xem tương tác thành viên" view."""
    out: dict[str, dict] = {}
    for t in teams:
        if t.get("id_leader"):
            out.setdefault(t["id_leader"], {"team_id": t["id"], "team_name": t.get("name_team") or "Team"})
        for m in t.get("members", []):
            out.setdefault(m["id"], {"team_id": t["id"], "team_name": t.get("name_team") or "Team"})
    return out


def _enrich_rows(rows: list[dict]) -> list[dict]:
    """Join id_member -> name/email and id_social_account -> account_name."""
    if not rows:
        return []
    supabase: Client = get_supabase_client()

    member_ids = list({r["id_member"] for r in rows if r.get("id_member")})
    users = (
        supabase.table("app_users").select("id, email, name").in_("id", member_ids).execute().data or []
    ) if member_ids else []
    user_map = {u["id"]: u for u in users}

    account_ids = list({r["id_social_account"] for r in rows if r.get("id_social_account")})
    accounts = (
        supabase.table("social_accounts").select("id, account_name").in_("id", account_ids).execute().data or []
    ) if account_ids else []
    account_map = {a["id"]: a for a in accounts}

    enriched = []
    for r in rows:
        user = user_map.get(r.get("id_member"), {})
        account = account_map.get(r.get("id_social_account"), {})
        action_type = r.get("action_type")
        account_label = account.get("account_name") or r.get("profile_id") or "tài khoản đang đăng nhập"
        if action_type == "comment":
            summary = f"đã bình luận với tài khoản: {account_label} với nội dung: \"{r.get('content') or ''}\""
        elif action_type == "share":
            summary = f"đã chia sẻ bài viết với tài khoản: {account_label}"
        else:
            summary = f"đã tương tác {REACTION_LABELS.get(action_type, action_type)} với tài khoản: {account_label}"

        enriched.append({
            **r,
            "member_email": user.get("email"),
            "member_name": user.get("name") or (user.get("email") or "").split("@")[0] or "?",
            "account_name": account.get("account_name"),
            "summary": summary,
        })
    return enriched


def get_post_interactions(link_post: str, email: str, team_id: Optional[str] = None) -> dict:
    """Detailed interaction rows for one post, scoped to the caller's teams."""
    teams, role = resolve_team_scope(email, team_id)
    if not teams:
        return {"role": role, "teams": [], "items": []}

    member_team = _member_team_map(teams)
    if not member_team:
        return {"role": role, "teams": [{"id": t["id"], "name_team": t.get("name_team")} for t in teams], "items": []}

    caller = get_user(email)
    caller_id = caller.get("id")

    supabase: Client = get_supabase_client()
    rows = (
        supabase.table("internal_engagement_kpi")
        .select("*")
        .eq("link_post", link_post)
        .eq("status", "success")
        .in_("id_member", list(member_team.keys()))
        .order("created_at", desc=True)
        .execute()
    ).data or []

    items = _enrich_rows(rows)
    for item in items:
        team_info = member_team.get(item.get("id_member"), {})
        item["team_id"] = team_info.get("team_id")
        item["team_name"] = team_info.get("team_name")
        # Leader's own interactions get a highlight on the FE (light blue) so
        # they can tell "these are mine" apart from their team's members.
        item["is_caller"] = role == "leader" and item.get("id_member") == caller_id

    return {
        "role": role,
        "teams": [{"id": t["id"], "name_team": t.get("name_team")} for t in teams],
        "items": items,
    }


def get_post_team_counts(link_post: str, email: str, team_id: Optional[str] = None) -> dict:
    """Per-team interaction counts for one post — for the small badges under a post."""
    teams, role = resolve_team_scope(email, team_id)
    if not teams:
        return {"role": role, "teams": []}

    member_team = _member_team_map(teams)
    team_meta = {t["id"]: t.get("name_team") or "Team" for t in teams}
    counts: dict[str, int] = defaultdict(int)

    if member_team:
        supabase: Client = get_supabase_client()
        rows = (
            supabase.table("internal_engagement_kpi")
            .select("id_member")
            .eq("link_post", link_post)
            .eq("status", "success")
            .in_("id_member", list(member_team.keys()))
            .execute()
        ).data or []
        for row in rows:
            team_info = member_team.get(row["id_member"])
            if team_info:
                counts[team_info["team_id"]] += 1

    return {
        "role": role,
        "teams": [
            {"team_id": tid, "team_name": name, "count": counts.get(tid, 0)}
            for tid, name in team_meta.items()
        ],
    }


def get_team_daily_trend(email: str, days: int = 14, team_id: Optional[str] = None) -> dict:
    """Per-team daily interaction counts for the last `days` days — powers the
    stability/trend chart (which team engages consistently vs. sporadically)."""
    teams, role = resolve_team_scope(email, team_id)
    if not teams:
        return {"role": role, "teams": []}

    today = datetime.now(timezone.utc).date()
    day_list = [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]
    since = day_list[0]
    supabase: Client = get_supabase_client()

    result_teams = []
    for team in teams:
        member_ids = [m["id"] for m in team.get("members", [])]
        series_map: dict[str, int] = defaultdict(int)
        if member_ids:
            rows = (
                supabase.table("internal_engagement_kpi")
                .select("created_at")
                .in_("id_member", member_ids)
                .eq("status", "success")
                .gte("created_at", since)
                .execute()
            ).data or []
            for row in rows:
                series_map[str(row["created_at"])[:10]] += 1

        series = [{"date": day, "total": series_map.get(day, 0)} for day in day_list]

        result_teams.append({
            "team_id": team["id"],
            "team_name": team.get("name_team") or "Team",
            "series": series,
        })

    return {"role": role, "teams": result_teams}


def get_team_totals(
    email: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    team_id: Optional[str] = None,
) -> dict:
    """Per-team totals + a simple stability score (share of days in range that
    had at least one interaction — higher = more consistent, not spiky)."""
    teams, role = resolve_team_scope(email, team_id)
    if not teams:
        return {"role": role, "teams": []}

    supabase: Client = get_supabase_client()

    range_days = 30
    if date_from and date_to:
        try:
            d1 = datetime.fromisoformat(date_from).date()
            d2 = datetime.fromisoformat(date_to).date()
            range_days = max((d2 - d1).days + 1, 1)
        except ValueError:
            pass

    result_teams = []
    for team in teams:
        member_ids = [m["id"] for m in team.get("members", [])]
        total = 0
        active_days: set[str] = set()
        by_action_type: dict[str, int] = defaultdict(int)

        if member_ids:
            query = (
                supabase.table("internal_engagement_kpi")
                .select("action_type, created_at")
                .in_("id_member", member_ids)
                .eq("status", "success")
            )
            if date_from:
                query = query.gte("created_at", date_from)
            if date_to:
                query = query.lte("created_at", date_to)
            rows = query.execute().data or []

            total = len(rows)
            for row in rows:
                by_action_type[row["action_type"]] += 1
                active_days.add(str(row["created_at"])[:10])

        stability_score = round(len(active_days) / range_days, 3) if range_days else 0.0

        result_teams.append({
            "team_id": team["id"],
            "team_name": team.get("name_team") or "Team",
            "number_of_member": len(member_ids),
            "total": total,
            "active_days": len(active_days),
            "range_days": range_days,
            "stability_score": stability_score,
            "by_action_type": dict(by_action_type),
        })

    result_teams.sort(key=lambda t: (t["stability_score"], t["total"]), reverse=True)
    return {"role": role, "teams": result_teams}
