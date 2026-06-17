"""Facebook automation proxy with product-auth role gates.

The browser must never call the Markee automation service with the admin API
key. This router keeps that key server-side, validates the current product
user's scope, then forwards allowed calls to Markee.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from app.modules.all_platform.services import decode_token, get_team_members, get_user_by_id


router = APIRouter()

MARKEE_BASE_URL = (os.getenv("MARKEE_FB_BASE_URL") or "https://auto-fb.zenithglobal.dev").rstrip("/")
MARKEE_ADMIN_API_KEY = (os.getenv("MARKEE_FB_API_KEY") or "").strip()
MARKEE_EXTENSION_API_KEY = (os.getenv("MARKEE_FB_EXTENSION_API_KEY") or "").strip()
_TIMEOUT = httpx.Timeout(45.0, connect=10.0)


def _current_user(request: Request, authorization: str | None = None) -> dict[str, Any]:
    if not authorization:
        cookie_token = request.cookies.get("crawlpro_access_token")
        if cookie_token:
            authorization = f"Bearer {cookie_token}"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    payload = decode_token(authorization[7:])
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(str(payload["sub"]))
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def _role(user: dict[str, Any]) -> str:
    return str(user.get("role") or "member").strip().lower()


def _allowed_owners(user: dict[str, Any]) -> set[str] | None:
    """Return None meaning all FB accounts are workspace-shared (visible to every authenticated user)."""
    return None


def _scope_query(user: dict[str, Any]) -> dict[str, str]:
    owners = _allowed_owners(user)
    if owners is None:
        return {}
    if len(owners) == 1:
        return {"owner": next(iter(owners))}
    return {"owners": ",".join(sorted(owners))}


def _auth_headers(*, json_body: bool = False, content_type: str | None = None) -> dict[str, str]:
    if not MARKEE_ADMIN_API_KEY:
        raise HTTPException(status_code=503, detail="MARKEE_FB_API_KEY is not configured on product backend")
    headers = {"X-API-Key": MARKEE_ADMIN_API_KEY}
    if json_body:
        headers["Content-Type"] = "application/json"
    if content_type:
        headers["Content-Type"] = content_type
    return headers


async def _markee_json(
    method: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    json_body: Any | None = None,
) -> tuple[int, Any]:
    url = f"{MARKEE_BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.request(
                method,
                url,
                params=params,
                json=json_body,
                headers=_auth_headers(json_body=json_body is not None),
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Markee service unavailable: {exc}") from exc
    try:
        payload = resp.json()
    except ValueError:
        payload = {"detail": resp.text}
    return resp.status_code, payload


def _json_response(status_code: int, payload: Any) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=payload)


async def _owned_user_ids(user: dict[str, Any]) -> set[str] | None:
    """Known FB account ids in the caller's allowed owner scope.

    Admin returns None because every account is allowed.
    """
    if _allowed_owners(user) is None:
        return None

    params = _scope_query(user)
    ids: set[str] = set()
    for path, key in (("/sessions", "sessions"), ("/extensions", "extensions")):
        status, payload = await _markee_json("GET", path, params=params)
        if status >= 400:
            continue
        for item in payload.get(key, []) if isinstance(payload, dict) else []:
            uid = item.get("user_id")
            if uid:
                ids.add(str(uid))
    return ids


async def _require_fb_account_scope(user: dict[str, Any], user_id: str) -> None:
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
    allowed = await _owned_user_ids(user)
    if allowed is not None and user_id not in allowed:
        raise HTTPException(status_code=403, detail="Facebook account is outside your team scope")


@router.get("/config")
async def fb_config(request: Request, authorization: str | None = Header(None)) -> dict[str, Any]:
    """Config safe for extension provisioning.

    This intentionally does not expose MARKEE_FB_API_KEY. In production set
    MARKEE_FB_EXTENSION_API_KEY to a limited key accepted only by extension
    endpoints on Markee.
    """
    user = _current_user(request, authorization)
    return {
        "success": True,
        "serverUrl": MARKEE_BASE_URL,
        "extensionApiKey": MARKEE_EXTENSION_API_KEY,
        "extensionKeyConfigured": bool(MARKEE_EXTENSION_API_KEY),
        "owner": user.get("id"),
    }


@router.get("/health")
async def fb_health(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    _current_user(request, authorization)
    status, payload = await _markee_json("GET", "/health")
    return _json_response(status, payload)


@router.get("/sessions")
async def fb_sessions(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    status, payload = await _markee_json("GET", "/sessions", params=_scope_query(user))
    return _json_response(status, payload)


@router.get("/extensions")
async def fb_extensions(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    status, payload = await _markee_json("GET", "/extensions", params=_scope_query(user))
    return _json_response(status, payload)


@router.get("/groups")
async def fb_groups(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    _current_user(request, authorization)
    status, payload = await _markee_json("GET", "/groups")
    return _json_response(status, payload)


@router.get("/jobs")
async def fb_jobs(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    status, payload = await _markee_json("GET", "/jobs")
    if status < 400 and isinstance(payload, dict) and _allowed_owners(user) is not None:
        allowed = await _owned_user_ids(user) or set()
        payload["jobs"] = [j for j in payload.get("jobs", []) if j.get("user_id") in allowed]
    return _json_response(status, payload)


@router.post("/upload")
async def fb_upload(request: Request, authorization: str | None = Header(None)) -> Response:
    _current_user(request, authorization)
    body = await request.body()
    content_type = request.headers.get("content-type")
    async with httpx.AsyncClient(timeout=_TIMEOUT, follow_redirects=True) as client:
        try:
            resp = await client.post(
                f"{MARKEE_BASE_URL}/upload",
                content=body,
                headers=_auth_headers(content_type=content_type),
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Markee service unavailable: {exc}") from exc
    return Response(content=resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type"))


@router.post("/post")
async def fb_post(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/post", json_body=data)
    return _json_response(status, payload)


@router.post("/extensions/{user_id}/label")
async def fb_extension_label(user_id: str, data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    await _require_fb_account_scope(user, user_id)
    status, payload = await _markee_json("POST", f"/extensions/{user_id}/label", json_body=data)
    return _json_response(status, payload)


@router.delete("/session/cookie/{user_id}")
async def fb_delete_session(user_id: str, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    await _require_fb_account_scope(user, user_id)
    status, payload = await _markee_json("DELETE", f"/session/cookie/{user_id}")
    return _json_response(status, payload)


@router.post("/session/meta")
async def fb_session_meta(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/session/meta", json_body=data)
    return _json_response(status, payload)


@router.get("/inbox/conversations")
async def fb_inbox_conversations(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(request.query_params.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    params = dict(request.query_params)
    status, payload = await _markee_json("GET", "/inbox/conversations", params=params)
    return _json_response(status, payload)


@router.post("/inbox/scan")
async def fb_inbox_scan(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/inbox/scan", json_body=data)
    return _json_response(status, payload)


@router.post("/inbox/mark")
async def fb_inbox_mark(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/inbox/mark", json_body=data)
    return _json_response(status, payload)


@router.post("/inbox/thread")
async def fb_inbox_thread_load(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/inbox/thread", json_body=data)
    return _json_response(status, payload)


@router.get("/inbox/thread")
async def fb_inbox_thread_get(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(request.query_params.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    params = dict(request.query_params)
    status, payload = await _markee_json("GET", "/inbox/thread", params=params)
    return _json_response(status, payload)


@router.post("/inbox/reply")
async def fb_inbox_reply(data: dict, request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    user = _current_user(request, authorization)
    uid = str(data.get("user_id") or "")
    await _require_fb_account_scope(user, uid)
    status, payload = await _markee_json("POST", "/inbox/reply", json_body=data)
    return _json_response(status, payload)


@router.get("/inbox/reply_status")
async def fb_inbox_reply_status(request: Request, authorization: str | None = Header(None)) -> JSONResponse:
    _current_user(request, authorization)
    params = dict(request.query_params)
    status, payload = await _markee_json("GET", "/inbox/reply_status", params=params)
    return _json_response(status, payload)
