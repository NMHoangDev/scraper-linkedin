"""Unified posts service — single source of truth from Supabase, no cache."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from supabase import Client

from app.core.supabase_client import get_supabase_client


def _parse_date(val: Any) -> str:
    if isinstance(val, (date, datetime)):
        return val.date().isoformat() if isinstance(val, datetime) else val.isoformat()
    if isinstance(val, str) and val:
        return val[:10]
    return ""


def _supabase() -> Client:
    return get_supabase_client()


# ── Core fetch ──────────────────────────────────────────────────────────────────

def _fetch_posts(
    *,
    table: str,
    email: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    intent: Optional[str] = None,
    industry: Optional[str] = None,
    team: Optional[str] = None,
    tier: Optional[int] = None,
    icp: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "latest",
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[dict], int]:
    """Fetch posts from a single table with full filter + sort + pagination.

    DB clean note: posts do NOT store taxonomy columns; taxonomy lives on groups.
    - facebook_posts joins via group_id -> facebook_groups
    - linkedin_posts joins via id_group -> linkedin_groups

    Therefore, intent/industry/team/tier filters are applied by first resolving matching group ids.

    Returns (posts, total_count).
    """
    sb = _supabase()
    tbl = sb.table(table)

    # Select nested group to get group_name and taxonomy UUIDs
    if table == "facebook_posts":
        query = tbl.select("*, facebook_groups(group_name, id_intent, id_industry, id_team, id_tier, id_icp)", count="exact")
    else:
        query = tbl.select("*, linkedin_groups(group_name, id_intent, id_industry, id_team, id_tier, id_icp)", count="exact")

    # Scope to requesting user
    if email:
        if table == "facebook_posts":
            # facebook_posts does not have email_crawl and facebook_groups doesn't either.
            # So we do not scope facebook_posts by email directly.
            pass
        else:
            # linkedin_posts does not have email_crawl, we must resolve via linkedin_groups
            pass # handled below in group_ids resolution

    if date_from:
        query = query.gte("crawl_date", date_from)
    if date_to:
        query = query.lte("crawl_date", date_to)

    # Resolve taxonomy and email filters via groups table
    group_ids: list[str] | None = None
    
    if table == "facebook_posts":
        if email:
            user_res = sb.table("app_users").select("id").eq("email", email.strip().lower()).limit(1).execute()
            user_id = user_res.data[0]["id"] if user_res.data else None
            if user_id:
                query = query.eq("id_member", user_id)
            else:
                query = query.eq("id_member", "00000000-0000-0000-0000-000000000000")
                
        if intent or industry or team or tier is not None or icp:
            gq = sb.table("facebook_groups").select("id")
            if intent:
                gq = gq.eq("id_intent", intent)
            if industry:
                gq = gq.eq("id_industry", industry)
            if team:
                gq = gq.eq("id_team", team)
            if tier is not None:
                gq = gq.eq("id_tier", str(tier))
            if icp:
                gq = gq.eq("id_icp", icp)
            gres = gq.execute()
            group_ids = [r.get("id") for r in (gres.data or []) if r.get("id")]
            query = query.in_("group_id", group_ids or ["00000000-0000-0000-0000-000000000000"])
    else:
        # linkedin_posts needs group resolution for BOTH email and taxonomy
        gq = sb.table("linkedin_groups").select("id")
        needs_group_filter = False
        
        if email:
            user_res = sb.table("app_users").select("id").eq("email", email.strip().lower()).limit(1).execute()
            user_id = user_res.data[0]["id"] if user_res.data else None
            if user_id:
                gq = gq.eq("id_member", user_id)
            else:
                gq = gq.eq("id_member", "00000000-0000-0000-0000-000000000000") # Force empty if user not found
            needs_group_filter = True
            
        if intent:
            gq = gq.eq("id_intent", intent)
            needs_group_filter = True
        if industry:
            gq = gq.eq("id_industry", industry)
            needs_group_filter = True
        if team:
            gq = gq.eq("id_team", team)
            needs_group_filter = True
        if tier is not None:
            gq = gq.eq("id_tier", str(tier))
            needs_group_filter = True
        if icp:
            gq = gq.eq("id_icp", icp)
            needs_group_filter = True
            
        if needs_group_filter:
            gres = gq.execute()
            group_ids = [r.get("id") for r in (gres.data or []) if r.get("id")]
            query = query.in_("id_group", group_ids or ["00000000-0000-0000-0000-000000000000"])

    if search:
        # linkedin_posts does not have group_name column
        if table == "facebook_posts":
            query = query.or_(f"content.ilike.%{search}%,group_name.ilike.%{search}%")
        else:
            query = query.ilike("content", f"%{search}%")

    # Sort
    if sort == "score_high":
        query = query.order("score", desc=True, nullsfirst=False)
    elif sort == "score_low":
        query = query.order("score", desc=False, nullsfirst=False)
    elif sort == "comments_high":
        query = query.order("comments", desc=True, nullsfirst=False)
    else:  # latest
        query = query.order("crawl_date", desc=True, nullsfirst=False)

    # Pagination
    offset = (page - 1) * page_size
    query = query.range(offset, offset + page_size - 1)

    result = query.execute()
    posts = result.data or []
    total = result.count or len(posts)

    if not posts:
        return posts, total

    # Collect UUIDs to resolve
    cat_ids = set()
    team_ids = set()
    for p in posts:
        grp = p.get("facebook_groups") or p.get("linkedin_groups") or {}
        if grp.get("id_intent"): cat_ids.add(grp["id_intent"])
        if grp.get("id_industry"): cat_ids.add(grp["id_industry"])
        if grp.get("id_icp"): cat_ids.add(grp["id_icp"])
        if grp.get("id_tier"): cat_ids.add(grp["id_tier"])
        if grp.get("id_team"): team_ids.add(grp["id_team"])

    # Resolve names
    cat_map = {}
    if cat_ids:
        cres = sb.table("categories").select("id, name").in_("id", list(cat_ids)).execute()
        for c in (cres.data or []):
            cat_map[c["id"]] = c["name"]
    team_map = {}
    if team_ids:
        tres = sb.table("teams").select("id, name_team").in_("id", list(team_ids)).execute()
        for t in (tres.data or []):
            team_map[t["id"]] = t["name_team"]

    # Map nested group properties and resolved names to root
    for p in posts:
        grp = p.pop("facebook_groups", None) or p.pop("linkedin_groups", None)
        if grp and isinstance(grp, dict):
            p["group_name"] = grp.get("group_name")
            if grp.get("id_intent"): p["intent"] = cat_map.get(grp["id_intent"])
            if grp.get("id_industry"): p["industry"] = cat_map.get(grp["id_industry"])
            if grp.get("id_icp"): p["icp"] = cat_map.get(grp["id_icp"])
            if grp.get("id_tier"): p["tier"] = cat_map.get(grp["id_tier"])
            if grp.get("id_team"): p["team"] = team_map.get(grp["id_team"])

    return posts, total


def _get_seeded_today(sb: Client, id_member: str, platform: str) -> int:
    try:
        now_vn = datetime.now(timezone.utc) + timedelta(hours=7)
        today = now_vn.date().isoformat()
        query = (
            sb.table("seeding_content_kpi")
            .select("id", count="exact")
            .eq("id_member", id_member)
            .eq("current_day", today)
            .in_("verify", ["yes", "đã seeding", "xác minh", "verified"])
        )
        # Note: In schema, platform is usually a string, but the example has id_platform.
        # If the backend is saving string to a platform column, this works.
        # Otherwise we skip platform filter or adjust based on actual data.
        if platform == "facebook":
            query = query.eq("id_platform", 1)  # Facebook
        elif platform == "linkedin":
            query = query.eq("id_platform", 2)  # LinkedIn
            
        res = query.execute()
        return res.count or 0
    except Exception:
        return 0

def _get_kpi_progress(sb: Client, id_member: str, platform: str) -> tuple[int, int]:
    try:
        # Get active KPI for this member
        # platform filter if needed, but KPI is usually per member/platform
        now_vn = datetime.now(timezone.utc) + timedelta(hours=7)
        today = now_vn.date().isoformat()
        
        kpi_query = sb.table("kpi_tracker").select("start_date, end_date, kpi_per_week, id_platform").eq("id_member", id_member).eq("status", "active")
        kpi_res = kpi_query.execute()
        
        if not kpi_res.data:
            return 0, 0
            
        # If there are multiple, try to match by platform
        target_platform_id = 1 if platform == "facebook" else 2
        active_kpi = None
        for k in kpi_res.data:
            if k.get("id_platform") == target_platform_id:
                active_kpi = k
                break
        
        if not active_kpi:
            return 0, 0
            
        start_date = active_kpi.get("start_date")
        end_date = active_kpi.get("end_date")
        kpi_target = active_kpi.get("kpi_per_week") or 0
        
        if not start_date or not end_date:
            return 0, kpi_target
            
        # Count seeded posts in KPI date range
        progress_query = (
            sb.table("seeding_content_kpi")
            .select("id", count="exact")
            .eq("id_member", id_member)
            .eq("id_platform", target_platform_id)
            .gte("current_day", start_date)
            .lte("current_day", end_date)
            .in_("verify", ["yes", "đã seeding", "xác minh", "verified"])
        )
        
        progress_res = progress_query.execute()
        progress = progress_res.count or 0
        return progress, kpi_target
        
    except Exception as e:
        print("Error getting KPI progress:", e)
        return 0, 0



def _fetch_stats(
    *,
    table: str,
    email: str,
) -> dict[str, Any]:
    """Compute stats from database for a given table."""
    sb = _supabase()
    now_vn = datetime.now(timezone.utc) + timedelta(hours=7)
    today = now_vn.date().isoformat()
    yesterday = (now_vn.date() - timedelta(days=1)).isoformat()

    # Resolve scope logic exactly like _fetch_posts
    group_ids = None
    user_id_fetch = None
    if email:
        user_res = sb.table("app_users").select("id").eq("email", email.strip().lower()).limit(1).execute()
        user_id_fetch = user_res.data[0]["id"] if user_res.data else None
        
    if table == "linkedin_posts" and user_id_fetch:
        gq = sb.table("linkedin_groups").select("id").eq("id_member", user_id_fetch).execute()
        group_ids = [r.get("id") for r in (gq.data or []) if r.get("id")]
    
    def apply_scope(query):
        if table == "linkedin_posts" and email:
            return query.in_("id_group", group_ids or ["00000000-0000-0000-0000-000000000000"])
        if table == "facebook_posts" and email:
            if user_id_fetch:
                return query.eq("id_member", user_id_fetch)
            else:
                return query.eq("id_member", "00000000-0000-0000-0000-000000000000")
        return query

    # Total posts today
    today_start = f"{today}T00:00:00Z"
    today_end = f"{today}T23:59:59Z"
    today_r = apply_scope(sb.table(table).select("id", count="exact").gte("crawl_date", today_start).lte("crawl_date", today_end)).execute()
    today_count = today_r.count or 0

    # Posts yesterday
    yesterday_start = f"{yesterday}T00:00:00Z"
    yesterday_end = f"{yesterday}T23:59:59Z"
    yesterday_r = apply_scope(sb.table(table).select("id", count="exact").gte("crawl_date", yesterday_start).lte("crawl_date", yesterday_end)).execute()
    yesterday_count = yesterday_r.count or 0

    # Total posts (all time)
    total_r = apply_scope(sb.table(table).select("id", count="exact")).execute()
    total_count = total_r.count or 0

    # High score (>= 70)
    high_r = apply_scope(sb.table(table).select("id", count="exact").gte("score", 70)).execute()
    high_count = high_r.count or 0

    # Resolve id_member from email
    id_member = None
    if email:
        user_res = sb.table("app_users").select("id").eq("email", email).limit(1).execute()
        if user_res.data:
            id_member = user_res.data[0]["id"]

    # Seeded today count & KPI Progress
    platform_name = "facebook" if table == "facebook_posts" else "linkedin"
    seeded_today = 0
    kpi_progress = 0
    kpi_target = 0
    if id_member:
        seeded_today = _get_seeded_today(sb, id_member, platform_name)
        kpi_progress, kpi_target = _get_kpi_progress(sb, id_member, platform_name)

    return {
        "totalPostsToday": today_count,
        "postsYesterday": yesterday_count,
        "totalPosts": total_count,
        "highScoreCount": high_count,
        "highScorePercent": round((high_count / total_count) * 100, 1) if total_count > 0 else 0,
        "seededToday": seeded_today,
        "totalVisible": total_count,
        "kpiProgress": kpi_progress,
        "kpiTarget": kpi_target,
        "kpiProgressPercent": round((kpi_progress / kpi_target) * 100, 1) if kpi_target > 0 else 0,
    }


# ── Public API ──────────────────────────────────────────────────────────────────

def get_unified_posts(
    *,
    email: str,
    platform: str,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    intent: Optional[str] = None,
    industry: Optional[str] = None,
    team: Optional[str] = None,
    tier: Optional[int] = None,
    icp: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "latest",
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Fetch posts from one or all platforms, fully filtered server-side."""
    platforms_to_fetch = []
    if platform == "all" or platform == "general":
        platforms_to_fetch = ["facebook_posts", "linkedin_posts"]
    elif platform == "facebook":
        platforms_to_fetch = ["facebook_posts"]
    elif platform == "linkedin":
        platforms_to_fetch = ["linkedin_posts"]
    else:
        platforms_to_fetch = ["facebook_posts", "linkedin_posts"]

    # Normalize sort parameter for backend database order
    db_sort = sort
    if sort == "newest":
        db_sort = "latest"
    elif sort == "engagement":
        db_sort = "comments_high"

    all_posts: list[dict] = []
    total_count = 0

    if len(platforms_to_fetch) > 1:
        # Combined platforms pagination logic:
        # Fetch the top (page * page_size) from each table, merge, sort, and slice.
        combined_limit = page * page_size
        for table in platforms_to_fetch:
            posts, count = _fetch_posts(
                table=table,
                email=email,
                date_from=date_from,
                date_to=date_to,
                intent=intent,
                industry=industry,
                team=team,
                tier=tier,
                icp=icp,
                search=search,
                sort=db_sort,
                page=1,
                page_size=combined_limit,
            )
            # Add platform tag
            platform_name = table.replace("_posts", "")
            for p in posts:
                p["platform"] = platform_name
                p["_platform"] = platform_name
            all_posts.extend(posts)
            total_count += count

        # Sort the combined list
        if sort == "score_high":
            all_posts.sort(key=lambda p: p.get("score", 0), reverse=True)
        elif sort == "score_low":
            all_posts.sort(key=lambda p: p.get("score", 0), reverse=False)
        elif sort == "comments_high" or sort == "engagement":
            all_posts.sort(key=lambda p: (p.get("reactions", 0) + p.get("comments", 0) + p.get("shares", 0)), reverse=True)
        else: # newest / latest
            def get_date_key(p):
                dt = p.get("crawl_date")
                if not dt:
                    return ""
                return str(dt)
            all_posts.sort(key=get_date_key, reverse=True)

        # Slice the combined list for pagination
        offset = (page - 1) * page_size
        all_posts = all_posts[offset : offset + page_size]

    else:
        # Single platform pagination (let database handle pagination directly)
        table = platforms_to_fetch[0]
        posts, count = _fetch_posts(
            table=table,
            email=email,
            date_from=date_from,
            date_to=date_to,
            intent=intent,
            industry=industry,
            team=team,
            tier=tier,
            icp=icp,
            search=search,
            sort=db_sort,
            page=page,
            page_size=page_size,
        )
        platform_name = table.replace("_posts", "")
        for p in posts:
            p["platform"] = platform_name
            p["_platform"] = platform_name
        all_posts = posts
        total_count = count

    # Fetch seeding info for the returned posts
    if all_posts and email:
        try:
            sb = _supabase()
            user_res = sb.table("app_users").select("id").eq("email", email).limit(1).execute()
            if user_res.data:
                id_member = user_res.data[0]["id"]
                post_ids = [p.get("id") for p in all_posts if p.get("id")]
                if post_ids:
                    kpi_res = sb.table("seeding_content_kpi").select("id_post, content, verify, link_comment, social_accounts(account_name)").eq("id_member", id_member).in_("id_post", post_ids).execute()
                    
                    kpi_map = {}
                    for kpi in (kpi_res.data or []):
                        pid = kpi.get("id_post")
                        if pid:
                            sa = kpi.get("social_accounts") or {}
                            kpi_map[pid] = {
                                "seeding_content": kpi.get("content"),
                                "seeding_name": sa.get("account_name") if isinstance(sa, dict) else None,
                                "link_comment": kpi.get("link_comment"),
                                "verify_status": kpi.get("verify")
                            }
                    
                    for p in all_posts:
                        pid = p.get("id")
                        if pid in kpi_map:
                            p.update(kpi_map[pid])
        except Exception as e:
            print("Error fetching seeding info:", e)

    return {
        "posts": all_posts,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
    }


def filter_unified_posts(
    *,
    email: str,
    platform: str,
    date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    intent: Optional[str] = None,
    industry: Optional[str] = None,
    team: Optional[str] = None,
    tier: Optional[int] = None,
    icp: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = "latest",
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    """Filter posts with ALL criteria applied server-side in Supabase."""
    date_from = date_from or date
    return get_unified_posts(
        email=email,
        platform=platform,
        date_from=date_from,
        date_to=date_to,
        intent=intent,
        industry=industry,
        team=team,
        tier=tier,
        icp=icp,
        search=search,
        sort=sort,
        page=page,
        page_size=page_size,
    )


def get_unified_stats(
    *,
    email: str,
    platform: str,
) -> dict[str, Any]:
    """Compute stats from Supabase — no cache, always fresh."""
    tables = []
    if platform == "all" or platform == "general":
        tables = ["facebook_posts", "linkedin_posts"]
    elif platform == "facebook":
        tables = ["facebook_posts"]
    elif platform == "linkedin":
        tables = ["linkedin_posts"]
    else:
        tables = ["facebook_posts", "linkedin_posts"]

    if len(tables) == 1:
        return _fetch_stats(table=tables[0], email=email)

    # Merge stats from multiple platforms
    fb = _fetch_stats(table="facebook_posts", email=email)
    li = _fetch_stats(table="linkedin_posts", email=email)

    total_posts = fb["totalPosts"] + li["totalPosts"]
    high_count = fb["highScoreCount"] + li["highScoreCount"]

    return {
        "totalPostsToday": fb["totalPostsToday"] + li["totalPostsToday"],
        "postsYesterday": fb["postsYesterday"] + li["postsYesterday"],
        "totalPosts": total_posts,
        "highScoreCount": high_count,
        "highScorePercent": round((high_count / total_posts) * 100, 1) if total_posts > 0 else 0,
        "seededToday": fb["seededToday"] + li["seededToday"],
        "totalVisible": total_posts,
        "kpiProgress": fb.get("kpiProgress", 0) + li.get("kpiProgress", 0),
        "kpiTarget": fb.get("kpiTarget", 0) + li.get("kpiTarget", 0),
        "kpiProgressPercent": round(((fb.get("kpiProgress", 0) + li.get("kpiProgress", 0)) / (fb.get("kpiTarget", 0) + li.get("kpiTarget", 0))) * 100, 1) if (fb.get("kpiTarget", 0) + li.get("kpiTarget", 0)) > 0 else 0,
    }
