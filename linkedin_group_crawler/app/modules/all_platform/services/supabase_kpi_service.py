"""Supabase-based KPI service for all-platform module."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from loguru import logger
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
        
    kpi_query = kpi_query.order("start_date", desc=False)
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

        # Set Posts to 0 as requested
        post_current = 0

        # Zalo inbox: số tin nhắn khách gửi tới trong tuần KPI.
        # Nếu member không claim Zalo account nào thì current = 0 (không lỗi).
        try:
            inbox_progress = compute_kpi_inbox_progress([mid], start_date, end_date)
            inbox_current = int(inbox_progress.get(mid, {}).get("kpi_inbox_current", 0))
            lead_current = int(inbox_progress.get(mid, {}).get("kpi_lead_current", 0))
        except Exception as exc:
            logger.warning(f"compute_kpi_inbox_progress failed for member={mid}: {exc}")
            inbox_current = 0
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
                "kpi_inbox": active_kpi.get("kpi_inbox", 0),
                "kpi_inbox_current": inbox_current,
                "kpi_inbox_range": {
                    "start": start_date,
                    "end": end_date,
                },
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
        .order("start_date", desc=True)
        .execute()
    )

    if result.data:
        kpi = result.data[0]
        # Fetch leader email for compatibility
        leader_res = supabase.table("app_users").select("email").eq("id", kpi.get("id_leader")).execute()
        leader_email = leader_res.data[0]["email"] if leader_res.data else None

        # Tính kpi_inbox_current trong khoảng KPI hiện tại
        kpi_inbox_target = int(kpi.get("kpi_inbox") or 0)
        kpi_inbox_current = 0
        if kpi_inbox_target > 0:
            try:
                progress = compute_kpi_inbox_progress(
                    [str(user_id)],
                    kpi.get("start_date"),
                    kpi.get("end_date"),
                )
                kpi_inbox_current = int(progress.get(str(user_id), {}).get("kpi_inbox_current", 0))
            except Exception as exc:
                logger.warning(f"compute_kpi_inbox_progress failed for email={email}: {exc}")

        return {
            "email": email,
            "name": user.get("name"),
            "role": user.get("role", "member"),
            "profile_slug": user.get("slug"),
            "email_leader": leader_email,
            "kpi": [kpi],
            "kpi_inbox_current": kpi_inbox_current,
            "kpi_inbox_target": kpi_inbox_target,
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


# ─────────────────────────────────────────────────────────────────────────────
# Zalo inbox KPI
# ─────────────────────────────────────────────────────────────────────────────
#
# "Tin nhắn KPI" = số tin nhắn KHÁCH gửi tới (is_sent = false) trong khoảng
# start_date -> end_date trên tất cả Zalo account thuộc sở hữu của member.
#
# Quy ước schema:
#   - zalo_accounts.owner_id      -> app_users.id (member)
#   - zalo_messages.user_id       -> zalo_accounts.account_id
#   - zalo_messages.is_sent=false -> tin nhắn nhận từ khách
#
# Hàm này trả về số liệu actual để hiển thị progress bar; nó KHÔNG ghi vào
# kpi_tracker (giữ bảng này immutable cho target do leader giao).
# ─────────────────────────────────────────────────────────────────────────────


def _parse_iso_date(value: Optional[str]) -> Optional[date]:
    """Parse YYYY-MM-DD[ T...] -> date. Trả None nếu không phân tích được."""
    if not value:
        return None
    raw = str(value).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw[: len(fmt) + 30] if "%z" in fmt else raw, fmt).date()
        except ValueError:
            continue
    # Fallback: lấy 10 ký tự đầu
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _member_zalo_account_ids(supabase: Client, member_user_id: str) -> List[str]:
    """Lấy danh sách zalo_accounts.account_id thuộc sở hữu của 1 member.

    Trả [] nếu member chưa từng claim Zalo account nào.
    """
    if not member_user_id:
        return []
    res = (
        supabase.table("zalo_accounts")
        .select("account_id")
        .eq("owner_id", member_user_id)
        .execute()
    )
    return [str(row["account_id"]) for row in (res.data or []) if row.get("account_id")]


def compute_kpi_inbox_progress(
    member_user_ids: Iterable[str],
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    """Tính kpi_inbox_current cho từng member.

    Đếm số conversation mà member đã tick share VÀ leader đã verify, có
    ``updated_at`` nằm trong khoảng [start_date, end_date] (theo kpi_tracker).

    Chỉ các row thoả mãn **đồng thời** mới được tính:
        - id_member = member_id
        - shared_role = 'leader'
        - is_active = true
        - verified_at IS NOT NULL (leader đã xác minh)
        - updated_at trong [start_dt, end_dt]

    Args:
        member_user_ids: danh sách app_users.id cần tính.
        start_date: ISO date (YYYY-MM-DD). Mặc định = Monday tuần hiện tại.
        end_date:   ISO date. Mặc định = Sunday tuần hiện tại.

    Returns:
        Dict map ``member_user_id -> {kpi_inbox_current, account_ids, range: {start, end}}``.
        Member nào không có share verified trong khoảng → current = 0.
    """
    supabase: Client = get_supabase_client()

    # Chuẩn hoá khoảng thời gian
    if start_date is None or end_date is None:
        today = date.today()
        monday = today - timedelta(days=today.weekday())
        sunday = monday + timedelta(days=6)
        start_date = start_date or monday.isoformat()
        end_date = end_date or sunday.isoformat()

    start_iso = _parse_iso_date(start_date) or date.today()
    end_iso = _parse_iso_date(end_date) or date.today()

    # Tạo timezone Vietnam (+07:00) để đảm bảo so sánh thời gian trùng khớp với mốc ngày của user
    vn_tz = timezone(timedelta(hours=7))

    # Mở rộng end_date lên cuối ngày (VN) cho so sánh updated_at/created_at, sau đó chuyển sang UTC để so sánh chuỗi ISO
    end_dt = datetime.combine(end_iso, datetime.max.time(), tzinfo=vn_tz).astimezone(timezone.utc).isoformat()
    start_dt = datetime.combine(start_iso, datetime.min.time(), tzinfo=vn_tz).astimezone(timezone.utc).isoformat()

    out: Dict[str, Dict[str, Any]] = {}
    for mid in member_user_ids:
        # Đếm số conversation đã verify của member này trong khoảng
        # (không phụ thuộc vào zalo_accounts.account_id; chỉ cần member có share là đủ)
        try:
            res = (
                supabase.table("zalo_conversation_permissions")
                .select("id, created_at, updated_at, verified_at, is_lead")
                .eq("id_member", mid)
                .eq("shared_role", "leader")
                .eq("is_active", True)
                .eq("is_verify", True)
                .not_.is_("verified_at", "null")
                .execute()
            )
            current = 0
            lead_current = 0
            for r in res.data or []:
                c_at = r.get("created_at") or ""
                u_at = r.get("updated_at") or ""
                v_at = r.get("verified_at") or ""
                if (
                    (c_at >= start_dt and c_at <= end_dt) or 
                    (u_at >= start_dt and u_at <= end_dt) or
                    (v_at >= start_dt and v_at <= end_dt)
                ):
                    current += 1
                    if r.get("is_lead"):
                        lead_current += 1
        except Exception as exc:
            logger.warning(f"compute_kpi_inbox_progress failed for member={mid}: {exc}")
            current = 0
            lead_current = 0

        account_ids = _member_zalo_account_ids(supabase, mid)
        out[mid] = {
            "kpi_inbox_current": current,
            "kpi_lead_current": lead_current,
            "account_ids": account_ids,
            "range": {"start": start_date, "end": end_date},
        }

    return out


def get_kpi_inbox_progress_by_email(
    email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """API thuận tiện: truyền email -> trả về kpi_inbox_current cho 1 member.

    Trả về dict rỗng nếu email không tồn tại.
    """
    supabase: Client = get_supabase_client()
    res = supabase.table("app_users").select("id").eq("email", email).limit(1).execute()
    if not res.data:
        return {}
    member_id = str(res.data[0]["id"])
    progress = compute_kpi_inbox_progress([member_id], start_date, end_date)
    return progress.get(member_id, {"kpi_inbox_current": 0, "account_ids": [], "range": {}})
