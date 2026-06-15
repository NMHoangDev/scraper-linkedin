"""KPI endpoints — platform-agnostic."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.modules.all_platform.schemas import (
    AssignKpiRequest,
    GetKpiByEmailRequest,
    GetAllKpiRequest,
    CheckPermissionRequest,
    VerifyLeaderCodeRequest,
    UpdateRoleToMemberRequest,
    SyncProgressRequest,
    BaseResponse,
)
from app.modules.all_platform.services import (
    assign_kpi,
    get_all_kpis_for_leader,
    get_kpi_by_email,
    get_kpi_inbox_progress_by_email,
    sync_kpi_progress,
    check_permission,
    verify_leader_code,
    update_user_role_to_member,
)

router = APIRouter()


@router.post("/assign")
def kpi_assign(payload: AssignKpiRequest) -> BaseResponse:
    """Leader assigns KPI to a member."""
    try:
        data = assign_kpi(payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="KPI assigned", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/get-all")
def kpi_get_all(payload: GetAllKpiRequest) -> BaseResponse:
    """Leader gets all KPIs for their team members."""
    try:
        data = get_all_kpis_for_leader(payload.leader_email, payload.id_team)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/get-by-email")
def kpi_get_by_email(payload: GetKpiByEmailRequest) -> BaseResponse:
    """Get KPI for a specific member."""
    try:
        data = get_kpi_by_email(payload.email)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/sync-all")
def kpi_sync_all(payload: SyncProgressRequest) -> BaseResponse:
    """Sync engagement progress from posts."""
    try:
        data = sync_kpi_progress(payload.email, payload.posts)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# ── Zalo inbox KPI ───────────────────────────────────────────────────────────


class ZaloInboxProgressRequest(BaseModel):
    email: str = Field(..., min_length=3, description="Email member (app_users.email)")
    start_date: str = Field("", description="YYYY-MM-DD, mặc định = Monday tuần hiện tại")
    end_date: str = Field("", description="YYYY-MM-DD, mặc định = Sunday tuần hiện tại")


@router.post("/zalo-inbox-progress")
def zalo_inbox_progress(payload: ZaloInboxProgressRequest) -> BaseResponse:
    """Tính số tin nhắn Zalo khách gửi tới member trong khoảng [start_date, end_date].

    Phục vụ progress bar "Tin nhắn KPI" — chỉ đếm ``is_sent=false`` trên
    tất cả Zalo accounts mà member này đang sở hữu.
    """
    try:
        start = payload.start_date.strip() or None
        end = payload.end_date.strip() or None
        data = get_kpi_inbox_progress_by_email(
            payload.email.strip().lower(),
            start,
            end,
        )
        return BaseResponse(success=True, data=data or {
            "kpi_inbox_current": 0,
            "account_ids": [],
            "range": {"start": start or "", "end": end or ""},
        })
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/check-permission")
def auth_check_permission(payload: CheckPermissionRequest) -> BaseResponse:
    """Check if user is leader or member."""
    try:
        data = check_permission(payload.email)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/auth/verify-leader-code")
def auth_verify_leader_code(payload: VerifyLeaderCodeRequest) -> BaseResponse:
    """Verify leader authorization code."""
    try:
        data = verify_leader_code(payload.code)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/auth/update-role-to-member")
def auth_update_role(payload: UpdateRoleToMemberRequest) -> BaseResponse:
    """Update user role to member."""
    try:
        data = update_user_role_to_member(payload.email)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
