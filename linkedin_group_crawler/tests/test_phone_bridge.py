from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import time
import uuid
from typing import Any

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.modules.all_platform import auth_deps
from app.modules.all_platform.phone_bridge.client import (
    BridgeResponse,
    PhoneBridgeClient,
    get_phone_bridge_client,
)
from app.modules.all_platform.phone_bridge.events import AdminEventBus
from app.modules.all_platform.phone_bridge.router import router


class RecordingBridgeClient:
    configured = True

    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    async def request(self, method: str, path: str, **kwargs: Any) -> BridgeResponse:
        self.calls.append({"method": method, "path": path, **kwargs})
        if path == "/health":
            return BridgeResponse(200, {"ok": True, "apiKey": "must-not-leak"})
        if path == "/devices":
            return BridgeResponse(200, {"devices": [], "accessToken": "hidden"})
        return BridgeResponse(200, {"ok": True})


@pytest.fixture
def bridge_app(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, RecordingBridgeClient]:
    monkeypatch.setenv("PHONE_BRIDGE_ENABLED", "true")
    monkeypatch.setattr(
        auth_deps,
        "decode_token",
        lambda token: {"sub": token},
    )
    monkeypatch.setattr(
        auth_deps,
        "get_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": f"{user_id}@example.test",
            "role": "admin" if user_id == "admin" else "member",
            "is_active": True,
        },
    )

    fake_bridge = RecordingBridgeClient()
    app = FastAPI()
    app.include_router(router, prefix="/api/all-platform/admin/phone-bridge")
    app.dependency_overrides[get_phone_bridge_client] = lambda: fake_bridge
    return TestClient(app), fake_bridge


def _auth(role: str = "admin") -> dict[str, str]:
    return {"Authorization": f"Bearer {role}"}


def test_control_routes_require_admin(
    bridge_app: tuple[TestClient, RecordingBridgeClient],
) -> None:
    client, fake_bridge = bridge_app

    missing = client.get("/api/all-platform/admin/phone-bridge/devices")
    assert missing.status_code == 401

    member = client.get(
        "/api/all-platform/admin/phone-bridge/devices",
        headers=_auth("member"),
    )
    assert member.status_code == 403

    admin = client.get(
        "/api/all-platform/admin/phone-bridge/devices",
        headers=_auth(),
    )
    assert admin.status_code == 200
    assert fake_bridge.calls[-1]["actor"] == "admin@example.test"


def test_status_combines_calls_and_redacts_secrets(
    bridge_app: tuple[TestClient, RecordingBridgeClient],
) -> None:
    client, _ = bridge_app
    response = client.get(
        "/api/all-platform/admin/phone-bridge/status",
        headers=_auth(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["enabled"] is True
    assert payload["configured"] is True
    assert payload["online"] is True
    assert payload["health"]["apiKey"] == "[redacted]"
    assert payload["devices"]["accessToken"] == "[redacted]"
    assert payload["errors"] == []


def test_real_send_needs_confirmation_and_forwards_only_safe_fields(
    bridge_app: tuple[TestClient, RecordingBridgeClient],
) -> None:
    client, fake_bridge = bridge_app
    path = "/api/all-platform/admin/phone-bridge/devices/device-1/zalo/send"

    rejected = client.post(
        path,
        headers=_auth(),
        json={"text": "hello", "dryRun": False},
    )
    assert rejected.status_code == 409
    assert fake_bridge.calls == []

    accepted = client.post(
        path,
        headers=_auth(),
        json={"text": "hello", "dryRun": False, "confirmed": True},
    )
    assert accepted.status_code == 200
    assert fake_bridge.calls[-1]["json_body"] == {
        "text": "hello",
        "dryRun": False,
    }


def test_open_conversation_matches_bridge_contract(
    bridge_app: tuple[TestClient, RecordingBridgeClient],
) -> None:
    client, fake_bridge = bridge_app
    response = client.post(
        "/api/all-platform/admin/phone-bridge/devices/device-1/messenger/conversations/open",
        headers=_auth(),
        json={"title": "Customer A", "maxInboxScrolls": 4},
    )

    assert response.status_code == 200
    assert fake_bridge.calls[-1]["json_body"] == {
        "title": "Customer A",
        "maxInboxScrolls": 4,
    }


def test_facebook_confirmation_and_create_post_safety(
    bridge_app: tuple[TestClient, RecordingBridgeClient],
) -> None:
    client, fake_bridge = bridge_app
    base = "/api/all-platform/admin/phone-bridge/devices/device-1/facebook"

    comment = client.post(
        f"{base}/comment",
        headers=_auth(),
        json={"text": "not confirmed"},
    )
    assert comment.status_code == 409

    preview = client.post(
        f"{base}/create-post",
        headers=_auth(),
        json={"text": "preview", "dryRun": False},
    )
    assert preview.status_code == 200
    assert fake_bridge.calls[-1]["json_body"] == {
        "text": "preview",
        "dryRun": True,
    }


def test_client_maps_timeout_and_sanitizes_upstream_errors() -> None:
    async def run() -> None:
        def upstream_error(request: httpx.Request) -> httpx.Response:
            assert request.headers["X-Bridge-Api-Key"] == "bridge-key"
            assert request.headers["X-Request-Id"] == "request-1"
            assert request.headers["X-Bridge-Actor"] == "admin@example.test"
            return httpx.Response(
                503,
                json={"message": "down", "api_key": "must-not-leak"},
            )

        client = PhoneBridgeClient(
            "http://bridge.test",
            "bridge-key",
            transport=httpx.MockTransport(upstream_error),
        )
        with pytest.raises(HTTPException) as upstream_exc:
            await client.request(
                "GET",
                "/devices",
                request_id="request-1",
                actor="admin@example.test",
            )
        assert upstream_exc.value.status_code == 502
        assert upstream_exc.value.detail["upstream_status"] == 503
        assert upstream_exc.value.detail["upstream"]["api_key"] == "[redacted]"

        def timeout(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("slow", request=request)

        timeout_client = PhoneBridgeClient(
            "http://bridge.test",
            "bridge-key",
            transport=httpx.MockTransport(timeout),
        )
        with pytest.raises(HTTPException) as timeout_exc:
            await timeout_client.request("GET", "/health")
        assert timeout_exc.value.status_code == 504
        assert timeout_exc.value.detail == "Phone bridge request timed out"

    asyncio.run(run())


def test_feature_flag_defaults_to_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PHONE_BRIDGE_ENABLED", raising=False)
    monkeypatch.setenv("PHONE_BRIDGE_URL", "http://bridge.test")
    monkeypatch.setenv("PHONE_BRIDGE_API_KEY", "bridge-key")
    client = PhoneBridgeClient.from_env()

    assert client.enabled is False

    async def run() -> None:
        with pytest.raises(HTTPException) as exc:
            await client.request("GET", "/health")
        assert exc.value.status_code == 503
        assert exc.value.detail == "Phone bridge feature is disabled"

    asyncio.run(run())


def _webhook_headers(
    secret: str,
    body: bytes,
    *,
    timestamp: int,
    event_id: str,
) -> dict[str, str]:
    signed = f"{timestamp}.{event_id}.".encode() + body
    signature = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return {
        "X-Bridge-Timestamp": str(timestamp),
        "X-Bridge-Event-Id": event_id,
        "X-Bridge-Signature": signature,
        "Content-Type": "application/json",
    }


def test_webhook_signature_stale_and_replay(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    secret = "test-webhook-secret"
    monkeypatch.setenv("PHONE_BRIDGE_ENABLED", "true")
    monkeypatch.setenv("PHONE_BRIDGE_WEBHOOK_SECRET", secret)
    app = FastAPI()
    app.include_router(router, prefix="/phone-bridge")
    client = TestClient(app)
    body = json.dumps({"type": "device.updated"}, separators=(",", ":")).encode()
    now = int(time.time())
    event_id = f"evt-{uuid.uuid4().hex}"
    headers = _webhook_headers(secret, body, timestamp=now, event_id=event_id)

    accepted = client.post("/phone-bridge/webhook", content=body, headers=headers)
    assert accepted.status_code == 200
    assert accepted.json() == {"accepted": True, "eventId": event_id}

    replay = client.post("/phone-bridge/webhook", content=body, headers=headers)
    assert replay.status_code == 409

    bad_headers = dict(headers)
    bad_headers["X-Bridge-Event-Id"] = f"evt-{uuid.uuid4().hex}"
    bad_headers["X-Bridge-Signature"] = "0" * 64
    invalid = client.post("/phone-bridge/webhook", content=body, headers=bad_headers)
    assert invalid.status_code == 401

    stale_id = f"evt-{uuid.uuid4().hex}"
    stale_headers = _webhook_headers(
        secret,
        body,
        timestamp=now - 301,
        event_id=stale_id,
    )
    stale = client.post("/phone-bridge/webhook", content=body, headers=stale_headers)
    assert stale.status_code == 401


def test_sse_event_bus_event_heartbeat_and_cleanup() -> None:
    class ConnectedRequest:
        async def is_disconnected(self) -> bool:
            return False

    async def run() -> None:
        bus = AdminEventBus()
        stream = bus.stream(ConnectedRequest(), heartbeat_seconds=0.01)  # type: ignore[arg-type]

        heartbeat = await stream.__anext__()
        assert heartbeat == ": heartbeat\n\n"
        assert bus.subscriber_count == 1

        next_event = asyncio.create_task(stream.__anext__())
        await asyncio.sleep(0)
        await bus.publish({"eventId": "evt-1", "payload": {"ok": True}})
        chunk = await asyncio.wait_for(next_event, timeout=1)
        assert "event: bridge-event" in chunk
        assert '"eventId":"evt-1"' in chunk

        await stream.aclose()
        assert bus.subscriber_count == 0

    asyncio.run(run())
