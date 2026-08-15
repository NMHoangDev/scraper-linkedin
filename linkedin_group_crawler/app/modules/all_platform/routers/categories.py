"""Categories endpoints — platform-agnostic.

Trước đây router này không có auth gì cả — bất kỳ ai (kể cả chưa đăng nhập)
cũng thêm/sửa/xoá được category (vd crm_source), gây ra bug nguồn lead
"Personal" lọt vào dropdown CRM dù DB không hỗ trợ (xem migration 056).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.modules.all_platform.auth_deps import get_current_user, require_admin_or_leader
from app.modules.all_platform.schemas import (
    CategoryAddRequest,
    CategoryUpdateRequest,
    CategoryDeleteRequest,
    BaseResponse,
)
from app.modules.all_platform.services import (
    get_all_categories,
    get_categories_by_type,
    add_category,
    update_category,
    delete_category,
)

router = APIRouter()


@router.get("")
def categories_get_all(
    category_type: str | None = Query(None),
    _: Any = Depends(get_current_user),
) -> BaseResponse:
    """Get all categories, optionally filtered by type. Mọi user đã đăng nhập đều
    đọc được (form CRM/dashboard cần load danh mục cho tất cả role)."""
    try:
        if category_type:
            data = get_categories_by_type(category_type)
        else:
            data = get_all_categories()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/add")
def categories_add(payload: CategoryAddRequest, _: Any = Depends(require_admin_or_leader)) -> BaseResponse:
    """Add a new category. Chỉ admin/leader."""
    try:
        data = add_category(payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Category added", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/update")
def categories_update(payload: CategoryUpdateRequest, _: Any = Depends(require_admin_or_leader)) -> BaseResponse:
    """Update an existing category. Chỉ admin/leader."""
    try:
        data = update_category(payload.id, payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Category updated", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/delete")
def categories_delete(id: str = Query(...), _: Any = Depends(require_admin_or_leader)) -> BaseResponse:
    """Delete a category. Chỉ admin/leader."""
    try:
        data = delete_category(id)
        return BaseResponse(success=True, message="Category deleted", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
