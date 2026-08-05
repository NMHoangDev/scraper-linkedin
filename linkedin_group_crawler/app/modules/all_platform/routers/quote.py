"""Quote Forms + Quotes endpoints — real báo giá gắn với customer_leads (CRM deal).

CRUD nội bộ dùng auth hiện có (get_current_user). Endpoint public (form/quote qua
token) không yêu cầu auth — dùng cho trang public không đăng nhập.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.all_platform.auth_deps import get_current_user
from app.modules.all_platform.schemas import (
    BaseResponse,
    QuoteCreateRequest,
    QuoteFormCreateRequest,
    QuoteFormUpdateRequest,
    QuoteUpdateRequest,
)
from app.modules.all_platform.services import (
    create_quote,
    create_quote_form,
    delete_quote,
    delete_quote_form,
    duplicate_quote_form,
    get_public_quote,
    get_public_quote_form,
    get_quote,
    get_quote_form,
    list_quote_forms,
    list_quotes,
    publish_quote,
    share_quote_form,
    update_quote,
    update_quote_form,
)

quote_forms_router = APIRouter()
quotes_router = APIRouter()


# ── Quote Forms ────────────────────────────────────────────────────────────

@quote_forms_router.get("")
def quote_forms_list(status: str | None = Query(None), _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=list_quote_forms(status))
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.get("/public/{token}")
def quote_forms_get_public(token: str) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=get_public_quote_form(token))
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.get("/{form_id}")
def quote_forms_get(form_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=get_quote_form(form_id))
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.post("")
def quote_forms_create(payload: QuoteFormCreateRequest, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = create_quote_form(payload.model_dump())
        return BaseResponse(success=True, message="Đã tạo mẫu báo giá", data=data)
    except HTTPException:
        raise
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.put("/{form_id}")
def quote_forms_update(form_id: str, payload: QuoteFormUpdateRequest, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = update_quote_form(form_id, payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Đã lưu mẫu báo giá", data=data)
    except HTTPException:
        raise
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.delete("/{form_id}")
def quote_forms_delete(form_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = delete_quote_form(form_id)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.post("/{form_id}/duplicate")
def quote_forms_duplicate(form_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = duplicate_quote_form(form_id)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quote_forms_router.post("/{form_id}/share")
def quote_forms_share(form_id: str, enabled: bool = True, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = share_quote_form(form_id, enabled)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# ── Quotes ─────────────────────────────────────────────────────────────────

@quotes_router.get("")
def quotes_list(deal_id: str | None = Query(None), _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=list_quotes(deal_id))
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.get("/public/{token}")
def quotes_get_public(token: str) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=get_public_quote(token))
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.get("/{quote_id}")
def quotes_get(quote_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=get_quote(quote_id))
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.post("")
def quotes_create(payload: QuoteCreateRequest, user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = create_quote(payload.model_dump(), user.get("id"))
        return BaseResponse(success=True, message="Đã tạo báo giá", data=data)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except HTTPException:
        raise
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.put("/{quote_id}")
def quotes_update(quote_id: str, payload: QuoteUpdateRequest, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = update_quote(quote_id, payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, data=data)
    except HTTPException:
        raise
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.delete("/{quote_id}")
def quotes_delete(quote_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        delete_quote(quote_id)
        return BaseResponse(success=True)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@quotes_router.post("/{quote_id}/publish")
def quotes_publish(quote_id: str, _user: dict = Depends(get_current_user)) -> BaseResponse:
    try:
        data = publish_quote(quote_id)
        return BaseResponse(success=True, message="Đã xác nhận báo giá", data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
