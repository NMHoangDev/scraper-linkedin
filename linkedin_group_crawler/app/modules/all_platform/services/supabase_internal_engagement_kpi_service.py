"""KPI tracking for Internal Engagement (Tương tác nội bộ) — comments and
reactions (like/love/care/haha/wow/sad/angry) and shares that employees
perform, via the comment-extension, on the company's own MarkeeAI-sourced
Facebook Page posts. Separate table from seeding_content_kpi (group seeding),
since posts here aren't crawled by us and reactions have no equivalent there.
"""

from __future__ import annotations

import html
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
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


def fetch_facebook_post_metadata(url: str, cookie: Optional[str] = None) -> dict[str, Optional[str]]:
    """Tự động cào OpenGraph metadata (Tiêu đề, nội dung, hình ảnh, trang) từ link Facebook"""
    debug_res = debug_fetch_facebook_post_metadata(url, cookie=cookie)
    return debug_res.get("metadata", {})


def debug_fetch_facebook_post_metadata(url: str, cookie: Optional[str] = None) -> dict:
    """Hàm Debug kiểm tra xem Facebook trả về status gì và metadata bóc tách được những gì"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }
    if cookie:
        headers["Cookie"] = cookie.strip()

    metadata: dict[str, Optional[str]] = {
        "title": None,
        "description": None,
        "image": None,
        "site_name": None,
    }
    debug_info = {
        "target_url": url,
        "has_cookie": bool(cookie),
        "http_status": None,
        "final_url": None,
        "is_redirected_to_login": False,
        "error": None,
        "page_title": None,
        "metadata": metadata,
    }

    urls_to_try = [url]
    # Nếu là link Facebook, thử thêm domain mbasic.facebook.com hoặc m.facebook.com (rất thân thiện với cào HTML)
    if "facebook.com" in url:
        mbasic_url = url.replace("www.facebook.com", "mbasic.facebook.com").replace("web.facebook.com", "mbasic.facebook.com").replace("m.facebook.com", "mbasic.facebook.com")
        if mbasic_url != url:
            urls_to_try.append(mbasic_url)
        m_url = url.replace("www.facebook.com", "m.facebook.com").replace("web.facebook.com", "m.facebook.com")
        if m_url != url and m_url not in urls_to_try:
            urls_to_try.append(m_url)

    for target in urls_to_try:
        try:
            with httpx.Client(follow_redirects=True, timeout=8.0) as client:
                res = client.get(target, headers=headers)
                debug_info["http_status"] = res.status_code
                debug_info["final_url"] = str(res.url)
                debug_info["is_redirected_to_login"] = "/login" in str(res.url).lower() or "login.php" in str(res.url).lower()

                res_text = res.text
                if res.status_code != 200 and not debug_info["is_redirected_to_login"]:
                    continue

                # Extract HTML <title>
                m_html_title = re.search(r'<title[^>]*>(.*?)</title>', res_text, re.IGNORECASE | re.DOTALL)
                if m_html_title and not debug_info["page_title"]:
                    debug_info["page_title"] = html.unescape(m_html_title.group(1).strip())

                # Extract og:title
                if not metadata["title"]:
                    m_title = re.search(r'<meta\s+property=["\']og:title["\']\s+content=["\']([^"\']+)["\']', res_text, re.IGNORECASE) or \
                              re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:title["\']', res_text, re.IGNORECASE)
                    if m_title:
                        metadata["title"] = html.unescape(m_title.group(1))

                # Extract og:description
                if not metadata["description"]:
                    m_desc = re.search(r'<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']', res_text, re.IGNORECASE) or \
                             re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:description["\']', res_text, re.IGNORECASE)
                    if m_desc:
                        metadata["description"] = html.unescape(m_desc.group(1))

                # Extract og:image
                if not metadata["image"]:
                    m_img = re.search(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', res_text, re.IGNORECASE) or \
                            re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:image["\']', res_text, re.IGNORECASE)
                    if m_img:
                        metadata["image"] = html.unescape(m_img.group(1))

                # Extract og:site_name
                if not metadata["site_name"]:
                    m_site = re.search(r'<meta\s+property=["\']og:site_name["\']\s+content=["\']([^"\']+)["\']', res_text, re.IGNORECASE) or \
                             re.search(r'<meta\s+content=["\']([^"\']+)["\']\s+property=["\']og:site_name["\']', res_text, re.IGNORECASE)
                    if m_site:
                        metadata["site_name"] = html.unescape(m_site.group(1))

                if metadata["title"] or metadata["description"]:
                    break

        except Exception as e:
            if not debug_info["error"]:
                debug_info["error"] = str(e)

    return debug_info


def extract_fanpage_name_from_meta_or_url(link_post: str, meta: dict) -> str:
    """Trích xuất tên trang hoặc nhóm từ title/meta hoặc từ URL Facebook"""
    title = meta.get("title") or meta.get("page_title")
    if title:
        # Ví dụ: "Việc làm CNTT Đà Nẵng - New | 🚀 CMC Global Đà Nẵng..."
        # Tên trang/nhóm nằm TRƯỚC ký tự '|' (pipe) hoặc '-' đầu tiên
        if "|" in title:
            candidate = title.split("|")[0].strip()
            if candidate and candidate.lower() not in ["facebook", "share"]:
                return candidate
        elif " - " in title:
            candidate = title.split(" - ")[0].strip()
            if candidate and candidate.lower() not in ["facebook", "share"]:
                return candidate
        elif title.strip() and title.strip().lower() not in ["facebook", "share"]:
            return title.strip()

    site_name = meta.get("site_name")
    if site_name and site_name.strip().lower() not in ["facebook", "share"]:
        return site_name.strip()

    # Fallback trích xuất từ URL nếu không có title
    if "facebook.com/groups/" in link_post:
        return "Nhóm Facebook"

    invalid_subs = ["permalink.php", "story.php", "watch", "photo.php", "groups", "pfbid", "profile.php", "share", "p"]
    parts = link_post.replace("https://", "").replace("http://", "").replace("www.", "").split("/")
    if len(parts) > 1 and parts[0].startswith("facebook.com"):
        sub = parts[1].split("?")[0].strip()
        if sub and sub.lower() not in invalid_subs:
            return sub

    return "Markee AI Marketing"


def clean_facebook_content(meta: dict, fanpage_name: str) -> Optional[str]:
    """Làm sạch nội dung bài viết: loại bỏ tên trang bị lặp ở đầu và '| Facebook' ở cuối"""
    raw_title = (meta.get("title") or meta.get("page_title") or "").strip()
    raw_desc = (meta.get("description") or "").strip()

    clean_title = raw_title
    for suffix in ["| Facebook", "- Facebook", "| Meta", "- Meta"]:
        if clean_title.endswith(suffix):
            clean_title = clean_title[:-len(suffix)].strip()

    if fanpage_name and clean_title.startswith(fanpage_name):
        clean_title = clean_title[len(fanpage_name):].lstrip(" |-:")

    parts = []
    if clean_title and clean_title.lower() not in ["facebook", "share"]:
        parts.append(clean_title)

    if raw_desc:
        if not clean_title or (clean_title not in raw_desc and raw_desc not in clean_title):
            parts.append(raw_desc)
        elif len(raw_desc) > len(clean_title):
            parts = [raw_desc]

    return "\n\n".join(parts) if parts else None


def add_custom_post(
    email_member: str,
    link_post: str,
    content: Optional[str] = None,
    fanpage_name: Optional[str] = None,
    media_urls: Optional[list] = None,
    cookie: Optional[str] = None,
) -> dict:
    """Lưu link bài viết thủ công vào DB kèm dữ liệu bóc tách/gán mặc định"""
    supabase: Client = get_supabase_client()
    user_res = supabase.table("app_users").select("id").eq("email", email_member).execute()
    user_id = user_res.data[0]["id"] if user_res.data else None

    if not user_id:
        raise Exception("Không tìm thấy thông tin user.")

    meta = {}
    if not content or not fanpage_name or not media_urls:
        meta = fetch_facebook_post_metadata(link_post, cookie=cookie)

    final_fanpage_name = fanpage_name or extract_fanpage_name_from_meta_or_url(link_post, meta)
    auto_content = clean_facebook_content(meta, final_fanpage_name)
    final_content = content or auto_content or "Bài viết Facebook được nhân viên chia sẻ thủ công."
    final_media_urls = media_urls or ([meta["image"]] if meta.get("image") else [])

    data = {
        "link_post": link_post,
        "id_member": user_id,
        "fanpage_name": final_fanpage_name,
        "content": final_content,
        "media_urls": final_media_urls,
        "published_at": datetime.now(timezone.utc).isoformat(),
    }
    
    try:
        res = supabase.table("internal_engagement_custom_posts").insert(data).execute()
        item = res.data[0] if res.data else {}
        item["platform"] = "facebook"
        return item
    except Exception as err:
        logger.error(f"Lỗi khi insert full data vào internal_engagement_custom_posts: {err}")
        fallback_data = {
            "link_post": link_post,
            "id_member": user_id,
        }
        res = supabase.table("internal_engagement_custom_posts").insert(fallback_data).execute()
        item = res.data[0] if res.data else {}
        item["platform"] = "facebook"
        return item

def get_custom_posts_db(page: int = 1, page_size: int = 20) -> dict:
    """Lấy danh sách bài viết thủ công, sắp xếp thời gian mới nhất giảm dần"""
    supabase: Client = get_supabase_client()
    start = (page - 1) * page_size
    end = start + page_size - 1
    
    res = supabase.table("internal_engagement_custom_posts").select("*").order("created_at", desc=True).range(start, end).execute()
    
    count_res = supabase.table("internal_engagement_custom_posts").select("id", count="exact").execute()
    total = count_res.count if count_res.count else 0
    
    return {"items": res.data or [], "total": total}