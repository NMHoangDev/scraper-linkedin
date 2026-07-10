"""Quick Comment template library endpoints — platform-agnostic."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.modules.all_platform.schemas import (
    QuickCommentAddRequest,
    QuickCommentUpdateRequest,
    QuickCommentReorderRequest,
    BaseResponse,
)
from app.modules.all_platform.services import (
    get_all_quick_comments,
    add_quick_comment,
    update_quick_comment,
    delete_quick_comment,
    reorder_quick_comment,
)

router = APIRouter()


@router.get("")
def quick_comments_get_all(platform: str | None = Query(None)) -> BaseResponse:
    """Get all quick comment templates, optionally filtered by platform."""
    try:
        data = get_all_quick_comments(platform)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/add")
def quick_comments_add(payload: QuickCommentAddRequest) -> BaseResponse:
    """Add a new quick comment template."""
    try:
        data = add_quick_comment(payload.model_dump(exclude_none=True), payload.id_member)
        return BaseResponse(success=True, message="Quick comment template added", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/update")
def quick_comments_update(payload: QuickCommentUpdateRequest) -> BaseResponse:
    """Update an existing quick comment template."""
    try:
        data = update_quick_comment(payload.id, payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Quick comment template updated", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/delete")
def quick_comments_delete(id: str = Query(...)) -> BaseResponse:
    """Delete a quick comment template."""
    try:
        data = delete_quick_comment(id)
        return BaseResponse(success=True, message="Quick comment template deleted", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/reorder")
def quick_comments_reorder(payload: QuickCommentReorderRequest) -> BaseResponse:
    """Move a quick comment template up or down in order."""
    try:
        data = reorder_quick_comment(payload.id, payload.direction)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
