from fastapi import APIRouter, HTTPException, Depends
from typing import List, Any
from app.modules.linkedin.schemas.response_models import BaseResponse
from app.modules.all_platform.schemas.customer_lead import CustomerLeadCreate, CustomerLeadUpdate, CustomerLeadResponse
from app.modules.all_platform.services import customer_lead_service
from app.core.security import get_current_user

router = APIRouter(prefix="/customer-leads", tags=["Customer Leads"])

@router.get("", response_model=BaseResponse)
def get_customer_leads():
    try:
        data = customer_lead_service.get_all_customer_leads()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

@router.get("/sdrs", response_model=BaseResponse)
def get_sdrs():
    try:
        data = customer_lead_service.get_all_sdrs()
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

@router.post("", response_model=BaseResponse)
def create_customer_lead(payload: CustomerLeadCreate, current_user: Any = Depends(get_current_user)):
    try:
        data_dict = payload.model_dump(exclude_unset=True)
        # If leaded_by is not provided, use current user's id
        if not data_dict.get("leaded_by") and getattr(current_user, "id", None):
            data_dict["leaded_by"] = current_user.id
            
        new_lead = customer_lead_service.create_customer_lead(data_dict)
        return BaseResponse(success=True, data=new_lead)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

@router.put("/{lead_id}", response_model=BaseResponse)
def update_customer_lead(lead_id: str, payload: CustomerLeadUpdate):
    try:
        updated = customer_lead_service.update_customer_lead(lead_id, payload.model_dump(exclude_unset=True))
        if not updated:
            return BaseResponse(success=False, message="Not found or update failed")
        return BaseResponse(success=True, data=updated)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

@router.delete("/{lead_id}", response_model=BaseResponse)
def delete_customer_lead(lead_id: str):
    try:
        success = customer_lead_service.delete_customer_lead(lead_id)
        if success:
            return BaseResponse(success=True, message="Deleted successfully")
        return BaseResponse(success=False, message="Delete failed")
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
