"""KPI reward rule endpoints."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query

from app.modules.all_platform.auth_deps import get_current_user
from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.schemas.kpi_reward import (
    KpiRewardReviewRequest,
    KpiRewardRulesSaveRequest,
    KpiRewardSubmitRequest,
)
from app.modules.all_platform.services.supabase_kpi_reward_service import (
    get_effective_reward_rules,
    get_reward_summary,
    list_reward_rule_logs,
    list_reward_rules,
    review_reward_rules,
    save_reward_rules,
    submit_reward_rules,
)

router = APIRouter()


def _handle_error(exc: Exception) -> BaseResponse:
    if isinstance(exc, PermissionError):
        return BaseResponse(success=False, message=str(exc))
    return BaseResponse(success=False, message=str(exc))


@router.get("/rules")
def kpi_reward_rules_list(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    team_id: str | None = Query(None),
    status: str | None = Query(None),
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = list_reward_rules(
            user=user,
            start_date=start_date,
            end_date=end_date,
            team_id=team_id,
            status=status,
        )
        return BaseResponse(success=True, data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.get("/rules/effective")
def kpi_reward_rules_effective(
    team_id: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = get_effective_reward_rules(
            user=user,
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )
        return BaseResponse(success=True, data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.post("/rules/save-draft")
def kpi_reward_rules_save_draft(
    payload: KpiRewardRulesSaveRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = save_reward_rules(payload=payload.model_dump(), user=user, status="draft")
        return BaseResponse(success=True, message="Da luu nhap rule KPI thuong", data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.post("/rules/save-active")
def kpi_reward_rules_save_active(
    payload: KpiRewardRulesSaveRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = save_reward_rules(payload=payload.model_dump(), user=user, status="approved")
        return BaseResponse(success=True, message="Da luu rule KPI thuong dang dung", data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.post("/rules/submit")
def kpi_reward_rules_submit(
    payload: KpiRewardSubmitRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = submit_reward_rules(payload=payload.model_dump(), user=user)
        return BaseResponse(success=True, message="Da gui admin duyet KPI thuong", data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.post("/rules/approve")
def kpi_reward_rules_approve(
    payload: KpiRewardReviewRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = review_reward_rules(payload=payload.model_dump(), user=user, status="approved")
        return BaseResponse(success=True, message="Da duyet KPI thuong", data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.post("/rules/reject")
def kpi_reward_rules_reject(
    payload: KpiRewardReviewRequest,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = review_reward_rules(payload=payload.model_dump(), user=user, status="rejected")
        return BaseResponse(success=True, message="Da tra lai KPI thuong", data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.get("/rules/logs")
def kpi_reward_rules_logs(
    team_id: str = Query(...),
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = list_reward_rule_logs(
            user=user,
            team_id=team_id,
            start_date=start_date,
            end_date=end_date,
        )
        return BaseResponse(success=True, data=data)
    except Exception as exc:
        return _handle_error(exc)


@router.get("/summary")
def kpi_reward_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    team_id: str | None = Query(None),
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        data = get_reward_summary(user=user, start_date=start_date, end_date=end_date, team_id=team_id)
        return BaseResponse(success=True, data=data)
    except Exception as exc:
        return _handle_error(exc)
