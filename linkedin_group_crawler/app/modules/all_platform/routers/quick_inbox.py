"""Quick Inbox template library endpoints — platform-agnostic."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.modules.all_platform.schemas import (
    QuickInboxAddRequest,
    QuickInboxUpdateRequest,
    QuickInboxReorderRequest,
    BaseResponse,
)
from app.modules.all_platform.services import (
    get_all_quick_inbox,
    add_quick_inbox,
    update_quick_inbox,
    delete_quick_inbox,
    reorder_quick_inbox,
)

router = APIRouter()


@router.get("")
def quick_inbox_get_all() -> BaseResponse:
    """Get all quick inbox templates."""
    try:
        data = get_all_quick_inbox()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/add")
def quick_inbox_add(payload: QuickInboxAddRequest) -> BaseResponse:
    """Add a new quick inbox template."""
    try:
        data = add_quick_inbox(payload.model_dump(exclude_none=True), payload.id_member)
        return BaseResponse(success=True, message="Quick inbox template added", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/update")
def quick_inbox_update(payload: QuickInboxUpdateRequest) -> BaseResponse:
    """Update an existing quick inbox template."""
    try:
        data = update_quick_inbox(payload.id, payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Quick inbox template updated", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/delete")
def quick_inbox_delete(id: str = Query(...)) -> BaseResponse:
    """Delete a quick inbox template."""
    try:
        data = delete_quick_inbox(id)
        return BaseResponse(success=True, message="Quick inbox template deleted", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/reorder")
def quick_inbox_reorder(payload: QuickInboxReorderRequest) -> BaseResponse:
    """Move a quick inbox template up or down in order."""
    try:
        data = reorder_quick_inbox(payload.id, payload.direction)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
