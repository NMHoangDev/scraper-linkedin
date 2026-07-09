"""Scheduled comment service — Supabase CRUD + execution logic."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from supabase import Client

from app.core.supabase_client import get_supabase_client
from app.core.logger import get_logger

logger = get_logger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_member_id(email: str) -> Optional[str]:
    supabase: Client = get_supabase_client()
    res = supabase.table("app_users").select("id").eq("email", email).limit(1).execute()
    return res.data[0]["id"] if res.data else None


def _get_member_email_by_id(member_id: str) -> Optional[str]:
    supabase: Client = get_supabase_client()
    res = supabase.table("app_users").select("email").eq("id", member_id).limit(1).execute()
    return res.data[0]["email"] if res.data else None


# ── CRUD ────────────────────────────────────────────────────────────────


def create_scheduled_comment(data: dict, member_email: str) -> dict:
    supabase: Client = get_supabase_client()
    member_id = _get_member_id(member_email)
    if not member_id:
        raise ValueError("Member not found")

    record = {
        "id_post_fb": data.get("id_post_fb"),
        "id_post_li": data.get("id_post_li"),
        "platform": data["platform"],
        "post_url": data["post_url"],
        "group_name": data.get("group_name"),
        "post_content": data.get("post_content"),
        "id_member": member_id,
        "id_social_account": data.get("id_social_account"),
        "comment_content": data.get("comment_content"),
        "ai_generated": data.get("ai_generated", False),
        "scheduled_at": data["scheduled_at"],
        "status": "pending",
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    res = supabase.table("scheduled_comments").insert(record).execute()
    return res.data[0] if res.data else {}


def get_scheduled_comments(member_email: str, filters: dict) -> list:
    supabase: Client = get_supabase_client()
    member_id = _get_member_id(member_email)
    if not member_id:
        return []

    query = supabase.table("scheduled_comments").select("*").eq("id_member", member_id)

    if filters.get("status"):
        query = query.eq("status", filters["status"])
    if filters.get("platform"):
        query = query.eq("platform", filters["platform"])

    page = max(1, filters.get("page", 1))
    limit_val = min(100, max(1, filters.get("limit", 20)))
    offset_val = (page - 1) * limit_val

    query = query.order("scheduled_at", desc=True).range(offset_val, offset_val + limit_val - 1)
    res = query.execute()
    return res.data or []


def update_scheduled_comment(comment_id: str, data: dict, member_email: str) -> dict:
    supabase: Client = get_supabase_client()
    member_id = _get_member_id(member_email)
    if not member_id:
        raise ValueError("Member not found")

    existing = (
        supabase.table("scheduled_comments")
        .select("*")
        .eq("id", comment_id)
        .eq("id_member", member_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise ValueError("Scheduled comment not found")
    if existing.data[0]["status"] != "pending":
        raise ValueError("Only pending comments can be updated")

    patch = {k: v for k, v in data.items() if v is not None}
    patch["updated_at"] = _now_iso()

    allowed = {"comment_content", "id_social_account", "scheduled_at"}
    patch = {k: v for k, v in patch.items() if k in allowed}

    if not patch:
        return existing.data[0]

    res = (
        supabase.table("scheduled_comments")
        .update(patch)
        .eq("id", comment_id)
        .execute()
    )
    return res.data[0] if res.data else {}


def cancel_scheduled_comment(comment_id: str, member_email: str) -> dict:
    supabase: Client = get_supabase_client()
    member_id = _get_member_id(member_email)
    if not member_id:
        raise ValueError("Member not found")

    existing = (
        supabase.table("scheduled_comments")
        .select("*")
        .eq("id", comment_id)
        .eq("id_member", member_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        raise ValueError("Scheduled comment not found")
    if existing.data[0]["status"] not in ("pending", "failed"):
        raise ValueError("Only pending or failed comments can be cancelled")

    res = (
        supabase.table("scheduled_comments")
        .update({"status": "cancelled", "updated_at": _now_iso()})
        .eq("id", comment_id)
        .execute()
    )
    return res.data[0] if res.data else {}


# ── Scheduler ────────────────────────────────────────────────────────────


def get_due_comments() -> list:
    supabase: Client = get_supabase_client()
    now_val = _now_iso()
    res = (
        supabase.table("scheduled_comments")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", now_val)
        .order("scheduled_at", asc=True)
        .limit(10)
        .execute()
    )
    return res.data or []


async def process_comment(record: dict) -> None:
    supabase: Client = get_supabase_client()
    comment_id = record["id"]

    supabase.table("scheduled_comments").update({
        "status": "processing",
        "updated_at": _now_iso(),
    }).eq("id", comment_id).execute()

    try:
        comment_content = record.get("comment_content") or ""

        if record.get("ai_generated") and not comment_content:
            from app.modules.all_platform.services.ai_comment_service import generate_comment
            post_content = record.get("post_content") or ""
            if not post_content:
                raise ValueError("AI-generated comment requires post_content")
            comment_content = await generate_comment(post_content)
            supabase.table("scheduled_comments").update({
                "comment_content": comment_content,
            }).eq("id", comment_id).execute()

        platform = record["platform"]

        if platform == "facebook":
            await _post_facebook_comment(record, comment_content)
        elif platform == "linkedin":
            await _post_linkedin_comment(record, comment_content)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        _save_seeding_mark(supabase, record, comment_content)

        supabase.table("scheduled_comments").update({
            "status": "posted",
            "posted_at": _now_iso(),
            "updated_at": _now_iso(),
        }).eq("id", comment_id).execute()

        logger.info(f"Scheduled comment {comment_id} posted successfully")

    except Exception as exc:
        logger.error(f"Scheduled comment {comment_id} failed: {exc}")
        supabase.table("scheduled_comments").update({
            "status": "failed",
            "error_message": str(exc),
            "updated_at": _now_iso(),
        }).eq("id", comment_id).execute()


async def _post_facebook_comment(record: dict, comment_content: str) -> None:
    from app.modules.facebook.src.core.config.env import Config
    from app.modules.facebook.src.modules.facebook.services.FacebookInteractor import (
        FacebookInteractor,
        InteractionTarget,
    )

    email, password = _get_fb_credentials(record)

    target = InteractionTarget(
        id=record["id"],
        url=record["post_url"],
        reaction_type=None,
        comment_content=comment_content,
    )

    interactor = FacebookInteractor(config=Config)
    await asyncio.to_thread(
        interactor.interact_with_post,
        target=target,
        custom_email=email,
        custom_pass=password,
        custom_2fa="",
    )


def _get_fb_credentials(record: dict) -> tuple[str, str]:
    supabase: Client = get_supabase_client()
    account_id = record.get("id_social_account")
    if account_id:
        res = (
            supabase.table("social_accounts")
            .select("account_email, account_password")
            .eq("id", account_id)
            .limit(1)
            .execute()
        )
        if res.data:
            return res.data[0].get("account_email", ""), res.data[0].get("account_password", "")

    raise ValueError("No Facebook social account configured for this scheduled comment")


async def _post_linkedin_comment(record: dict, comment_content: str) -> None:
    raise NotImplementedError("LinkedIn scheduled comments not yet supported")


def _save_seeding_mark(supabase: Client, record: dict, comment_content: str) -> None:
    member_id = record["id_member"]
    supabase.table("seeding_content_kpi").insert({
        "id_member": member_id,
        "app_user_id": member_id,
        "link_post": record["post_url"],
        "content": comment_content,
        "verify": "pending",
        "platform": record["platform"],
        "current_day": datetime.now(timezone.utc).date().isoformat(),
        "id_social_account": record.get("id_social_account"),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }).execute()
