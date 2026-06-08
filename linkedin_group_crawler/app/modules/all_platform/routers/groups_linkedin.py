"""Groups endpoints — platform-specific LinkedIn."""

from __future__ import annotations

from fastapi import APIRouter, Query, Header, Request, HTTPException

from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.services import (
    get_linkedin_groups,
    add_linkedin_group,
    update_linkedin_group,
    delete_linkedin_group,
    decode_token,
    get_user_by_id,
)

def _get_user_from_header(authorization: str | None, request: Request | None = None) -> dict:
    """Extract and validate user from Bearer token or cookie."""
    if not authorization and request:
        cookie_token = request.cookies.get("crawlpro_access_token")
        if cookie_token:
            authorization = f"Bearer {cookie_token}"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

router = APIRouter()


@router.get("/groups")
def li_groups_get_all(
    request: Request,
    status: str | None = Query(None),
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Get all LinkedIn groups."""
    try:
        user = _get_user_from_header(authorization, request)
        data = get_linkedin_groups(status=status, id_member=user["id"])
        return BaseResponse(success=True, data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/groups/add")
def li_groups_add(
    payload: dict,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Add a new LinkedIn group."""
    try:
        import traceback
        print(f"li_groups_add received payload: {payload}")
        user = _get_user_from_header(authorization, request)
        payload["id_member"] = user["id"]
        print(f"li_groups_add enriched payload: {payload}")
        data = add_linkedin_group(payload)
        print(f"li_groups_add success, data: {data}")
        return BaseResponse(success=True, message="Group added", data=data)
    except HTTPException as e:
        print(f"li_groups_add HTTPException: {e.detail}")
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        print(f"li_groups_add Exception: {e}")
        traceback.print_exc()
        return BaseResponse(success=False, message=str(e))


@router.put("/groups/update")
def li_groups_update(
    payload: dict,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Update an existing LinkedIn group."""
    try:
        user = _get_user_from_header(authorization, request)
        group_id = payload.get("id")
        if not group_id:
            return BaseResponse(success=False, message="id is required")
        payload["id_member"] = user["id"]
        data = update_linkedin_group(group_id, payload)
        return BaseResponse(success=True, message="Group updated", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/groups/delete")
def li_groups_delete(
    request: Request,
    id: str = Query(...),
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Delete a LinkedIn group."""
    try:
        user = _get_user_from_header(authorization, request)
        # Note: delete_linkedin_group logic might need row-level policy or id_member check
        data = delete_linkedin_group(id)
        return BaseResponse(success=True, message="Group deleted", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# Alias for import
linkedin_groups_router = router
