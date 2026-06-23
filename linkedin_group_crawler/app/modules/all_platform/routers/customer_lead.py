from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request

from app.modules.all_platform.schemas.customer_lead import (
    CustomerLeadCreate,
    CustomerLeadUpdate,
)
from app.modules.all_platform.services import decode_token
from app.modules.all_platform.services.customer_lead_service import (
    get_all_customer_leads,
    get_all_sdrs,
    create_customer_lead as svc_create,
    update_customer_lead as svc_update,
    delete_customer_lead as svc_delete,
)
from app.modules.linkedin.schemas.response_models import BaseResponse

router = APIRouter(prefix="/customer-leads", tags=["Customer Leads"])


def _current_user(request: Request, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    """Extract and validate current user from Bearer token or cookie."""
    if not authorization:
        cookie_token = request.cookies.get("crawlpro_access_token")
        if cookie_token:
            authorization = f"Bearer {cookie_token}"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    payload = decode_token(authorization[7:])
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


@router.get("", response_model=BaseResponse)
def list_customer_leads():
    try:
        data = get_all_customer_leads()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/sdrs", response_model=BaseResponse)
def list_sdrs():
    try:
        data = get_all_sdrs()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("", response_model=BaseResponse)
def create_customer_lead(
    payload: CustomerLeadCreate,
    request: Request,
    authorization: str | None = Header(default=None),
):
    try:
        user = _current_user(request, authorization)
        data_dict = payload.model_dump(exclude_unset=True)
        # Auto-fill leaded_by from JWT sub (user id)
        if not data_dict.get("leaded_by") and user.get("sub"):
            data_dict["leaded_by"] = user["sub"]
        new_lead = svc_create(data_dict)
        return BaseResponse(success=True, data=new_lead)
    except HTTPException:
        raise
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/{lead_id}", response_model=BaseResponse)
def update_customer_lead(lead_id: str, payload: CustomerLeadUpdate):
    try:
        updated = svc_update(
            lead_id, payload.model_dump(exclude_unset=True)
        )
        if not updated:
            return BaseResponse(success=False, message="Not found or update failed")
        return BaseResponse(success=True, data=updated)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/{lead_id}", response_model=BaseResponse)
def delete_customer_lead(lead_id: str):
    try:
        ok = svc_delete(lead_id)
        if ok:
            return BaseResponse(success=True, message="Deleted successfully")
        return BaseResponse(success=False, message="Delete failed")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
