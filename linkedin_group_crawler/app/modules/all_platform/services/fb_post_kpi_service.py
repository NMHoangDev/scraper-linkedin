"""FB Post KPI service.

Xử lý KPI bài viết Facebook tự động.
Khi extension đăng bài FB thành công, service gọi API để lưu KPI.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from loguru import logger
from supabase import Client

from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.services.fb_inbox_account_service import resolve_id_member


def save_fb_post_kpi(
    job_id: str,
    user_id: str,
    post_url: Optional[str] = None,
    content: Optional[str] = None,
    target_type: str = "profile",
    target_id: Optional[str] = None,
    platform: str = "facebook",
    posted_at: Optional[str] = None,
) -> Dict[str, Any]:
    """Lưu KPI bài viết Facebook.

    Args:
        job_id: Job ID từ seeder service
        user_id: Seeder service user_id (VD: "fb_10001")
        post_url: URL bài viết đã đăng
        content: Nội dung bài viết (preview)
        target_type: 'profile' | 'group' | 'page'
        target_id: Group/Page ID nếu có
        platform: Platform (mặc định facebook)
        posted_at: Thời gian đăng bài (ISO format)

    Returns:
        Dict với thông tin đã lưu
    """
    supabase: Client = get_supabase_client()

    # 1. Resolve id_member từ user_id qua bảng fb_inbox_accounts
    id_member = resolve_id_member(user_id)

    if not id_member:
        raise ValueError(
            f"Không tìm thấy member cho user_id [{user_id}]. "
            f"Hãy đảm bảo FB account đã được thêm vào app "
            f"(vào app -> Quản lý tài khoản -> Thêm FB Inbox Account)."
        )

    # 2. Resolve id_leader từ id_member qua teams
    id_leader = _resolve_id_leader(supabase, id_member)

    if not id_leader:
        logger.warning(f"Không tìm thấy leader cho member {id_member}, dùng member làm leader")
        id_leader = id_member

    # 3. Parse posted_at
    if posted_at:
        try:
            posted_at_dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
        except ValueError:
            posted_at_dt = datetime.now(timezone.utc)
    else:
        posted_at_dt = datetime.now(timezone.utc)

    posted_at_iso = posted_at_dt.isoformat()

    # 4. Upsert vào fb_post_kpi
    insert_data = {
        "id_member": id_member,
        "id_leader": id_leader,
        "user_id": user_id,
        "job_id": job_id,
        "post_url": post_url,
        "content": content[:500] if content else None,  # Giới hạn 500 ký tự
        "target_type": target_type,
        "target_id": target_id,
        "platform": platform,
        "posted_at": posted_at_iso,
    }

    # Check xem job_id đã tồn tại chưa (tránh duplicate)
    existing = (
        supabase.table("fb_post_kpi")
        .select("id, post_url")
        .eq("job_id", job_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        # Update nếu đã tồn tại
        result = (
            supabase.table("fb_post_kpi")
            .update(insert_data)
            .eq("job_id", job_id)
            .execute()
        )
        logger.info(f"🔄 Updated fb_post_kpi: job_id={job_id}, id_member={id_member}")
    else:
        # Insert mới
        result = (
            supabase.table("fb_post_kpi")
            .insert(insert_data)
            .execute()
        )
        logger.info(f"✅ Saved fb_post_kpi: job_id={job_id}, id_member={id_member}, id_leader={id_leader}")

    return {
        "id": result.data[0]["id"] if result.data else None,
        "id_member": id_member,
        "id_leader": id_leader,
        "job_id": job_id,
        "post_url": post_url,
        "posted_at": posted_at_iso,
        "message": "Saved successfully" if result.data else "Job already exists",
    }


def _resolve_id_leader(supabase: Client, id_member: str) -> Optional[str]:
    """Resolve id_leader từ id_member qua bảng teams.

    Args:
        id_member: app_users.id của member

    Returns:
        id_leader hoặc None
    """
    # Cách 1: Qua member_of_teams
    member_teams_res = (
        supabase.table("member_of_teams")
        .select("id_teams")
        .eq("id_member", id_member)
        .limit(1)
        .execute()
    )

    if member_teams_res.data:
        id_team = member_teams_res.data[0].get("id_teams")
        if id_team:
            team_res = (
                supabase.table("teams")
                .select("id_leader")
                .eq("id", id_team)
                .limit(1)
                .execute()
            )
            if team_res.data:
                return team_res.data[0].get("id_leader")

    # Cách 2: Qua team_associations (cấu trúc mới)
    team_assoc_res = (
        supabase.table("team_associations")
        .select("leader_id")
        .eq("member_id", id_member)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )

    if team_assoc_res.data:
        return team_assoc_res.data[0].get("leader_id")

    return None


def get_fb_post_kpi_summary(
    member_email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """Lấy tổng hợp KPI bài viết FB cho 1 member.

    Args:
        member_email: Email của member
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)

    Returns:
        Dict với tổng hợp KPI
    """
    supabase: Client = get_supabase_client()

    # Resolve member_email -> id_member
    member_res = (
        supabase.table("app_users")
        .select("id, email")
        .eq("email", member_email)
        .limit(1)
        .execute()
    )

    if not member_res.data:
        return {
            "post_count": 0,
            "profile_count": 0,
            "group_count": 0,
            "page_count": 0,
            "posts": [],
            "range": {"start": start_date or "", "end": end_date or ""},
        }

    id_member = member_res.data[0]["id"]

    # Default date range: tuần hiện tại
    if not start_date or not end_date:
        today_d = date.today()
        monday = today_d - timedelta(days=today_d.weekday())
        sunday = monday + timedelta(days=6)
        start_date = start_date or monday.isoformat()
        end_date = end_date or sunday.isoformat()

    # Query fb_post_kpi
    query = (
        supabase.table("fb_post_kpi")
        .select("*")
        .eq("id_member", id_member)
        .gte("posted_at", start_date)
        .lte("posted_at", end_date + "T23:59:59")
        .order("posted_at", desc=True)
    )

    rows = query.execute().data or []

    # Count theo target_type
    profile_count = sum(1 for r in rows if r.get("target_type") == "profile")
    group_count = sum(1 for r in rows if r.get("target_type") == "group")
    page_count = sum(1 for r in rows if r.get("target_type") == "page")

    # Format posts
    posts = [
        {
            "id": r.get("id"),
            "job_id": r.get("job_id"),
            "post_url": r.get("post_url"),
            "content": r.get("content"),
            "target_type": r.get("target_type"),
            "target_id": r.get("target_id"),
            "posted_at": r.get("posted_at"),
        }
        for r in rows
    ]

    return {
        "post_count": len(rows),
        "profile_count": profile_count,
        "group_count": group_count,
        "page_count": page_count,
        "posts": posts,
        "range": {"start": start_date, "end": end_date},
    }


def get_fb_post_kpi_list(
    member_email: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = 100,
) -> Dict[str, Any]:
    """Lấy danh sách bài viết KPI FB cho 1 member.

    Args:
        member_email: Email của member
        start_date: Ngày bắt đầu (YYYY-MM-DD)
        end_date: Ngày kết thúc (YYYY-MM-DD)
        target_type: Lọc theo loại ('profile', 'group', 'page')
        limit: Số lượng tối đa

    Returns:
        Dict với danh sách bài viết
    """
    supabase: Client = get_supabase_client()

    # Resolve member_email -> id_member
    member_res = (
        supabase.table("app_users")
        .select("id")
        .eq("email", member_email)
        .limit(1)
        .execute()
    )

    if not member_res.data:
        return {"posts": [], "total": 0, "kpi_target": 0, "range": {}}

    id_member = member_res.data[0]["id"]

    # Fetch active kpi target
    kpi_target = 0
    try:
        kpi_res = (
            supabase.table("kpi_tracker")
            .select("kpi_post")
            .eq("id_member", id_member)
            .eq("status", "active")
            .limit(1)
            .execute()
        )
        if kpi_res.data:
            kpi_target = kpi_res.data[0].get("kpi_post", 0) or 0
    except Exception as e:
        logger.warning(f"Error fetching kpi_post target: {e}")

    # Default date range: tuần hiện tại
    if not start_date or not end_date:
        today_d = date.today()
        monday = today_d - timedelta(days=today_d.weekday())
        sunday = monday + timedelta(days=6)
        start_date = start_date or monday.isoformat()
        end_date = end_date or sunday.isoformat()

    # Query fb_post_kpi
    query = (
        supabase.table("fb_post_kpi")
        .select("*")
        .eq("id_member", id_member)
        .gte("posted_at", start_date)
        .lte("posted_at", end_date + "T23:59:59")
        .order("posted_at", desc=True)
        .limit(limit)
    )

    if target_type:
        query = query.eq("target_type", target_type)

    rows = query.execute().data or []

    # Format posts
    posts = [
        {
            "id": r.get("id"),
            "job_id": r.get("job_id"),
            "user_id": r.get("user_id"),
            "post_url": r.get("post_url"),
            "content": r.get("content"),
            "target_type": r.get("target_type"),
            "target_id": r.get("target_id"),
            "posted_at": r.get("posted_at"),
        }
        for r in rows
    ]

    return {
        "posts": posts,
        "total": len(posts),
        "kpi_target": kpi_target,
        "range": {"start": start_date, "end": end_date},
    }
