from fastapi import APIRouter, HTTPException, Depends, Query, Request, Header
from typing import List, Any, Optional
from app.modules.linkedin.schemas.response_models import BaseResponse
from app.modules.all_platform.schemas.customer_lead import (
    CustomerLeadCreate,
    CustomerLeadUpdate,
    CustomerLeadResponse,
)
from app.modules.all_platform.services import customer_lead_service, decode_token, get_user_by_id


def get_current_user(request: Request, authorization: str | None = Header(None)) -> dict[str, Any]:
    if not authorization:
        cookie_token = request.cookies.get("crawlpro_access_token")
        if cookie_token:
            authorization = f"Bearer {cookie_token}"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    payload = decode_token(authorization[7:])
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        user = get_user_by_id(str(payload["sub"]))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Auth service temporarily unavailable") from exc
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


router = APIRouter(prefix="/customer-leads", tags=["Customer Leads"])


@router.get("", response_model=BaseResponse)
def get_customer_leads(
    search: str | None = Query(None),
    status: str | None = Query(None),
    city: str | None = Query(None),
    industry: str | None = Query(None),
    source_platform: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: Any = Depends(get_current_user),
):
    try:
        result = customer_lead_service.get_all_customer_leads(
            current_user=current_user,
            search=search,
            status=status,
            city=city,
            industry=industry,
            source_platform=source_platform,
            page=page,
            page_size=page_size,
        )
        return BaseResponse(success=True, data=result, message="Success")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/sdrs", response_model=BaseResponse)
def get_sdrs(_: Any = Depends(get_current_user)):
    try:
        data = customer_lead_service.get_all_sdrs()
        return BaseResponse(success=True, data=data, message="Success")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/by-conv/{conv_id}", response_model=BaseResponse)
def get_by_conv_id(conv_id: str, _: Any = Depends(get_current_user)):
    """Find existing customer by conversation ID (used in FB/Zalo inbox)."""
    try:
        lead = customer_lead_service.get_customer_lead_by_conv_id(conv_id)
        if lead:
            return BaseResponse(success=True, data=lead, message="Found")
        return BaseResponse(success=True, data=None, message="Not found")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("", response_model=BaseResponse)
def create_customer_lead(
    payload: CustomerLeadCreate,
    current_user: Any = Depends(get_current_user),
):
    try:
        data_dict = payload.model_dump(exclude_unset=True)
        # Auto-assign leaded_by from current user if not provided
        if not data_dict.get("leaded_by") and isinstance(current_user, dict) and current_user.get("id"):
            data_dict["leaded_by"] = current_user.get("id")
        new_lead = customer_lead_service.create_customer_lead(data_dict)
        return BaseResponse(success=True, data=new_lead, message="Success")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/{lead_id}", response_model=BaseResponse)
def update_customer_lead(
    lead_id: str,
    payload: CustomerLeadUpdate,
    _: Any = Depends(get_current_user),
):
    try:
        updated = customer_lead_service.update_customer_lead(
            lead_id,
            payload.model_dump(exclude_unset=True),
        )
        if not updated:
            return BaseResponse(success=False, message="Not found or update failed")
        return BaseResponse(success=True, data=updated, message="Success")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/{lead_id}", response_model=BaseResponse)
def delete_customer_lead(lead_id: str, _: Any = Depends(get_current_user)):
    try:
        success = customer_lead_service.delete_customer_lead(lead_id)
        if success:
            return BaseResponse(success=True, message="Deleted successfully")
        return BaseResponse(success=False, message="Delete failed")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
