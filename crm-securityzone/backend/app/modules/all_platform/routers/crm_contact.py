from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.modules.all_platform.auth_deps import get_current_user
from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.schemas.crm_contact import CrmContactCreate, CrmContactUpdate
from app.modules.all_platform.services.crm_contact_service import (
    create_contact,
    delete_contact,
    list_contacts,
    update_contact,
)

# Mounted at prefix "/crm/customers/{customer_id}/contacts" in router.py -
# judgment call: kept as its OWN router file (not piggybacked onto
# crm_customer.py) because contacts are a distinct sub-resource with their
# own CRUD schema set; the path-param-in-prefix style itself follows the
# same convention already used for crm_customer_router's simple prefix.
router = APIRouter()


def _error(exc: Exception) -> BaseResponse:
    if isinstance(exc, PermissionError):
        return BaseResponse(success=False, message=str(exc))
    return BaseResponse(success=False, message=str(exc))


@router.get("")
def contacts_list(customer_id: str, user: dict[str, Any] = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, data=list_contacts(customer_id, user))
    except Exception as exc:
        return _error(exc)


@router.post("")
def contacts_create(customer_id: str, payload: CrmContactCreate, user: dict[str, Any] = Depends(get_current_user)) -> BaseResponse:
    try:
        return BaseResponse(success=True, message="Da them lien he", data=create_contact(customer_id, payload.model_dump(), user))
    except Exception as exc:
        return _error(exc)


@router.put("/{contact_id}")
def contacts_update(
    customer_id: str,
    contact_id: str,
    payload: CrmContactUpdate,
    user: dict[str, Any] = Depends(get_current_user),
) -> BaseResponse:
    try:
        return BaseResponse(
            success=True,
            message="Da cap nhat lien he",
            data=update_contact(customer_id, contact_id, payload.model_dump(exclude_unset=True), user),
        )
    except Exception as exc:
        return _error(exc)


@router.delete("/{contact_id}")
def contacts_delete(customer_id: str, contact_id: str, user: dict[str, Any] = Depends(get_current_user)) -> BaseResponse:
    try:
        delete_contact(customer_id, contact_id, user)
        return BaseResponse(success=True, message="Da xoa lien he")
    except Exception as exc:
        return _error(exc)
