"""Scheduled comments API router — CRUD + AI preview."""

from __future__ import annotations

from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional

from app.modules.all_platform.schemas.common import BaseResponse
from app.modules.all_platform.schemas.scheduled_comments import (
    CreateScheduledCommentRequest,
    UpdateScheduledCommentRequest,
    AiPreviewRequest,
)
from app.modules.all_platform.services.scheduled_comment_service import (
    create_scheduled_comment,
    get_scheduled_comments,
    update_scheduled_comment,
    cancel_scheduled_comment,
    process_comment,
)
from app.modules.all_platform.services.auth_service import decode_token

router = APIRouter()


def _get_email(request: Request, authorization: Optional[str] = Header(None)) -> str:
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        token = request.cookies.get("crawlpro_access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    payload = decode_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]


@router.post("/")
def create(request: Request, payload: CreateScheduledCommentRequest, authorization: Optional[str] = Header(None)) -> BaseResponse:
    try:
        email = _get_email(request, authorization)
        data = create_scheduled_comment(payload.model_dump(exclude_none=True), email)
        return BaseResponse(success=True, message="Scheduled comment created", data=data)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=f"Unexpected error: {e}")


@router.get("/")
def list_comments(
    request: Request,
    authorization: Optional[str] = Header(None),
    status: Optional[str] = None,
    platform: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> BaseResponse:
    try:
        email = _get_email(request, authorization)
        data = get_scheduled_comments(email, {
            "status": status,
            "platform": platform,
            "page": page,
            "limit": limit,
        })
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/{comment_id}")
def update(
    comment_id: str,
    payload: UpdateScheduledCommentRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
) -> BaseResponse:
    try:
        email = _get_email(request, authorization)
        data = update_scheduled_comment(comment_id, payload.model_dump(exclude_none=True), email)
        return BaseResponse(success=True, message="Updated", data=data)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=f"Unexpected error: {e}")


@router.delete("/{comment_id}")
def cancel(
    comment_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
) -> BaseResponse:
    try:
        email = _get_email(request, authorization)
        data = cancel_scheduled_comment(comment_id, email)
        return BaseResponse(success=True, message="Cancelled", data=data)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=f"Unexpected error: {e}")


@router.post("/{comment_id}/execute-now")
async def execute_now(
    comment_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
) -> BaseResponse:
    try:
        email = _get_email(request, authorization)
        from app.core.supabase_client import get_supabase_client
        supabase = get_supabase_client()
        from app.modules.all_platform.services.scheduled_comment_service import _get_member_id
        member_id = _get_member_id(email)
        if not member_id:
            return BaseResponse(success=False, message="Member not found")

        res = (
            supabase.table("scheduled_comments")
            .select("*")
            .eq("id", comment_id)
            .eq("id_member", member_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return BaseResponse(success=False, message="Scheduled comment not found")
        record = res.data[0]
        if record["status"] not in ("pending", "failed"):
            return BaseResponse(success=False, message=f"Cannot execute comment with status '{record['status']}'")

        await process_comment(record)
        return BaseResponse(success=True, message="Comment executed")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/ai-preview")
async def ai_preview(payload: AiPreviewRequest) -> BaseResponse:
    try:
        from app.modules.all_platform.services.ai_comment_service import generate_comment
        content = await generate_comment(payload.post_content)
        return BaseResponse(success=True, data={"comment": content})
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
