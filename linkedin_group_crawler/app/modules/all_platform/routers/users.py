"""Users & Teams endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from app.modules.all_platform.auth_deps import get_current_user, require_admin
from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.services import (
    get_user,
    upsert_user,
    admin_create_user,
    update_user_slug,
    update_user_role,
    update_user_active_status,
    get_team_members,
    add_team_member,
    get_all_users,
    get_users_by_role,
    get_all_teams,
    get_all_teams_with_kpi,
    create_team,
    update_team,
    delete_team,
)

router = APIRouter()


@router.get("/me")
def users_get_me(email: str = Query(...), user: dict = Depends(get_current_user)) -> BaseResponse:
    """Get current user profile."""
    try:
        data = get_user(email)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/update-slug")
def users_update_slug(payload: dict) -> BaseResponse:
    """Update user's profile slug."""
    try:
        email = payload.get("email")
        slug = payload.get("slug")
        if not email or not slug:
            return BaseResponse(success=False, message="email and slug are required")
        data = update_user_slug(email, slug)
        return BaseResponse(success=True, message="Slug updated", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/update-role")
def users_update_role(payload: dict, _admin: dict = Depends(require_admin)) -> BaseResponse:
    """Update user's role. CHỈ admin — endpoint này trước đây không có auth gì cả,
    bất kỳ ai (kể cả member) cũng tự đổi role mình thành admin được."""
    try:
        email = payload.get("email")
        role = payload.get("role")
        if not email or not role:
            return BaseResponse(success=False, message="email and role are required")
        data = update_user_role(email, role)
        return BaseResponse(success=True, message="Role updated", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/set-active")
def users_set_active(payload: dict, _admin: dict = Depends(require_admin)) -> BaseResponse:
    """Admin-only: kích hoạt/vô hiệu hóa 1 tài khoản (khoá đăng nhập ngay,
    is_active được check lại mỗi request qua get_current_user)."""
    try:
        email = payload.get("email")
        is_active = payload.get("is_active")
        if not email or is_active is None:
            return BaseResponse(success=False, message="email and is_active are required")
        data = update_user_active_status(email, bool(is_active))
        return BaseResponse(success=True, message="Đã cập nhật trạng thái", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/create")
def users_create(payload: dict, _admin: dict = Depends(require_admin)) -> BaseResponse:
    """Admin-only: provision a new login account (app_users row) for someone,
    so they can then sign in with Google using that email. Does not set a
    usable password — Google Sign-In is the only intended login path for
    accounts created this way."""
    try:
        email = payload.get("email")
        role = payload.get("role") or "member"
        name = payload.get("name")
        if not email:
            return BaseResponse(success=False, message="email is required")
        data = admin_create_user(email=email, name=name, role=role)
        return BaseResponse(success=True, message="Đã tạo tài khoản", data=data)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/all-profiles")
def users_get_all(user: dict = Depends(get_current_user)) -> BaseResponse:
    """Get all user profiles."""
    try:
        data = get_all_users()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/by-role")
def users_get_by_role(role: str = Query(...), user: dict = Depends(get_current_user)) -> BaseResponse:
    """Get users filtered by role."""
    try:
        data = get_users_by_role(role)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# ── Teams ──────────────────────────────────────────────────────────────────────

teams_router = APIRouter()


@teams_router.get("/members")
def teams_get_members(leader_id: str = Query(...)) -> BaseResponse:
    """Get all members of a leader's team (by leader id)."""
    try:
        data = get_team_members(leader_id)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.post("/add-member")
def teams_add_member(payload: dict) -> BaseResponse:
    """Add a member to a leader's team (by ids)."""
    try:
        leader_id = payload.get("leader_id")
        member_id = payload.get("member_id")
        if not leader_id or not member_id:
            return BaseResponse(success=False, message="leader_id and member_id are required")
        data = add_team_member(leader_id, member_id)
        return BaseResponse(success=True, message="Member added to team", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.get("")
def teams_get_all() -> BaseResponse:
    """Get all teams."""
    try:
        data = get_all_teams()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.get("/with-kpi")
def teams_get_with_kpi(
    start_date: str | None = Query(None, description="ISO date YYYY-MM-DD (VN). Mặc định = tuần hiện tại."),
    end_date:   str | None = Query(None, description="ISO date YYYY-MM-DD (VN). Mặc định = CN tuần hiện tại."),
) -> BaseResponse:
    """Phase 5: All-in-one teams + KPI cho admin teams-management page.

    Thay thế 1 + N HTTP request song song:
      • `/teams` (1 endpoint, có cache 60s)
      • N × `/kpi/get-team-overview-v3` (N = số team)

    bằng 1 RPC duy nhất `get_admin_teams_kpi_overview` →
    1 round-trip Postgres, aggregate hoàn toàn server-side.
    Cache 30s (khoảng ngày thay đổi chậm trong phiên admin).

    Schema response:
      {
        "teams":    [{id, name_team, leader_email, members, number_of_member}, ...],
        "kpi_data": [{team_id, member_id, member_email, kpi_*, post/inbox/lead actual}, ...],
        "range":    {start, end}
      }
    """
    try:
        data = get_all_teams_with_kpi(start_date=start_date, end_date=end_date)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.post("")
def teams_create(payload: dict) -> BaseResponse:
    """Create a new team. Accepts leader_id (UUID) or leader_email."""
    try:
        name_team = payload.get("name_team", "").strip()
        # Accept either leader_id (UUID) or leader_email from UI
        leader_identifier = (payload.get("leader_id") or payload.get("leader_email") or "").strip()
        member_ids: List[str] = payload.get("member_ids", [])
        member_emails: List[str] = payload.get("member_emails", [])
        # Merge both — members can be IDs or emails
        all_members: List[str] = list(set((member_ids or []) + (member_emails or [])))
        if not name_team or not leader_identifier:
            return BaseResponse(success=False, message="name_team và leader là bắt buộc")
        data = create_team(name_team, leader_identifier, all_members)
        return BaseResponse(success=True, message="Đã tạo team", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.put("")
def teams_update(payload: dict) -> BaseResponse:
    """Update a team (replace members, optionally rename). Accepts leader_id (UUID) or leader_email.

    team_id (optional): khi UI biet ro id cua team dang sua, gui kem de tim theo id thay vi
    theo name_team - cho phep doi ten team ma khong bi hieu nham thanh "tao team moi".
    """
    try:
        name_team = payload.get("name_team", "").strip()
        team_id = (payload.get("team_id") or "").strip() or None
        leader_identifier = (payload.get("leader_id") or payload.get("leader_email") or "").strip()
        member_ids: List[str] = payload.get("member_ids", [])
        member_emails: List[str] = payload.get("member_emails", [])
        all_members: List[str] = list(set((member_ids or []) + (member_emails or [])))
        if not name_team or not leader_identifier:
            return BaseResponse(success=False, message="name_team và leader là bắt buộc")
        data = update_team(name_team, leader_identifier, all_members, team_id=team_id)
        return BaseResponse(success=True, message="Đã cập nhật team", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@teams_router.delete("")
def teams_delete(name_team: str = Query(...), leader: str = Query(...)) -> BaseResponse:
    """Delete a team by name_team + leader (UUID or email)."""
    try:
        deleted = delete_team(name_team, leader)
        return BaseResponse(success=True, message=f"Đã xóa {deleted} bản ghi team", data={"deleted": deleted})
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

