"""Async HTTP client for the company-managed phone bridge."""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException


DEFAULT_TIMEOUT_SECONDS = 15.0
_SENSITIVE_KEY_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "cookie",
    "credential",
    "password",
    "private",
    "secret",
    "session",
    "signature",
    "token",
)


def sanitize_public_response(value: Any) -> Any:
    """Remove common credential fields before data is included in diagnostics."""

    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            normalized = str(key).lower().replace("-", "_")
            if any(part in normalized for part in _SENSITIVE_KEY_PARTS):
                sanitized[str(key)] = "[redacted]"
            else:
                sanitized[str(key)] = sanitize_public_response(item)
        return sanitized
    if isinstance(value, list):
        return [sanitize_public_response(item) for item in value]
    return value


def _safe_upstream_error(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return sanitize_public_response(value)
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return "Non-JSON upstream response omitted"


def _safe_header_value(value: str, fallback: str) -> str:
    cleaned = value.replace("\r", "").replace("\n", "").strip()
    return cleaned[:256] or fallback


def _timeout_from_env() -> float:
    raw = os.getenv("PHONE_BRIDGE_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        timeout = float(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return timeout if timeout > 0 else DEFAULT_TIMEOUT_SECONDS


def is_phone_bridge_enabled() -> bool:
    return os.getenv("PHONE_BRIDGE_ENABLED", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


@dataclass(frozen=True)
class BridgeResponse:
    status_code: int
    data: Any


@dataclass(frozen=True)
class PhoneBridgeClient:
    base_url: str
    api_key: str
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS
    transport: httpx.AsyncBaseTransport | None = None
    enabled: bool = True

    @classmethod
    def from_env(cls) -> "PhoneBridgeClient":
        return cls(
            base_url=os.getenv("PHONE_BRIDGE_URL", "").strip().rstrip("/"),
            api_key=os.getenv("PHONE_BRIDGE_API_KEY", "").strip(),
            timeout_seconds=_timeout_from_env(),
            enabled=is_phone_bridge_enabled(),
        )

    @property
    def configured(self) -> bool:
        return bool(self.base_url and self.api_key)

    async def request(
        self,
        method: str,
        path: str,
        *,
        request_id: str | None = None,
        actor: str = "admin",
        json_body: Any | None = None,
    ) -> BridgeResponse:
        if not self.enabled:
            raise HTTPException(
                status_code=503,
                detail="Phone bridge feature is disabled",
            )
        if not self.configured:
            raise HTTPException(
                status_code=503,
                detail="Phone bridge is not configured",
            )

        safe_request_id = _safe_header_value(request_id or "", uuid.uuid4().hex)
        safe_actor = _safe_header_value(actor, "admin")
        headers = {
            "Accept": "application/json",
            "X-Bridge-Api-Key": self.api_key,
            "X-Request-Id": safe_request_id,
            "X-Bridge-Actor": safe_actor,
        }
        url = f"{self.base_url}/{path.lstrip('/')}"

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout_seconds,
                transport=self.transport,
                follow_redirects=False,
            ) as client:
                response = await client.request(
                    method,
                    url,
                    headers=headers,
                    json=json_body,
                )
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=504,
                detail="Phone bridge request timed out",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail="Phone bridge is unavailable",
            ) from exc

        data = self._response_data(response)
        if 300 <= response.status_code < 400:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "Phone bridge returned an unexpected redirect",
                    "upstream_status": response.status_code,
                },
            )
        if response.status_code >= 400:
            mapped_status = response.status_code if response.status_code < 500 else 502
            raise HTTPException(
                status_code=mapped_status,
                detail={
                    "message": "Phone bridge returned an error",
                    "upstream_status": response.status_code,
                    "upstream": _safe_upstream_error(data),
                },
            )
        return BridgeResponse(status_code=response.status_code, data=data)

    @staticmethod
    def _response_data(response: httpx.Response) -> Any:
        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            return response.text[:4096]


def get_phone_bridge_client() -> PhoneBridgeClient:
    """FastAPI dependency kept as a factory so tests can override it."""

    return PhoneBridgeClient.from_env()
