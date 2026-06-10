"""Authentication service — JWT-based login/register/logout for app users."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings
from app.core.supabase_client import get_supabase_client


def _hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _hash_token(token: str) -> str:
    """SHA-256 hash a JWT token for storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str, email: str, role: str) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token. Returns payload or None if invalid."""
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        return None


def register_user(email: str, password: str, name: Optional[str] = None) -> dict:
    """Register a new app user. Returns user data or raises ValueError."""
    supabase = get_supabase_client()

    # Check if email already exists
    existing = supabase.table("app_users").select("id").eq("email", email.lower()).execute()
    if existing.data:
        raise ValueError("Email already registered")

    hashed_pw = _hash_password(password)
    user_data = {
        "email": email.lower().strip(),
        "password": hashed_pw,
        "name": name.strip() if name else None,
        "role": "member",
        "is_active": True,
    }
    result = supabase.table("app_users").insert(user_data).execute()
    if not result.data:
        raise ValueError("Failed to create user")

    user = result.data[0]
    access_token = create_access_token(user["id"], user["email"], user["role"])

    # Store session
    _store_session(user["id"], access_token)

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "role": user["role"],
        },
        "access_token": access_token,
    }


def login_user(email: str, password: str) -> dict:
    """Login an existing app user. Returns user + token or raises ValueError."""
    supabase = get_supabase_client()

    result = supabase.table("app_users").select("*").eq("email", email.lower().strip()).execute()
    if not result.data:
        raise ValueError("Email không tồn tại")

    user = result.data[0]
    if not user.get("is_active", True):
        raise ValueError("Tài khoản đã bị vô hiệu hóa")

    if not _verify_password(password, user["password"]):
        raise ValueError("Sai mật khẩu")

    access_token = create_access_token(user["id"], user["email"], user["role"])

    # Store session
    _store_session(user["id"], access_token)

    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user.get("name"),
            "role": user.get("role", "member"),
        },
        "access_token": access_token,
    }


def logout_user(token: str) -> dict:
    """Logout: remove session by token hash.

    Some deployments don't have `public.user_sessions` (older schema). In that case
    we treat logout as a no-op (client will still discard JWT).
    """
    supabase = get_supabase_client()
    token_hash = _hash_token(token)
    try:
        supabase.table("user_sessions").delete().eq("token_hash", token_hash).execute()
    except Exception:
        # Best-effort: don't block logout if sessions table missing
        pass
    return {"logged_out": True}


def _store_session(user_id: str, token: str, user_agent: Optional[str] = None, ip: Optional[str] = None) -> None:
    """Store a session in user_sessions table.

    Some Supabase projects may not have this table yet; login/register should still
    succeed even if we can't persist sessions.
    """
    supabase = get_supabase_client()
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    try:
        supabase.table("user_sessions").insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "user_agent": user_agent,
            "ip_address": ip,
            "expires_at": expires_at.isoformat(),
        }).execute()
    except Exception:
        # Best-effort: don't block login/register if sessions table missing
        pass


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Get user by ID."""
    supabase = get_supabase_client()
    result = supabase.table("app_users").select("*").eq("id", user_id).execute()
    if result.data:
        user = result.data[0]
        user.pop("password", None)
        return user
    return None


def get_user_by_email(email: str) -> Optional[dict]:
    """Get user by email."""
    supabase = get_supabase_client()
    result = supabase.table("app_users").select("*").eq("email", email.lower().strip()).execute()
    if result.data:
        user = result.data[0]
        user.pop("password", None)
        return user
    return None


def update_user_profile(user_id: str, updates: dict) -> dict:
    """Update user profile (name, etc)."""
    supabase = get_supabase_client()
    safe_updates = {k: v for k, v in updates.items() if k in ("name") and v is not None}
    safe_updates["updated_at"] = "now()"
    result = supabase.table("app_users").update(safe_updates).eq("id", user_id).execute()
    if result.data:
        result.data[0].pop("password", None)
        return result.data[0]
    return {}


def _store_session(user_id: str, token: str, user_agent: Optional[str] = None, ip: Optional[str] = None) -> None:
    """(Deprecated) Store a session in user_sessions table.

    We now keep auth session on the browser via HttpOnly cookie.
    This function remains for backward-compat but is best-effort.
    """
    supabase = get_supabase_client()
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    try:
        supabase.table("user_sessions").insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "user_agent": user_agent,
            "ip_address": ip,
            "expires_at": expires_at.isoformat(),
        }).execute()
    except Exception:
        pass


def get_user_sessions(user_id: str) -> list[dict]:
    """Get all active sessions for a user.

    If `user_sessions` table doesn't exist, return empty list.
    """
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("user_sessions")
            .select("id, user_agent, ip_address, created_at, expires_at")
            .eq("user_id", user_id)
            .gte("expires_at", datetime.now(timezone.utc).isoformat())
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []
    except Exception:
        return []


def delete_session(session_id: str, user_id: str) -> dict:
    """Delete a specific session (for logout from specific device).

    If `user_sessions` table doesn't exist, treat as no-op.
    """
    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("user_sessions")
            .delete()
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        return {"deleted": len(result.data) if result.data else 0}
    except Exception:
        return {"deleted": 0}


def delete_all_sessions(user_id: str) -> dict:
    """Delete all sessions for a user (logout from all devices).

    If `user_sessions` table doesn't exist, treat as no-op.
    """
    supabase = get_supabase_client()
    try:
        result = supabase.table("user_sessions").delete().eq("user_id", user_id).execute()
        return {"deleted": len(result.data) if result.data else 0}
    except Exception:
        return {"deleted": 0}


def verify_leader_code(code: str) -> dict:
    """Verify a leader code from the leader_codes table."""
    supabase = get_supabase_client()
    result = (
        supabase.table("leader_codes")
        .select("*")
        .eq("code", code)
        .eq("is_active", True)
        .execute()
    )
    if not result.data:
        return {"valid": False, "reason": "Invalid code"}

    code_row = result.data[0]

    # Check expiration
    expires_at = code_row.get("expires_at")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                return {"valid": False, "reason": "Code expired"}
        except Exception:
            pass

    # Check usage limit
    max_uses = code_row.get("max_uses")
    used_count = code_row.get("used_count", 0)
    if max_uses is not None and used_count >= max_uses:
        return {"valid": False, "reason": "Code usage limit reached"}

    return {"valid": True, "code_id": code_row["id"]}


def deactivate_account(user_id: str, password: str) -> None:
    """Deactivate account after password verification."""
    supabase = get_supabase_client()

    result = supabase.table("app_users").select("password").eq("id", user_id).execute()
    if not result.data:
        raise ValueError("User not found")

    user = result.data[0]
    if not _verify_password(password, user["password"]):
        raise ValueError("Invalid password")

    supabase.table("app_users").update({"is_active": False, "updated_at": "now()"}).eq("id", user_id).execute()
    # Also delete all sessions
    delete_all_sessions(user_id)


def change_password(user_id: str, current_password: str, new_password: str) -> None:
    """Change user password after verifying current password."""
    supabase = get_supabase_client()

    result = supabase.table("app_users").select("password").eq("id", user_id).execute()
    if not result.data:
        raise ValueError("User not found")

    user = result.data[0]
    if not _verify_password(current_password, user["password"]):
        raise ValueError("Current password is incorrect")

    if _verify_password(new_password, user["password"]):
        raise ValueError("New password must be different from current password")

    hashed_pw = _hash_password(new_password)
    supabase.table("app_users").update({"password": hashed_pw, "updated_at": "now()"}).eq("id", user_id).execute()
    delete_all_sessions(user_id)


def reset_password_without_old(email: str, new_password: str) -> None:
    """Reset user password by email without verifying the current password."""
    supabase = get_supabase_client()
    result = supabase.table("app_users").select("id").eq("email", email.lower().strip()).execute()
    if not result.data:
        raise ValueError("Email không tồn tại trong hệ thống")
    user_id = result.data[0]["id"]
    hashed_pw = _hash_password(new_password)
    supabase.table("app_users").update({"password": hashed_pw, "updated_at": "now()"}).eq("id", user_id).execute()
    delete_all_sessions(user_id)


def promote_to_leader(user_id: str, leader_code: str) -> dict:
    """Promote a user to leader role after verifying code."""
    supabase = get_supabase_client()

    code_check = verify_leader_code(leader_code)
    if not code_check.get("valid"):
        raise ValueError(code_check.get("reason", "Invalid code"))

    result = (
        supabase.table("app_users")
        .update({"role": "leader", "updated_at": "now()"})
        .eq("id", user_id)
        .execute()
    )
    if not result.data:
        raise ValueError("User not found")

    code_id = code_check.get("code_id")
    if code_id:
        supabase.table("leader_codes").update({
            "used_count": supabase.table("leader_codes").select("used_count").eq("id", code_id).execute().data[0]["used_count"] + 1
        }).eq("id", code_id).execute()

    return {"user_id": user_id, "role": "leader"}
