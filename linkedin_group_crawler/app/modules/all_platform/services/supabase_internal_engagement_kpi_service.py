"""KPI tracking for Internal Engagement (Tương tác nội bộ) — comments and
reactions (like/love/care/haha/wow/sad/angry) and shares that employees
perform, via the comment-extension, on the company's own MarkeeAI-sourced
Facebook Page posts. Separate table from seeding_content_kpi (group seeding),
since posts here aren't crawled by us and reactions have no equivalent there.
"""

from __future__ import annotations

import html
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import urllib.parse
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from bs4 import BeautifulSoup
import httpx
from fastapi import HTTPException
from supabase import Client

from app.core.logger import get_logger, logger
from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.services.supabase_user_service import get_all_teams, get_user

logger = get_logger(__name__)

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
    res = supabase.table("members").select("id").eq("email", email).limit(1).execute()
    if res.data:
        return res.data[0].get("id")
    res_app = supabase.table("app_users").select("id").eq("email", email).limit(1).execute()
    return res_app.data[0].get("id") if res_app.data else None


def record_action(payload: dict) -> dict:
    """Record the final result of one comment/reaction/share attempt."""
    supabase: Client = get_supabase_client()

    email = payload.get("email_member") or payload.get("email") or ""
    id_member = _get_member_id(email) if email else None
    if not id_member:
        raise ValueError(f"Member email '{email}' not found in app_users")

    data = {
        "id_member": id_member,
        "fanpage_id": payload.get("fanpage_id") or "",
        "fanpage_name": payload.get("fanpage_name") or "",
        "facebook_post_id": payload.get("facebook_post_id") or "unknown",
        "link_post": payload.get("link_post") or payload.get("url") or "",
        "action_type": payload.get("action_type") or "comment",
        "content": payload.get("content") or payload.get("text") or "",
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
    """Chi tiết tương tác: Chỉ lấy những Team được giao, và KPI của đúng bài viết này."""
    teams, role = resolve_team_scope(email, team_id)
    if not teams:
        return {"role": role, "teams": [], "items": []}

    supabase: Client = get_supabase_client()
    
    # 1. Lấy thông tin bài viết gốc (Deadline + Danh sách Team được giao)
    post_res = supabase.table("internal_engagement_custom_posts").select("deadline, assigned_team_ids").eq("link_post", link_post).execute()
    post_data = post_res.data[0] if post_res.data else {}
    
    deadline_str = post_data.get("deadline")
    assigned_team_ids = post_data.get("assigned_team_ids") or []
    
    is_past_deadline = False
    if deadline_str:
        try:
            is_past_deadline = datetime.fromisoformat(deadline_str) < datetime.now(timezone.utc)
        except ValueError:
            pass

    # 2. CHỐT CHẶN TEAM: Chỉ lấy những Team có trong danh sách được giao
    valid_teams = []
    for t in teams:
        if not assigned_team_ids or t["id"] in assigned_team_ids or t.get("name_team") in assigned_team_ids:
            valid_teams.append(t)

    # Nếu không có team nào hợp lệ, trả về rỗng ngay để tránh lỗi
    if not valid_teams:
        return {"role": role, "teams": [], "items": []}

    member_team = _member_team_map(valid_teams)
    member_ids = list(member_team.keys())

    if not member_ids:
        return {"role": role, "teams": [], "items": []}

    users = supabase.table("app_users").select("id, name, email").in_("id", member_ids).execute().data or []
    user_map = {u["id"]: u for u in users}

    # 3. CHỐT CHẶN KPI: Chỉ lấy KPI của đúng link_post này và của những member hợp lệ
    kpi_rows = (
        supabase.table("internal_engagement_kpi")
        .select("*")
        .eq("link_post", link_post) 
        .in_("id_member", member_ids)
        .order("created_at", desc=True) # Sắp xếp giảm dần để lấy hành động mới nhất
        .execute()
    ).data or []
    
    # Gom nhóm KPI theo member (Lọc dữ liệu cũ, chỉ giữ record mới nhất nếu họ thao tác nhiều lần)
    kpi_by_member = {}
    for row in kpi_rows:
        m_id = row["id_member"]
        if m_id not in kpi_by_member:
            kpi_by_member[m_id] = row

    # 4. Trộn dữ liệu xuất ra UI
    items = []
    for m_id, t_info in member_team.items():
        user = user_map.get(m_id, {})
        name = user.get("name") or (user.get("email") or "").split("@")[0] or "Thành viên ẩn"
        
        kpi = kpi_by_member.get(m_id)
        if kpi:
            if kpi["status"] == "success":
                status, status_label = "completed", "Hoàn thành"
            else:
                status, status_label = "failed", "Lỗi / Thất bại"
            
            comment_done = kpi.get("action_type") == "comment" and status == "completed"
            
            if kpi.get("created_at"):
                try:
                    time_str = datetime.fromisoformat(kpi["created_at"]).astimezone().strftime("%H:%M")
                except Exception:
                    time_str = kpi["created_at"][:10]
            else:
                time_str = "—"
        else:
            if is_past_deadline:
                status, status_label = "overdue", "Quá hạn"
            else:
                status, status_label = "received", "Đã nhận"
            comment_done = False
            time_str = "Chưa hoàn thành" if status == "received" else "—"

        items.append({
            "id_member": m_id,
            "name": name,
            "team": t_info.get("team_name", "Team"),
            "status": status,
            "statusLabel": status_label,
            "comment": comment_done,
            "time": time_str
        })

    return {
        "role": role,
        "teams": [{"id": t["id"], "name_team": t.get("name_team")} for t in valid_teams],
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


_TRACKING_PARAMS = {
    "mibextid", "ref", "__cft__", "__tn__", "rdid", "wtsid", "sfnsn",
    "paipv", "notif_id", "notif_t", "checkpoint_data", "refsrc", "hrc", "_rdr",
    "st", "s", "set"
}


def clean_url(url: str) -> str:
    """Làm sạch URL bạo lực theo yêu cầu:
    1. Nếu có share_url= trong query params -> urllib.parse.unquote giải mã lấy link thật trước.
    2. Nếu URL chứa /watch (video) -> Giữ lại query ?v=...
    3. Mọi format khác (posts, permalink, groups, photo, pfbid, share...) -> split('?')[0] chặt sạch rác.
    4. Strip trailing '#' và '/' để chuẩn hóa tuyệt đối.
    """
    if not url:
        return ""

    cleaned = url.strip()

    # 1. Unquote if share_url parameter exists in query
    if "share_url=" in cleaned:
        try:
            parsed = urlparse(cleaned)
            query_params = parse_qs(parsed.query)
            if "share_url" in query_params and query_params["share_url"]:
                decoded = urllib.parse.unquote(query_params["share_url"][0])
                if decoded and decoded.startswith("http"):
                    cleaned = decoded
        except Exception:
            pass

    # 2. If video link with /watch, keep ?v= parameter
    if "/watch" in cleaned:
        try:
            parsed = urlparse(cleaned)
            query_params = parse_qs(parsed.query)
            v_val = query_params.get("v", [None])[0]
            base_path = cleaned.split("?")[0].rstrip("/#")
            if v_val:
                cleaned = f"{base_path}?v={v_val}"
            else:
                cleaned = base_path
        except Exception:
            cleaned = cleaned.split("?")[0].rstrip("/#")
    else:
        # 3. For all other post URLs: split('?')[0] chop off all query parameters!
        cleaned = cleaned.split("?")[0]

    # 4. Strip trailing # and /
    cleaned = cleaned.rstrip("/#")

    # Standardize domain to www.facebook.com
    try:
        parsed = urlparse(cleaned)
        netloc = parsed.netloc
        if netloc in ["m.facebook.com", "mobile.facebook.com", "web.facebook.com", "l.facebook.com", "fb.com"]:
            cleaned = urlunparse(parsed._replace(netloc="www.facebook.com"))
    except Exception:
        pass

    return cleaned


def strip_fb_tracking_params(url_str: str) -> str:
    """Loại bỏ các query tracking parameters khỏi URL Facebook."""
    return clean_url(url_str)


async def normalize_facebook_url_and_scrape(raw_url: str) -> tuple[str, str]:
    if not raw_url or not raw_url.strip():
        return "", "Bài viết Facebook - Cần tương tác"

    initial_clean_url = clean_url(raw_url)
    final_url = initial_clean_url
    extracted_content = "Bài viết Facebook - Cần tương tác"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0, headers=headers) as client:
            # --- BƯỚC 1: Bắt URL gốc sau khi Redirect ---
            first_res = await client.get(initial_clean_url)
            resolved_url = str(first_res.url)
            
            # BÍ QUYẾT: Đọc HTML tìm og:url để giải mã link /share/ của Facebook
            soup1 = BeautifulSoup(first_res.text or "", "html.parser")
            og_url = soup1.find("meta", property="og:url") or soup1.find("meta", attrs={"name": "og:url"})
            if og_url and og_url.get("content"):
                extracted_og = html.unescape(og_url["content"]).replace("&amp;", "&")
                if "facebook.com" in extracted_og and "/login" not in extracted_og:
                    resolved_url = extracted_og

            if "/login" not in resolved_url.lower() and "checkpoint" not in resolved_url.lower():
                final_url = clean_url(resolved_url)

            # --- BƯỚC 2: Tạo URL mbasic từ link gốc để cào Content ---
            urls_to_scrape = [final_url]
            if "facebook.com" in final_url:
                mbasic = final_url.replace("www.facebook.com", "mbasic.facebook.com").replace("web.facebook.com", "mbasic.facebook.com")
                if mbasic != final_url:
                    urls_to_scrape.append(mbasic)

            for target in urls_to_scrape:
                res = await client.get(target)
                if "/login" in str(res.url).lower() or "login.php" in str(res.url).lower():
                    continue
                    
                html_text = res.text or ""
                soup = BeautifulSoup(html_text, "html.parser")

                content_text = None
                og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "og:title"})
                if og_title and og_title.get("content"): content_text = og_title["content"]
                if not content_text:
                    title_tag = soup.find("title")
                    if title_tag and title_tag.text: content_text = title_tag.text
                if not content_text:
                    og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "og:description"})
                    if og_desc and og_desc.get("content"): content_text = og_desc["content"]

                if content_text:
                    raw_title = html.unescape(str(content_text)).strip()
                    for suffix in ["| Facebook", "- Facebook", "| Meta", "- Meta"]:
                        if raw_title.endswith(suffix): raw_title = raw_title[:-len(suffix)].strip()
                    if raw_title and raw_title.lower() not in ["facebook", "share", "log in", "đăng nhập", "chú ý"]:
                        extracted_content = raw_title
                        break 

    except Exception as scrape_err:
        logger.warning(f"Scraping error for {initial_clean_url}: {scrape_err}")

    if not extracted_content or not extracted_content.strip() or extracted_content.lower() in ["facebook", "share", "log in", "đăng nhập"]:
        extracted_content = "Bài viết Facebook - Cần tương tác"

    return final_url, extracted_content


async def normalize_facebook_url(raw_url: str) -> str:
    url, _ = await normalize_facebook_url_and_scrape(raw_url)
    return url


async def add_custom_post(
    email_member: str,
    link_post: str,
    content: Optional[str] = None,
    fanpage_name: Optional[str] = None,
    media_urls: Optional[list] = None,
    cookie: Optional[str] = None,
    campaign_id: Optional[str] = None,
    campaign_name: Optional[str] = None,
    deadline: Optional[str] = None,
    target_comments: int = 32,
    assigned_team_ids: Optional[list] = None,
) -> dict:
    """Lưu link bài viết thủ công vào DB kèm dữ liệu bóc tách/gán mặc định.
    Googlebot bypass unshorten URL & cào title content (Fallback: Bài viết Facebook - Cần tương tác).
    Nếu bài viết đã tồn tại nhưng is_deleted = True -> Restore và UPDATE.
    Nếu bài viết đã tồn tại và is_deleted = False -> Báo lỗi HTTP 400 'Bài viết này đã tồn tại trong hệ thống!'.
    """
    supabase: Client = get_supabase_client()
    user_id = _get_member_id(email_member)

    if not user_id:
        raise Exception("Không tìm thấy thông tin user.")

    # 1. Unshorten, cào content Googlebot & làm sạch bạo lực URL
    clean_url, scraped_content = await normalize_facebook_url_and_scrape(link_post)

    # 2. Kiểm tra bài viết trùng lặp dựa trên clean_url
    existing_res = (
        supabase.table("internal_engagement_custom_posts")
        .select("*")
        .eq("link_post", clean_url)
        .execute()
    )

    if existing_res.data:
        existing_post = existing_res.data[0]
        # Nếu bài viết đã tồn tại và đang KHÔNG bị xóa -> Báo lỗi HTTP 400
        if not existing_post.get("is_deleted"):
            raise HTTPException(status_code=400, detail="Bài viết này đã tồn tại trong hệ thống!")

    meta = {}
    if not content or not fanpage_name or not media_urls:
        meta = fetch_facebook_post_metadata(clean_url, cookie=cookie)

    final_fanpage_name = fanpage_name or extract_fanpage_name_from_meta_or_url(clean_url, meta)
    auto_content = clean_facebook_content(meta, final_fanpage_name)
    final_content = content or auto_content or scraped_content or "Bài viết Facebook - Cần tương tác"
    final_media_urls = media_urls or ([meta["image"]] if meta.get("image") else [])

    now_iso = datetime.now(timezone.utc).isoformat()
    default_deadline = deadline or (datetime.now(timezone.utc) + timedelta(hours=18)).isoformat()

    # 2. Nếu bài viết đã tồn tại và ĐÃ BỊ XÓA (is_deleted = True) -> Restore và UPDATE
    if existing_res.data and existing_post.get("is_deleted"):
        update_payload = {
            "is_deleted": False,
            "deleted_at": None,
            "deleted_by": None,
            "fanpage_name": final_fanpage_name,
            "content": final_content,
            "media_urls": final_media_urls,
            "published_at": now_iso,
            "updated_at": now_iso,
            "updated_by": user_id,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "deadline": default_deadline,
            "target_comments": target_comments,
            "assigned_team_ids": assigned_team_ids or [],
        }
        res = (
            supabase.table("internal_engagement_custom_posts")
            .update(update_payload)
            .eq("id", existing_post["id"])
            .execute()
        )
        item = res.data[0] if res.data else existing_post
        item["platform"] = "facebook"
        return item

    # 3. Chưa từng có -> INSERT mới
    data = {
        "link_post": clean_url,
        "id_member": user_id,
        "fanpage_name": final_fanpage_name,
        "content": final_content,
        "media_urls": final_media_urls,
        "published_at": now_iso,
        "is_deleted": False,
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
        "deadline": default_deadline,
        "target_comments": target_comments,
        "assigned_team_ids": assigned_team_ids or [],
    }
    
    try:
        res = supabase.table("internal_engagement_custom_posts").insert(data).execute()
        item = res.data[0] if res.data else {}
        item["platform"] = "facebook"
        return item
    except Exception as err:
        logger.error(f"Lỗi khi insert full data vào internal_engagement_custom_posts: {err}")
        fallback_data = {
            "link_post": clean_url,
            "id_member": user_id,
            "is_deleted": False,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "deadline": default_deadline,
            "target_comments": target_comments,
            "assigned_team_ids": assigned_team_ids or [],
        }
        res = supabase.table("internal_engagement_custom_posts").insert(fallback_data).execute()
        item = res.data[0] if res.data else {}
        item["platform"] = "facebook"
        return item

def get_custom_posts_db(page: int = 1, page_size: int = 20) -> dict:
    """Lấy danh sách bài viết thủ công (chỉ lấy bài chưa bị xóa is_deleted = false), sắp xếp thời gian mới nhất giảm dần"""
    supabase: Client = get_supabase_client()
    start = (page - 1) * page_size
    end = start + page_size - 1
    
    res = (
        supabase.table("internal_engagement_custom_posts")
        .select("*")
        .eq("is_deleted", False)
        .order("created_at", desc=True)
        .range(start, end)
        .execute()
    )
    
    count_res = (
        supabase.table("internal_engagement_custom_posts")
        .select("id", count="exact")
        .eq("is_deleted", False)
        .execute()
    )
    total = count_res.count if count_res.count else 0
    
    return {"items": res.data or [], "total": total}


def update_custom_post_db(
    post_id: str,
    email_member: str,
    content: Optional[str] = None,
    fanpage_name: Optional[str] = None,
    media_urls: Optional[list] = None,
    campaign_id: Optional[str] = None,
    campaign_name: Optional[str] = None,
    deadline: Optional[str] = None,
    target_comments: Optional[int] = None,
    assigned_team_ids: Optional[list] = None,
) -> dict:
    """Cập nhật bài viết thủ công trong DB (nội dung, deadline, target KPI, chiến dịch)"""
    supabase: Client = get_supabase_client()
    user_id = _get_member_id(email_member) if email_member else None

    update_data: dict = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if content is not None:
        update_data["content"] = content
    if fanpage_name is not None:
        update_data["fanpage_name"] = fanpage_name
    if media_urls is not None:
        update_data["media_urls"] = media_urls
    if campaign_id is not None:
        update_data["campaign_id"] = campaign_id
    if campaign_name is not None:
        update_data["campaign_name"] = campaign_name
    if deadline is not None:
        update_data["deadline"] = deadline
    if target_comments is not None:
        update_data["target_comments"] = target_comments
    if assigned_team_ids is not None:
        update_data["assigned_team_ids"] = assigned_team_ids
    if user_id:
        update_data["updated_by"] = user_id

    res = supabase.table("internal_engagement_custom_posts").update(update_data).eq("id", post_id).execute()
    return res.data[0] if res.data else {}


def delete_custom_post_db(post_id: str, email_member: str) -> dict:
    """Xóa bài viết thủ công trong DB (Soft delete: is_deleted = true)"""
    supabase: Client = get_supabase_client()
    user_id = _get_member_id(email_member) if email_member else None

    delete_data: dict = {
        "is_deleted": True,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }
    if user_id:
        delete_data["deleted_by"] = user_id

    res = supabase.table("internal_engagement_custom_posts").update(delete_data).eq("id", post_id).execute()
    return res.data[0] if res.data else {}


def upsert_markee_override_db(
    markee_post_id: str,
    email_member: str,
    is_hidden: Optional[bool] = None,
    fanpage_name: Optional[str] = None,
    content: Optional[str] = None,
    media_urls: Optional[list] = None,
) -> dict:
    """Ghi đè thông tin bài viết Markee hoặc đặt is_hidden = true bằng upsert"""
    supabase: Client = get_supabase_client()
    user_id = _get_member_id(email_member) if email_member else None

    override_data: dict = {
        "markee_post_id": markee_post_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if is_hidden is not None:
        override_data["is_hidden"] = is_hidden
    if fanpage_name is not None:
        override_data["override_fanpage_name"] = fanpage_name
    if content is not None:
        override_data["override_content"] = content
    if media_urls is not None:
        override_data["override_media_urls"] = media_urls
    if user_id:
        override_data["updated_by"] = user_id

    res = (
        supabase.table("internal_engagement_markee_overrides")
        .upsert(override_data, on_conflict="markee_post_id")
        .execute()
    )
    return res.data[0] if res.data else {}


def get_markee_overrides_db(markee_post_ids: list[str]) -> dict[str, dict]:
    """Lấy danh sách bản ghi override của Markee posts"""
    if not markee_post_ids:
        return {}
    supabase: Client = get_supabase_client()
    res = (
        supabase.table("internal_engagement_markee_overrides")
        .select("*")
        .in_("markee_post_id", markee_post_ids)
        .execute()
    )
    return {str(row["markee_post_id"]): row for row in (res.data or [])}


def get_seeding_campaigns_db() -> list[dict]:
    """Lấy danh sách các chiến dịch Seeding"""
    supabase: Client = get_supabase_client()
    res = supabase.table("seeding_campaigns").select("*").order("created_at", desc=True).execute()
    return res.data or []


def create_seeding_campaign_db(payload: dict) -> dict:
    """Tạo mới một chiến dịch Seeding"""
    supabase: Client = get_supabase_client()
    created_by_id = _get_member_id(payload.get("created_by_email")) if payload.get("created_by_email") else None

    data = {
        "name": payload["name"],
        "description": payload.get("description"),
        "color_code": payload.get("color_code", "#fff1f2"),
        "start_date": payload.get("start_date") or datetime.now(timezone.utc).isoformat(),
        "end_date": payload.get("end_date"),
    }
    if created_by_id:
        data["created_by"] = created_by_id

    res = supabase.table("seeding_campaigns").insert(data).execute()
    return res.data[0] if res.data else {}


def delete_seeding_campaign_db(campaign_id: str) -> dict:
    """Xóa chiến dịch Seeding từ bảng seeding_campaigns"""
    supabase: Client = get_supabase_client()
    res = supabase.table("seeding_campaigns").delete().eq("id", campaign_id).execute()
    return {"deleted": True, "id": campaign_id}


def get_seeder_leaderboard_db() -> list[dict]:
    """Lấy bảng xếp hạng Seeder nổi bật từ View v_seeder_leaderboard"""
    supabase: Client = get_supabase_client()
    try:
        res = supabase.table("v_seeder_leaderboard").select("*").execute()
        if res.data:
            return res.data
    except Exception as err:
        logger.warning(f"Không thể query v_seeder_leaderboard view: {err}")

    # Fallback nếu view chưa sẵn sàng
    members_res = supabase.table("members").select("id, display_name, email, team").execute()
    teams_res = supabase.table("teams").select("id, name_team").execute()
    teams_map = {str(t["id"]): t["name_team"] for t in (teams_res.data or [])}

    kpi_res = supabase.table("internal_engagement_kpi").select("id_member, link_post, status, is_ontime").execute()
    kpi_by_member = defaultdict(list)
    for k in (kpi_res.data or []):
        kpi_by_member[k["id_member"]].append(k)

    leaderboard = []
    for m in (members_res.data or []):
        m_id = m["id"]
        rows = kpi_by_member.get(m_id, [])
        assigned_links = set(r["link_post"] for r in rows)
        total_assigned = len(assigned_links)
        completed_links = set(r["link_post"] for r in rows if r.get("status") == "success")
        total_completed = len(completed_links)
        ontime_links = set(r["link_post"] for r in rows if r.get("status") == "success" and r.get("is_ontime", True))
        total_ontime = len(ontime_links)

        rate = round((total_completed / total_assigned * 100), 1) if total_assigned > 0 else 0.0
        score = round((total_completed * 3) + (total_ontime * 2) + (rate * 0.4))

        team_name = teams_map.get(str(m.get("team")), m.get("team") or "Chưa phân team")
        leaderboard.append({
            "user_id": m_id,
            "member_name": m.get("display_name") or m.get("email"),
            "member_email": m.get("email"),
            "team_name": team_name,
            "total_assigned": total_assigned,
            "total_completed": total_completed,
            "total_ontime": total_ontime,
            "completion_rate": rate,
            "score": score,
        })

    leaderboard.sort(key=lambda x: (x["score"], x["completion_rate"]), reverse=True)
    return leaderboard