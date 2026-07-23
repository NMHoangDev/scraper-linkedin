"""Admin backend adapter for the company phone bridge."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import os
import threading
import time
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

from app.modules.all_platform.auth_deps import require_admin
from app.modules.all_platform.phone_bridge.client import (
    BridgeResponse,
    PhoneBridgeClient,
    get_phone_bridge_client,
    is_phone_bridge_enabled,
    sanitize_public_response,
)
from app.modules.all_platform.phone_bridge.events import admin_event_bus
from app.modules.all_platform.phone_bridge.schemas import (
    FacebookCommentRequest,
    FacebookConfirmLikeRequest,
    FacebookCreatePostRequest,
    FacebookOpenPostRequest,
    FacebookPrepareLikeRequest,
    OpenConversationRequest,
    PhonePlatform,
    SendMessageRequest,
)


router = APIRouter()
_WEBHOOK_REPLAY_WINDOW_SECONDS = 300
_seen_webhook_events: dict[str, float] = {}
_seen_webhook_events_lock = threading.Lock()


def _actor(admin: dict[str, Any]) -> str:
    for key in ("email", "id", "user_id"):
        value = str(admin.get(key) or "").strip()
        if value:
            return value
    return "admin"


def _serial_path(serial: str) -> str:
    return quote(serial, safe="")


def _dump(model: Any, **kwargs: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump(**kwargs)
    return model.dict(**kwargs)


def _request_id(request: Request) -> str | None:
    return request.headers.get("X-Request-Id")


def _proxy_response(result: BridgeResponse) -> Response:
    if result.status_code == 204:
        return Response(status_code=204)
    return JSONResponse(content=result.data, status_code=result.status_code)


async def _proxy(
    client: PhoneBridgeClient,
    request: Request,
    admin: dict[str, Any],
    method: str,
    path: str,
    *,
    json_body: Any | None = None,
) -> Response:
    result = await client.request(
        method,
        path,
        request_id=_request_id(request),
        actor=_actor(admin),
        json_body=json_body,
    )
    return _proxy_response(result)


def _status_error(source: str, exc: BaseException) -> dict[str, Any]:
    if isinstance(exc, HTTPException):
        return {
            "source": source,
            "status": exc.status_code,
            "detail": sanitize_public_response(exc.detail),
        }
    return {
        "source": source,
        "status": 502,
        "detail": "Phone bridge request failed",
    }


@router.get("/status")
async def status(
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> dict[str, Any]:
    enabled = getattr(client, "enabled", True)
    if not enabled:
        return {
            "enabled": False,
            "configured": client.configured,
            "online": False,
            "health": None,
            "devices": None,
            "errors": [
                {
                    "source": "feature_flag",
                    "status": 503,
                    "detail": "Phone bridge feature is disabled",
                },
            ],
        }
    if not client.configured:
        return {
            "enabled": True,
            "configured": False,
            "online": False,
            "health": None,
            "devices": None,
            "errors": [
                {
                    "source": "configuration",
                    "status": 503,
                    "detail": "Phone bridge is not configured",
                },
            ],
        }

    common = {
        "request_id": _request_id(request),
        "actor": _actor(admin),
    }
    health_result, devices_result = await asyncio.gather(
        client.request("GET", "/health", **common),
        client.request("GET", "/devices", **common),
        return_exceptions=True,
    )

    errors: list[dict[str, Any]] = []
    if isinstance(health_result, BaseException):
        health_ok = False
        health = None
        errors.append(_status_error("health", health_result))
    else:
        health_ok = True
        health = sanitize_public_response(health_result.data)

    if isinstance(devices_result, BaseException):
        devices = None
        errors.append(_status_error("devices", devices_result))
    else:
        devices = sanitize_public_response(devices_result.data)

    return {
        "enabled": True,
        "configured": True,
        "online": health_ok,
        "health": health,
        "devices": devices,
        "errors": errors,
    }


@router.get("/devices")
async def devices(
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    return await _proxy(client, request, admin, "GET", "/devices")


@router.get("/devices/{serial}/{platform}/conversations")
async def conversations(
    serial: str,
    platform: PhonePlatform,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/{platform}/conversations"
    return await _proxy(client, request, admin, "GET", path)


@router.post("/devices/{serial}/{platform}/scan-all")
async def scan_all(
    serial: str,
    platform: PhonePlatform,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/{platform}/scan-all"
    return await _proxy(client, request, admin, "POST", path, json_body={})


@router.post("/devices/{serial}/{platform}/conversations/open")
async def open_conversation(
    serial: str,
    platform: PhonePlatform,
    body: OpenConversationRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/{platform}/conversations/open"
    return await _proxy(
        client,
        request,
        admin,
        "POST",
        path,
        json_body=_dump(body),
    )


@router.post("/devices/{serial}/{platform}/send")
async def send_message(
    serial: str,
    platform: PhonePlatform,
    body: SendMessageRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    if not body.dryRun and not body.confirmed:
        raise HTTPException(
            status_code=409,
            detail="A real send requires confirmed=true",
        )
    path = f"/devices/{_serial_path(serial)}/{platform}/send"
    return await _proxy(
        client,
        request,
        admin,
        "POST",
        path,
        json_body={"text": body.text, "dryRun": body.dryRun},
    )


@router.post("/devices/{serial}/facebook/open-post")
async def facebook_open_post(
    serial: str,
    body: FacebookOpenPostRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/facebook/open-post"
    return await _proxy(client, request, admin, "POST", path, json_body=_dump(body))


@router.post("/devices/{serial}/facebook/prepare-like")
async def facebook_prepare_like(
    serial: str,
    body: FacebookPrepareLikeRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/facebook/prepare-like"
    return await _proxy(
        client,
        request,
        admin,
        "POST",
        path,
        json_body=_dump(body, exclude_none=True),
    )


@router.post("/devices/{serial}/facebook/confirm-like")
async def facebook_confirm_like(
    serial: str,
    body: FacebookConfirmLikeRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    if not body.confirmed:
        raise HTTPException(
            status_code=409,
            detail="Confirming a like requires confirmed=true",
        )
    path = f"/devices/{_serial_path(serial)}/facebook/confirm-like"
    bridge_body = _dump(body, exclude={"confirmed"})
    return await _proxy(client, request, admin, "POST", path, json_body=bridge_body)


@router.post("/devices/{serial}/facebook/comment")
async def facebook_comment(
    serial: str,
    body: FacebookCommentRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    if not body.confirmed:
        raise HTTPException(
            status_code=409,
            detail="Posting a comment requires confirmed=true",
        )
    path = f"/devices/{_serial_path(serial)}/facebook/comment"
    bridge_body = _dump(body, exclude={"confirmed"})
    return await _proxy(client, request, admin, "POST", path, json_body=bridge_body)


@router.post("/devices/{serial}/facebook/create-post")
async def facebook_create_post(
    serial: str,
    body: FacebookCreatePostRequest,
    request: Request,
    admin: dict[str, Any] = Depends(require_admin),
    client: PhoneBridgeClient = Depends(get_phone_bridge_client),
) -> Response:
    path = f"/devices/{_serial_path(serial)}/facebook/create-post"
    return await _proxy(
        client,
        request,
        admin,
        "POST",
        path,
        json_body={"text": body.text, "dryRun": True},
    )


@router.post("/webhook")
async def webhook(
    request: Request,
    x_bridge_timestamp: str = Header(alias="X-Bridge-Timestamp"),
    x_bridge_event_id: str = Header(alias="X-Bridge-Event-Id"),
    x_bridge_signature: str = Header(alias="X-Bridge-Signature"),
) -> dict[str, Any]:
    if not is_phone_bridge_enabled():
        raise HTTPException(status_code=503, detail="Phone bridge feature is disabled")
    secret = os.getenv("PHONE_BRIDGE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="Phone bridge webhook is not configured",
        )

    try:
        timestamp = int(x_bridge_timestamp)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid bridge timestamp") from exc

    now = time.time()
    if abs(now - timestamp) > _WEBHOOK_REPLAY_WINDOW_SECONDS:
        raise HTTPException(status_code=401, detail="Bridge webhook timestamp is stale")

    event_id = x_bridge_event_id
    if not event_id or event_id != event_id.strip() or len(event_id) > 256:
        raise HTTPException(status_code=400, detail="Invalid bridge event id")

    raw_body = await request.body()
    signed_data = (
        x_bridge_timestamp.encode("utf-8")
        + b"."
        + event_id.encode("utf-8")
        + b"."
        + raw_body
    )
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signed_data,
        hashlib.sha256,
    ).hexdigest()
    supplied_signature = x_bridge_signature.strip()
    if supplied_signature.lower().startswith("sha256="):
        supplied_signature = supplied_signature[7:]
    if not hmac.compare_digest(expected_signature, supplied_signature.lower()):
        raise HTTPException(status_code=401, detail="Invalid bridge webhook signature")

    try:
        payload = json.loads(raw_body)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid bridge webhook body") from exc

    with _seen_webhook_events_lock:
        expired_before = now - _WEBHOOK_REPLAY_WINDOW_SECONDS
        expired_ids = [
            seen_id
            for seen_id, seen_at in _seen_webhook_events.items()
            if seen_at < expired_before
        ]
        for seen_id in expired_ids:
            _seen_webhook_events.pop(seen_id, None)
        if event_id in _seen_webhook_events:
            raise HTTPException(status_code=409, detail="Bridge webhook event replayed")
        _seen_webhook_events[event_id] = now

    await admin_event_bus.publish(
        {
            "eventId": event_id,
            "timestamp": timestamp,
            "payload": payload,
        },
    )
    return {"accepted": True, "eventId": event_id}


@router.get("/events/stream")
async def event_stream(
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
) -> StreamingResponse:
    if not is_phone_bridge_enabled():
        raise HTTPException(status_code=503, detail="Phone bridge feature is disabled")
    return StreamingResponse(
        admin_event_bus.stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
