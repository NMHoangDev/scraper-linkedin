"""Groups endpoints — platform-specific Facebook."""

from __future__ import annotations

from fastapi import APIRouter, Query, Header, Request, HTTPException

from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.services import (
    get_facebook_groups,
    add_facebook_group,
    update_facebook_group,
    delete_facebook_group,
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
    token = authorization[7:]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

router = APIRouter()


@router.get("/groups")
def fb_groups_get_all(
    request: Request,
    id_intent: str | None = Query(None),
    id_team: str | None = Query(None),
    id_tier: str | None = Query(None),
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Get all Facebook groups for the current user."""
    try:
        user = _get_user_from_header(authorization, request)
        data = get_facebook_groups(
            id_intent=id_intent, 
            id_team=id_team, 
            id_tier=id_tier,
            id_member=user["id"]
        )
        return BaseResponse(success=True, data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/groups/add")
def fb_groups_add(
    payload: dict,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Add a new Facebook group."""
    try:
        user = _get_user_from_header(authorization, request)
        payload["id_member"] = user["id"]
        data = add_facebook_group(payload)
        return BaseResponse(success=True, message="Group added", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.put("/groups/update")
def fb_groups_update(
    payload: dict,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Update an existing Facebook group."""
    try:
        user = _get_user_from_header(authorization, request)
        group_id = payload.get("id")
        if not group_id:
            return BaseResponse(success=False, message="id is required")
        payload["id_member"] = user["id"]
        data = update_facebook_group(group_id, payload)
        return BaseResponse(success=True, message="Group updated", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.delete("/groups/delete")
def fb_groups_delete(
    request: Request,
    id: str = Query(...),
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Delete a Facebook group."""
    try:
        user = _get_user_from_header(authorization, request)
        data = delete_facebook_group(id, id_member=user["id"])
        return BaseResponse(success=True, message="Group deleted", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# Alias for import
facebook_groups_router = router
