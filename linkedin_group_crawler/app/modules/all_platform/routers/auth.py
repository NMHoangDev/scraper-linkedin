"""Auth endpoints — register, login, logout, profile management."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request, Response

from app.modules.all_platform.schemas import (
    RegisterRequest,
    LoginRequest,
    ChangePasswordRequest,
    DeactivateAccountRequest,
    UpdateProfileRequest,
    PromoteToLeaderRequest,
    BaseResponse,
)
from app.modules.all_platform.services import (
    register_user,
    login_user,
    logout_user,
    decode_token,
    get_user_by_id,
    update_user_profile,
    verify_leader_code as verify_code,
    promote_to_leader,
    get_user_sessions,
    delete_session,
    delete_all_sessions,
    change_password,
    deactivate_account,
)

router = APIRouter()


def _get_user_from_header(authorization: str | None, request: Request | None = None) -> dict:
    """Extract and validate user from Bearer token or HttpOnly cookie."""
    if not authorization:
        if request:
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


@router.post("/register")
def auth_register(payload: RegisterRequest, response: Response) -> BaseResponse:
    """Register a new app user account.

    Sets an HttpOnly cookie for 5 days so the browser keeps the session without
    using localStorage.
    """
    try:
        data = register_user(
            email=payload.email,
            password=payload.password,
            name=payload.name,
        )
        token = (data or {}).get("access_token")
        if token:
            response.set_cookie(
                key="crawlpro_access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=5 * 24 * 60 * 60,
                path="/",
            )
        return BaseResponse(success=True, message="Registration successful", data={"user": data.get("user")})
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=f"Registration failed: {e}")


@router.post("/login")
def auth_login(payload: LoginRequest, response: Response) -> BaseResponse:
    """Login with email and password.

    Sets an HttpOnly cookie for 5 days so the browser keeps the session without
    using localStorage.
    """
    try:
        data = login_user(email=payload.email, password=payload.password)
        token = (data or {}).get("access_token")
        if token:
            response.set_cookie(
                key="crawlpro_access_token",
                value=token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=5 * 24 * 60 * 60,
                path="/",
            )
        return BaseResponse(success=True, message="Login successful", data={"user": data.get("user")})
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
    except Exception as e:
        return BaseResponse(success=False, message=f"Login failed: {e}")


@router.post("/logout")
def auth_logout(response: Response, authorization: str | None = Header(None)) -> BaseResponse:
    """Logout: clear cookie session."""
    response.delete_cookie(key="crawlpro_access_token", path="/")
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        logout_user(token)
    return BaseResponse(success=True, message="Logged out")


@router.get("/me")
def auth_me(request: Request, authorization: str | None = Header(None)) -> BaseResponse:
    """Get current authenticated user profile.

    Accepts either Authorization Bearer token (legacy) or HttpOnly cookie.
    """
    try:
        cookie_token = request.cookies.get("crawlpro_access_token")
        authz = authorization
        if not authz and cookie_token:
            authz = f"Bearer {cookie_token}"

        user = _get_user_from_header(authz)
        return BaseResponse(success=True, data={
            "id": user.get("id"),
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
            "is_active": user.get("is_active"),
            "created_at": user.get("created_at"),
        })
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)


@router.put("/me/profile")
def auth_update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Update current user's profile."""
    try:
        user = _get_user_from_header(authorization, request)
        data = update_user_profile(user["id"], payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, message="Profile updated", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)


@router.post("/promote-to-leader")
def auth_promote_to_leader(
    payload: PromoteToLeaderRequest,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Promote current user to leader using leader code."""
    try:
        user = _get_user_from_header(authorization, request)
        data = promote_to_leader(user["id"], payload.leader_code)
        return BaseResponse(success=True, message="Promoted to leader", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/verify-leader-code")
def auth_verify_leader_code(code: str) -> BaseResponse:
    """Verify a leader code (no auth required)."""
    result = verify_code(code)
    return BaseResponse(success=True, data=result)


@router.get("/sessions")
def auth_get_sessions(request: Request, authorization: str | None = Header(None)) -> BaseResponse:
    """Get all active sessions for current user."""
    try:
        user = _get_user_from_header(authorization, request)
        data = get_user_sessions(user["id"])
        return BaseResponse(success=True, data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)


@router.delete("/sessions/{session_id}")
def auth_delete_session(
    session_id: str,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Delete a specific session."""
    try:
        user = _get_user_from_header(authorization, request)
        data = delete_session(session_id, user["id"])
        return BaseResponse(success=True, message="Session deleted", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)


@router.delete("/sessions")
def auth_delete_all_sessions(request: Request, authorization: str | None = Header(None)) -> BaseResponse:
    """Delete all sessions (logout from all devices)."""
    try:
        user = _get_user_from_header(authorization, request)
        data = delete_all_sessions(user["id"])
        return BaseResponse(success=True, message="All sessions deleted", data=data)
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)


@router.put("/me/password")
def auth_change_password(
    payload: ChangePasswordRequest,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Change the current user's password."""
    try:
        user = _get_user_from_header(authorization, request)
        change_password(user["id"], payload.current_password, payload.new_password)
        return BaseResponse(success=True, message="Password changed successfully")
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/me/deactivate")
def auth_deactivate_account(
    payload: DeactivateAccountRequest,
    request: Request,
    authorization: str | None = Header(None),
) -> BaseResponse:
    """Deactivate the current user's account."""
    try:
        user = _get_user_from_header(authorization, request)
        deactivate_account(user["id"], payload.password)
        return BaseResponse(success=True, message="Account deactivated")
    except HTTPException as e:
        return BaseResponse(success=False, message=e.detail)
    except ValueError as e:
        return BaseResponse(success=False, message=str(e))
