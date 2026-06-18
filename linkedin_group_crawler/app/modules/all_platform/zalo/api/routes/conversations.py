import asyncio
import os
import posixpath
import tempfile
import shutil
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import re
from loguru import logger

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel, Field

from app.modules.all_platform.zalo.api.security import verify_zalo_api_key
from app.modules.all_platform.zalo.schemas.library import (
    ZaloConversationListResponse,
    ZaloConversationSummary,
    ZaloLibraryListResponse,
    ZaloLibraryMessage,
)
from app.modules.all_platform.zalo.schemas.message import Message
from app.modules.all_platform.zalo.services.supabase_service import (
    SupabaseNotConfigured,
    _rest,
    list_conversation_messages,
    list_conversations,
    save_listener_messages,
    save_global_listener_messages,
    upsert_groups,
    upsert_group,
    mark_conversation_as_read,
    resolve_thread_type,
)
from app.modules.all_platform.zalo.services.zca_auth_store import load_zca_auth
from app.modules.all_platform.zalo.services.zca_api_bridge import (
    ZcaAuthExpiredError,
    find_zca_user_by_phone,
    find_zca_user_by_username,
    get_zca_group_history,
    list_zca_groups,
    list_zca_friends,
    send_zca_message,
    send_zca_images,
    sync_zca_group_old_messages,
    remove_zca_unread_mark,
)
from app.core.phone import vn_phone_to_e164

router = APIRouter(
    prefix="/conversations",
    tags=["zalo-conversations"],
    dependencies=[Depends(verify_zalo_api_key)],
)

# Thông báo chuẩn khi phiên Zalo hết hạn — FE dựa vào status 401 + code này để hiện CTA login lại.
ZCA_SESSION_EXPIRED_DETAIL = {
    "code": "zca_session_expired",
    "message": "Phiên đăng nhập Zalo đã hết hạn. Vui lòng đăng nhập lại bằng mã QR.",
}


def _normalize_user_id(value: Optional[str]) -> str:
    raw = (value or "default").strip().lower()
    raw = re.sub(r"[^a-z0-9._-]+", "-", raw).strip("-._")
    return raw or "default"


class SyncRecentRequest(BaseModel):
    account_id: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    messages_per_conversation: int = Field(default=50, ge=1, le=200)


class SyncRecentGroupResult(BaseModel):
    group_id: str
    group_name: str
    messages_saved: int = 0
    status: str
    error: Optional[str] = None


class SyncRecentResponse(BaseModel):
    account_id: str
    scanned: int = 0
    groups_with_messages: int = 0
    messages_saved: int = 0
    errors: int = 0
    results: List[SyncRecentGroupResult] = Field(default_factory=list)


@router.get("", response_model=ZaloConversationListResponse)
async def get_conversations(
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
    limit: int = Query(500, ge=1, le=2000),
):
    user_id = _normalize_user_id(account_id or x_user_id)
    try:
        rows = await list_conversations(user_id, limit=limit)
        return {
            "account_id": user_id,
            "conversations": [ZaloConversationSummary(**row) for row in rows],
            "total": len(rows),
        }
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể tải danh sách hội thoại Zalo: {exc}")


@router.post("/sync-recent", response_model=SyncRecentResponse)
async def sync_recent_conversations(
    body: SyncRecentRequest,
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    user_id = _normalize_user_id(body.account_id or x_user_id)
    auth = await load_zca_auth(user_id)
    if not auth:
        raise HTTPException(status_code=401, detail="No persisted ZCA auth found for this account")

    # Tải siêu dữ liệu các nhóm hiện tại từ DB để so sánh thời gian tin nhắn cuối
    # PHẢI tải trước khi gọi upsert_groups để lấy được last_message_at CŨ
    existing_meta = {}
    try:
        from app.modules.all_platform.zalo.services.supabase_service import _rest
        rows = await _rest(
            "GET",
            "zalo_groups",
            params={
                "select": "group_id,last_message_at,unread_count",
                "user_id": f"eq.{user_id}",
            }
        ) or []
        existing_meta = {
            r["group_id"]: {
                "last_message_at": r.get("last_message_at"),
                "unread_count": int(r.get("unread_count") or 0)
            }
            for r in rows
        }
    except Exception as exc:
        logger.warning(f"Could not load existing group metadata for sync check: {exc}")

    try:
        # 1. Fetch all groups and friends and upsert them to zalo_groups
        groups = await list_zca_groups(auth)
        friends = await list_zca_friends(auth)
        all_chats = groups + friends
        await upsert_groups(user_id, [chat.model_dump() for chat in all_chats])
    except ZcaAuthExpiredError:
        raise HTTPException(status_code=401, detail=ZCA_SESSION_EXPIRED_DETAIL)
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        err_msg = str(exc).lower()
        if "429" in err_msg or "too many" in err_msg or "rate limit" in err_msg:
            raise HTTPException(
                status_code=429,
                detail="Zalo đang giới hạn tốc độ yêu cầu (quá nhiều thao tác). Vui lòng đợi 1-2 phút rồi thử lại."
            )
        raise HTTPException(status_code=500, detail=f"Không thể tải danh sách hội thoại Zalo: {exc}")

    groups_to_sync = []
    skipped_results: List[SyncRecentGroupResult] = []

    for group in groups:
        meta = existing_meta.get(group.group_id)
        if not meta:
            groups_to_sync.append(group)
            continue
        if meta.get("unread_count", 0) > 0 or group.unread_count > 0:
            groups_to_sync.append(group)
            continue
        db_ts_str = meta.get("last_message_at")
        api_ts_str = group.last_message_at
        if not db_ts_str or not api_ts_str:
            groups_to_sync.append(group)
            continue
        try:
            from app.modules.all_platform.zalo.services.zca_persistent_listener import _timestamp_ms
            db_ms = _timestamp_ms(db_ts_str)
            api_ms = _timestamp_ms(api_ts_str)
            if api_ms > db_ms:
                groups_to_sync.append(group)
            else:
                skipped_results.append(
                    SyncRecentGroupResult(
                        group_id=group.group_id,
                        group_name=group.name,
                        messages_saved=0,
                        status="skipped",
                    )
                )
        except Exception:
            groups_to_sync.append(group)

    # Also sync personal chat threads (friends) — bug fix: previously only `groups` were processed.
    # Personal chats have no unread_count concept via ZCA list API, so always sync friends.
    friends_to_sync: List[Any] = []
    friends_skipped: List[SyncRecentGroupResult] = []
    for friend in friends:
        meta = existing_meta.get(friend.group_id)
        if not meta:
            friends_to_sync.append(friend)
            continue
        db_ts_str = meta.get("last_message_at")
        api_ts_str = friend.last_message_at
        if not db_ts_str or not api_ts_str:
            friends_to_sync.append(friend)
            continue
        try:
            from app.modules.all_platform.zalo.services.zca_persistent_listener import _timestamp_ms
            db_ms = _timestamp_ms(db_ts_str)
            api_ms = _timestamp_ms(api_ts_str)
            if api_ms > db_ms:
                friends_to_sync.append(friend)
            else:
                friends_skipped.append(
                    SyncRecentGroupResult(
                        group_id=friend.group_id,
                        group_name=friend.name,
                        messages_saved=0,
                        status="skipped",
                    )
                )
        except Exception:
            friends_to_sync.append(friend)

    results: List[SyncRecentGroupResult] = []
    total_saved = 0
    groups_with_messages = 0
    errors = 0

    per_group_count = max(20, min(body.messages_per_conversation, 200))
    semaphore = asyncio.Semaphore(4)

    async def _sync_one_group(group) -> SyncRecentGroupResult:
        async with semaphore:
            try:
                thread_type = 0 if getattr(group, "is_friend", False) else 1
                messages = await sync_zca_group_old_messages(
                    auth,
                    group.group_id,
                    thread_type=thread_type,
                    count=per_group_count,
                )
                if not messages and thread_type == 1:
                    messages = await sync_zca_group_old_messages(
                        auth,
                        group.group_id,
                        thread_type=0,
                        count=per_group_count,
                    )
                if not messages:
                    return SyncRecentGroupResult(
                        group_id=group.group_id,
                        group_name=group.name,
                        messages_saved=0,
                        status="empty",
                    )
                saved = await save_listener_messages(
                    user_id,
                    group.group_id,
                    group.name,
                    messages,
                    increment_unread=False,
                )
                return SyncRecentGroupResult(
                    group_id=group.group_id,
                    group_name=group.name,
                    messages_saved=saved,
                    status="has_messages" if saved else "empty",
                )
            except Exception as exc:
                logger.warning(f"sync-recent failed for group={group.group_id}: {exc}")
                return SyncRecentGroupResult(
                    group_id=group.group_id,
                    group_name=group.name,
                    messages_saved=0,
                    status="error",
                    error=str(exc),
                )

    sync_results = await asyncio.gather(*[_sync_one_group(group) for group in groups_to_sync])
    friends_results = await asyncio.gather(*[_sync_one_group(friend) for friend in friends_to_sync])
    results = skipped_results + list(sync_results) + list(friends_results)

    for item in results:
        total_saved += item.messages_saved
        if item.messages_saved > 0:
            groups_with_messages += 1
        if item.status == "error":
            errors += 1

    return SyncRecentResponse(
        account_id=user_id,
        scanned=len(groups) + len(friends),
        groups_with_messages=groups_with_messages,
        messages_saved=total_saved,
        errors=errors,
        results=list(results),
    )





async def _background_sync_conversation_messages(account_id: str, conversation_id: str):
    """Background sync: dùng group-history thay vì sync-old-messages để tránh lỗi getOwnId null."""
    from app.modules.all_platform.zalo.services.zca_auth_store import load_zca_auth
    from app.modules.all_platform.zalo.services.zca_api_bridge import get_zca_group_history
    from app.modules.all_platform.zalo.services.supabase_service import save_listener_messages, _rest
    try:
        auth = await load_zca_auth(account_id)
        if not auth: return

        # Resolve group_name từ Supabase trước khi dùng conversation_id.
        group_name = conversation_id
        try:
            rows = await _rest(
                "GET",
                "zalo_groups",
                params={
                    "select": "group_name",
                    "user_id": f"eq.{account_id}",
                    "group_id": f"eq.{conversation_id}",
                    "limit": "1",
                },
            ) or []
            if rows and rows[0].get("group_name"):
                resolved = str(rows[0]["group_name"]).strip()
                if resolved and not resolved.startswith("Conversation ") and resolved != conversation_id:
                    group_name = resolved
        except Exception:
            pass  # Fallback vẫn dùng conversation_id

        # Chạy sync_zca_group_old_messages để đồng bộ tin nhắn
        ttype = await resolve_thread_type(account_id, conversation_id)
        messages = await sync_zca_group_old_messages(
            auth, 
            conversation_id, 
            thread_type=ttype, 
            count=50
        )
        if not messages and ttype == 1:
            messages = await sync_zca_group_old_messages(
                auth, 
                conversation_id, 
                thread_type=0, 
                count=50
            )
        if messages:
            await save_listener_messages(
                user_id=account_id,
                group_id=conversation_id,
                group_name=group_name,
                messages=messages,
                increment_unread=False,
            )
    except Exception as exc:
        logger.warning(f"Could not background sync messages for {conversation_id}: {exc}")

@router.get("/{conversation_id}/messages", response_model=ZaloLibraryListResponse)
async def get_conversation_messages(
    conversation_id: str,
    background_tasks: BackgroundTasks,
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    user_id = _normalize_user_id(account_id or x_user_id)
    
    # User requested to NOT auto-sync old messages on load. 
    # They will click the sync button manually if needed.
    # if offset == 0:
    #     background_tasks.add_task(_background_sync_conversation_messages, user_id, conversation_id)
        
    try:
        rows, total = await list_conversation_messages(
            user_id,
            conversation_id,
            limit=limit,
            offset=offset,
        )
        return {
            "messages": [ZaloLibraryMessage(**row) for row in rows],
            "groups": [],
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(rows) < total,
        }
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể tải tin nhắn hội thoại Zalo: {exc}")


class SendMessageRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Nội dung tin nhắn văn bản")
    thread_type: Optional[int] = Field(
        None,
        description="0 = cá nhân, 1 = nhóm. Nếu để trống, tự suy ra từ conversation_id.",
    )


class SendMessageResponse(BaseModel):
    ok: bool
    conversation_id: str
    message: str = ""


@router.post("/{conversation_id}/send", response_model=SendMessageResponse)
async def send_message_to_conversation(
    conversation_id: str,
    body: SendMessageRequest,
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    """Gửi tin nhắn văn bản trực tiếp vào một hội thoại Zalo qua ZCA API.

    - ``conversation_id`` là ID group hoặc thread cá nhân trong Supabase.
    - Nếu ``thread_type`` không được chỉ指定, endpoint tự suy ra:
      số nguyên thuần túy → nhóm (type=1), còn lại → cá nhân (type=0).
    - Sau khi Zalo xác nhận gửi thành công, message sẽ được lưu vào Supabase để
      hiển thị ngay trong lịch sử chat (kể cả khi listener chưa kịp echo về).
    """
    user_id = _normalize_user_id(account_id or x_user_id)
    auth = await load_zca_auth(user_id)
    if not auth:
        raise HTTPException(
            status_code=401,
            detail="Chưa có phiên ZCA hợp lệ. Hãy đăng nhập Zalo bằng QR trước.",
        )

    # Infer thread_type from conversation_id when not explicitly provided
    if body.thread_type is not None:
        thread_type = body.thread_type
    else:
        thread_type = await resolve_thread_type(user_id, conversation_id.strip())

    try:
        result = await send_zca_message(
            auth,
            conversation_id.strip(),
            body.text.strip(),
            thread_type=thread_type,
        )
    except ZcaAuthExpiredError:
        raise HTTPException(status_code=401, detail=ZCA_SESSION_EXPIRED_DETAIL)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Không thể gửi tin nhắn: {exc}")

    # Persist sent message vào Supabase — zca-js chỉ trả về msgId (không có sender/timestamp)
    # nên ta tạo Message tối thiểu với is_sent=True, listener sẽ tự merge khi echo về.
    api_payload = result.get("response") if isinstance(result, dict) else None
    await _persist_outgoing_message(
        user_id,
        conversation_id.strip(),
        api_payload,
        content=body.text.strip(),
        message_type="text",
    )

    return SendMessageResponse(
        ok=True,
        conversation_id=conversation_id,
        message=result.get("message") or "Đã gửi tin nhắn thành công",
    )


@router.post("/{conversation_id}/send-media", response_model=SendMessageResponse)
async def send_media_to_conversation(
    conversation_id: str,
    text: Optional[str] = Form(None),
    thread_type: Optional[int] = Form(None),
    files: List[UploadFile] = File(...),
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    """Gửi hình ảnh hoặc tài liệu kèm chữ vào một hội thoại Zalo qua ZCA API."""
    user_id = _normalize_user_id(account_id or x_user_id)
    auth = await load_zca_auth(user_id)
    if not auth:
        raise HTTPException(
            status_code=401,
            detail="Chưa có phiên ZCA hợp lệ. Hãy đăng nhập Zalo bằng QR trước.",
        )

    if thread_type is not None:
        ttype = thread_type
    else:
        ttype = await resolve_thread_type(user_id, conversation_id.strip())

    temp_paths: List[str] = []
    try:
        for file in files:
            orig_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
            fd, path = tempfile.mkstemp(prefix="zalo-zca-upload-", suffix=orig_ext)
            content = await file.read()
            with os.fdopen(fd, "wb") as tmp:
                tmp.write(content)
            temp_paths.append(path)

        try:
            result = await send_zca_images(
                auth,
                conversation_id.strip(),
                temp_paths,
                text=text.strip() if text else "",
                thread_type=ttype,
            )
        except ZcaAuthExpiredError:
            raise HTTPException(status_code=401, detail=ZCA_SESSION_EXPIRED_DETAIL)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Không thể gửi file: {exc}")

        # Upload ảnh đã gửi lên Supabase storage để hiển thị trong lịch sử chat
        # (zca-js không trả URL persistent, chỉ trả msgId).
        uploaded_urls: List[str] = []
        try:
            from app.modules.all_platform.zalo.services.supabase_service import (
                _download_image,
                upload_asset_bytes,
            )
            for idx, path in enumerate(temp_paths):
                try:
                    with open(path, "rb") as f:
                        file_bytes = f.read()
                    # Lấy extension từ file gốc
                    orig_name = files[idx].filename if idx < len(files) else None
                    ext = os.path.splitext(orig_name or path)[1] or ".jpg"
                    content_type = "image/jpeg"
                    if ext.lower() in {".png"}:
                        content_type = "image/png"
                    elif ext.lower() in {".webp"}:
                        content_type = "image/webp"
                    elif ext.lower() in {".gif"}:
                        content_type = "image/gif"
                    storage_path = posixpath.join(
                        user_id,
                        "outgoing",
                        f"{uuid.uuid4().hex}{ext}",
                    )
                    url = await upload_asset_bytes(storage_path, file_bytes, content_type)
                    uploaded_urls.append(url)
                except Exception as exc:
                    logger.warning(f"Could not persist outgoing Zalo image {path}: {exc}")
        except Exception as exc:
            logger.warning(f"Could not import supabase helpers for media upload: {exc}")

        # Lưu message đã gửi vào Supabase
        api_payload = result.get("response") if isinstance(result, dict) else None
        await _persist_outgoing_message(
            user_id,
            conversation_id.strip(),
            api_payload,
            content=text.strip() if text else "",
            message_type="image",
            image_urls=uploaded_urls,
        )

        return SendMessageResponse(
            ok=True,
            conversation_id=conversation_id,
            message=result.get("message") or "Đã gửi file thành công",
        )
    finally:
        for path in temp_paths:
            try:
                os.remove(path)
            except OSError:
                pass


class MarkReadResponse(BaseModel):
    ok: bool
    conversation_id: str
    message: str = ""


async def _background_remove_zca_unread(user_id: str, conversation_id: str, thread_type: int):
    auth = await load_zca_auth(user_id)
    if auth:
        try:
            await remove_zca_unread_mark(auth, conversation_id, thread_type=thread_type)
        except Exception as exc:
            logger.warning(f"Could not remove unread mark on Zalo for user={user_id} conversation={conversation_id}: {exc}")


@router.post("/{conversation_id}/read", response_model=MarkReadResponse)
async def mark_conversation_read(
    conversation_id: str,
    background_tasks: BackgroundTasks,
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    """Đánh dấu hội thoại là đã đọc. Cập nhật trong Supabase và thông báo ZCA (nếu đăng nhập)."""
    user_id = _normalize_user_id(account_id or x_user_id)
    
    # 1. Update in Supabase
    try:
        await mark_conversation_as_read(user_id, conversation_id.strip())
    except Exception as exc:
        logger.warning(f"Could not update unread count in Supabase for user={user_id} conversation={conversation_id}: {exc}")

    # 2. Inform Zalo via ZCA if auth is available (trong background để tránh treo request)
    thread_type = await resolve_thread_type(user_id, conversation_id.strip())
    background_tasks.add_task(_background_remove_zca_unread, user_id, conversation_id.strip(), thread_type)

    return MarkReadResponse(
        ok=True,
        conversation_id=conversation_id,
        message="Hội thoại đã được đánh dấu là đã đọc"
    )


# --------------------------------------------------------------------------------------
# Helpers: lưu tin nhắn gửi đi vào Supabase
# --------------------------------------------------------------------------------------

async def _resolve_group_name(user_id: str, group_id: str) -> str:
    """Lấy group_name từ bảng zalo_groups; fallback về group_id nếu chưa có."""
    try:
        rows = await _rest(
            "GET",
            "zalo_groups",
            params={
                "select": "group_name",
                "user_id": f"eq.{user_id}",
                "group_id": f"eq.{group_id}",
                "limit": "1",
            },
        ) or []
        if rows and rows[0].get("group_name"):
            return str(rows[0]["group_name"])
    except Exception as exc:
        logger.warning(f"Could not resolve group_name for group={group_id}: {exc}")
    return group_id


def _build_outgoing_message_id(api_response: Optional[Dict[str, Any]], conversation_id: str = "") -> str:
    """Tạo source_message_id ổn định từ response của zca-js.

    QUAN TRỌNG — DEDUP CONTRACT:
    - zca-js trả về `{ message: { msgId: number } | null, attachment: [{ msgId }, ...] }`.
    - Khi Zalo echo lại tin nhắn mình vừa gửi, ZCA persistent listener (Node.js)
      cũng sẽ emit event với cùng `msgId` thuần (xem scripts/zca_persistent_listener.js
      dòng 178-186: `data.msgId || data.cliMsgId || ...`).
    - Vì cả 2 path (gửi từ tool + echo từ listener) đều lưu vào bảng
      zalo_messages với unique key `(user_id, group_id, source_message_id)`,
      ta BẮT BUỘC dùng CÙNG format source_message_id để DB upsert theo conflict
      thay vì insert duplicate row. Sai format → hiển thị 2 bản sao trên UI.

    Format chuẩn: msgId thuần dạng số (vd: "1234567890123456789").
    Fallback khi ZCA không trả msgId: sinh UUID local để có primary key
    tạm thời; khi listener echo về (có msgId thật), DB sẽ tạo row mới với
    msgId làm key — 2 row tồn tại song song cho đến khi listener merge.
    Vì listener thường echo về < 1s, duplicate ở trường hợp fallback
    rất hiếm và tự hết khi user refresh.

    `conversation_id` KHÔNG đưa vào msgId nữa vì listener không thêm prefix —
    việc trùng msgId giữa 2 thread khác nhau là gần như không thể (ZCA's msgId
    là ID toàn cục, không phải per-thread).
    """
    if api_response and isinstance(api_response, dict):
        msg_obj = api_response.get("message")
        if isinstance(msg_obj, dict) and msg_obj.get("msgId") is not None:
            return str(int(msg_obj["msgId"]))
        attachments = api_response.get("attachment")
        if isinstance(attachments, list) and attachments:
            first = attachments[0]
            if isinstance(first, dict) and first.get("msgId") is not None:
                return str(int(first["msgId"]))
    safe_cid = re.sub(r"[^a-zA-Z0-9_-]+", "-", (conversation_id or "").strip())[:32] or "thread"
    return f"local-{safe_cid}-{uuid.uuid4().hex}"


async def _persist_outgoing_message(
    user_id: str,
    conversation_id: str,
    api_response: Optional[Dict[str, Any]],
    *,
    content: str,
    message_type: str = "text",
    image_urls: Optional[List[str]] = None,
) -> None:
    """Lưu message gửi đi vào Supabase để hiển thị ngay trong chat history.

    - Nếu response chứa msgId → dùng làm source_message_id (khi Zalo echo về sẽ merge).
    - Nếu không có → tạo UUID local; listener sẽ thay thế bằng dữ liệu thật khi có.
    - Tự update last_message_* trên zalo_groups để sidebar preview tươi ngay.
    """
    source_id = _build_outgoing_message_id(api_response, conversation_id)
    # Lưu UTC (chuẩn industry). Frontend sẽ convert sang Asia/Ho_Chi_Minh khi hiển thị.
    # Dùng timezone.utc thay vì utcnow() vì:
    #   1) utcnow() bị deprecated từ Python 3.12
    #   2) now(timezone.utc) trả về datetime **aware** → tránh nhầm lẫn với local time
    now_utc = datetime.now(timezone.utc)
    now_ms = int(now_utc.timestamp() * 1000)
    now_iso = now_utc.isoformat().replace("+00:00", "Z")
    safe_content = (content or "").strip() or None
    safe_image_urls = [url for url in (image_urls or []) if url]
    resolved_type = "image" if safe_image_urls and not safe_content else message_type
    if safe_image_urls and safe_content:
        resolved_type = "image"  # type đính kèm chữ vẫn là image
    elif safe_image_urls:
        resolved_type = "image"

    message = Message(
        message_id=source_id,
        sender_id=None,
        sender_name="Bạn",
        timestamp=str(now_ms),
        time_text=now_iso,
        type=resolved_type,
        content=safe_content,
        image_urls=safe_image_urls,
        is_sent=True,
        is_deleted=False,
        group_id=conversation_id,
    )

    group_name = await _resolve_group_name(user_id, conversation_id)

    try:
        # Cập nhật metadata group để sidebar hiển thị ngay tin mới nhất
        await upsert_group(
            user_id=user_id,
            group_id=conversation_id,
            group_name=group_name,
            last_message_at=now_iso,
            last_message_content=safe_content or (safe_image_urls[0] if safe_image_urls else None),
            last_sender_id=None,
            last_sender_name="Bạn",
            last_message_type=resolved_type,
        )
    except Exception as exc:
        logger.warning(f"Could not upsert group metadata after send for user={user_id} conv={conversation_id}: {exc}")

    try:
        await save_listener_messages(
            user_id,
            conversation_id,
            group_name,
            [message],
            increment_unread=False,
        )
    except Exception as exc:
        # Không làm fail cả request gửi — Zalo đã nhận, chỉ là lưu local lỗi.
        logger.warning(
            f"Could not persist outgoing message to Supabase for user={user_id} conv={conversation_id}: {exc}"
        )


# ──────────────────────────────────────────────────────────────────────────────
# Tìm user lạ (chưa từng chat) bằng SĐT hoặc username Zalo.
# Sau khi tìm thấy, FE dùng endpoint POST /conversations/users để tạo thread
# (insert vào zalo_groups) rồi mở khung chat như thread bình thường.
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/users/find")
async def find_zalo_user(
    q: str = Query(..., min_length=8, max_length=32, description="SĐT VN (08x/09x...) hoặc username Zalo"),
    by: str = Query("phone", pattern="^(phone|username)$", description="Loại tìm kiếm: phone | username"),
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    """Tìm một user Zalo bằng SĐT (E.164) hoặc username.

    - Input ``q`` ở dạng SĐT VN bất kỳ (0839108906, +84939108906, 0084...) — backend tự
      chuẩn hoá về E.164 trước khi gọi ``zca-js.findUser``.
    - Input ``q`` ở dạng username Zalo thì truyền ``by=username``.

    Trả 404 nếu ZCA không tìm thấy (chưa đăng ký Zalo / không nhận tin từ người lạ).
    """
    user_id = _normalize_user_id(account_id or x_user_id)
    auth = await load_zca_auth(user_id)
    if not auth:
        raise HTTPException(
            status_code=401,
            detail="Chưa có phiên ZCA hợp lệ. Hãy đăng nhập Zalo bằng QR trước.",
        )

    raw = q.strip()
    if by == "phone":
        e164 = vn_phone_to_e164(raw)
        if not e164:
            raise HTTPException(
                status_code=400,
                detail="SĐT không hợp lệ. VD: 0839108906, +84939108906, 0084 939 108 906",
            )
        try:
            user = await find_zca_user_by_phone(auth, e164)
        except ZcaAuthExpiredError:
            raise HTTPException(status_code=401, detail=ZCA_SESSION_EXPIRED_DETAIL)
        except RuntimeError as exc:
            err = str(exc).lower()
            # ZCA thường trả lỗi -111 hoặc "user not found" khi SĐT không có Zalo.
            if "-111" in err or "not found" in err or "không tìm" in err:
                raise HTTPException(
                    status_code=404,
                    detail="SĐT này chưa đăng ký Zalo, hoặc user đã tắt nhận tin nhắn từ người lạ.",
                )
            if "rate" in err or "too many" in err or "limit" in err:
                raise HTTPException(status_code=429, detail="Zalo đang giới hạn tốc độ. Thử lại sau vài giây.")
            raise HTTPException(status_code=500, detail=f"findUser thất bại: {exc}")
    else:
        # by == 'username'
        if not raw or len(raw) < 2:
            raise HTTPException(status_code=400, detail="Username Zalo tối thiểu 2 ký tự.")
        try:
            user = await find_zca_user_by_username(auth, raw)
        except ZcaAuthExpiredError:
            raise HTTPException(status_code=401, detail=ZCA_SESSION_EXPIRED_DETAIL)
        except RuntimeError as exc:
            err = str(exc).lower()
            if "-111" in err or "not found" in err or "không tìm" in err:
                raise HTTPException(
                    status_code=404,
                    detail="Username Zalo không tồn tại, hoặc user đã tắt nhận tin nhắn từ người lạ.",
                )
            raise HTTPException(status_code=500, detail=f"findUserByUsername thất bại: {exc}")

    if not user or not user.get("userId"):
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy user Zalo. Có thể user đã tắt nhận tin nhắn từ người lạ.",
        )

    user_id_zalo = str(user.get("userId"))
    return {
        "user_id": user_id_zalo,
        "display_name": user.get("displayName") or user.get("zaloName") or user_id_zalo,
        "zalo_name": user.get("zaloName") or None,
        "avatar_url": user.get("avatar") or user.get("avatarUrl") or None,
        "phone_e164": e164 if by == "phone" else None,
        "raw": user,
    }


class CreateUserThreadRequest(BaseModel):
    user_id: str = Field(..., min_length=4, description="Zalo userId từ /users/find")
    display_name: str = Field(..., min_length=1, description="Tên hiển thị để show trong sidebar")
    avatar_url: Optional[str] = None


@router.post("/users/threads", response_model=Dict[str, Any])
async def create_user_thread(
    body: CreateUserThreadRequest,
    account_id: Optional[str] = Query(None),
    x_user_id: str = Header("default", alias="X-User-ID"),
):
    """Tạo (hoặc trả về) thread chat với một user lạ trong ``zalo_groups``.

    Idempotent: nếu thread đã tồn tại thì chỉ update ``group_name`` / ``avatar_url``.
    Sau khi gọi endpoint này, FE chỉ cần select conversation_id == user_id để mở khung chat
    rồi gọi ``POST /conversations/{id}/send`` như thread bình thường (backend tự suy
    ``thread_type=0`` vì userId Zalo không bắt đầu bằng 'g').
    """
    user_id = _normalize_user_id(account_id or x_user_id)
    target_user_id = body.user_id.strip()
    if not target_user_id or not target_user_id.isdigit():
        raise HTTPException(
            status_code=400,
            detail="user_id phải là chuỗi chữ số thuần (Zalo userId).",
        )

    try:
        await upsert_group(
            user_id=user_id,
            group_id=target_user_id,
            group_name=body.display_name.strip() or f"User {target_user_id}",
            avatar_url=body.avatar_url,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Không thể tạo thread với user: {exc}",
        )

    return {
        "ok": True,
        "conversation_id": target_user_id,
        "user_id": user_id,
        "display_name": body.display_name.strip(),
        "thread_type": 0,
    }



