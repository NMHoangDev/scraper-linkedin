"""API dashboard cho hàng đợi cào Facebook đa VPS (khác với `fb_account_pool.py`/
`crawl_queue.py` -- 2 file đó dùng x-api-key cho EXTENSION gọi; router này dùng JWT
thật cho NHÂN VIÊN xem qua trình duyệt).

Gồm 2 nhóm:
- `/facebook/crawl-accounts`: nhân viên tự quản lý acc Facebook của chính mình trong
  pool `crawl_fb_accounts` (liệt kê, ngắt kết nối).
- `/facebook/crawl-queue/overview`: xem nhanh sức khoẻ hàng đợi (đếm job/acc theo
  trạng thái, danh sách worker, job gần nhất) -- dữ liệu vận hành chung, không riêng
  tư theo nhân viên, ai đã đăng nhập dashboard cũng xem được.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.modules.all_platform.schemas import BaseResponse
from app.modules.all_platform.services import decode_token, get_user_by_id
from app.modules.all_platform.services import supabase_fb_account_pool_service as pool_service
from app.modules.all_platform.services import supabase_crawl_queue_service as queue_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_user_from_header(authorization: Optional[str], request: Optional[Request] = None) -> dict:
    """Giải mã Bearer token / cookie phiên đăng nhập dashboard -- cùng pattern với
    `fb_inbox_accounts.py` (không dùng x-api-key của extension ở đây)."""
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

    try:
        user = get_user_by_id(user_id)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Auth service temporarily unavailable") from exc

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@router.get("/crawl-accounts", response_model=BaseResponse)
def list_my_crawl_accounts(request: Request, authorization: Optional[str] = Header(None)) -> BaseResponse:
    """Danh sách acc Facebook trong pool thuộc về chính nhân viên đang đăng nhập."""
    user = _get_user_from_header(authorization, request)
    accounts = pool_service.list_accounts_for_member(user["id"])
    return BaseResponse(success=True, message="Success", data={"accounts": accounts})


@router.delete("/crawl-accounts/{account_id}", response_model=BaseResponse)
def disconnect_my_crawl_account(
    account_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
) -> BaseResponse:
    """Ngắt kết nối 1 acc của chính nhân viên đang đăng nhập (đánh 'invalid')."""
    user = _get_user_from_header(authorization, request)
    ok = pool_service.disconnect_account(account_id, user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy acc này thuộc về bạn.")
    return BaseResponse(success=True, message="Đã ngắt kết nối tài khoản.")


@router.get("/crawl-queue/overview", response_model=BaseResponse)
def crawl_queue_overview(request: Request, authorization: Optional[str] = Header(None)) -> BaseResponse:
    """Tổng quan sức khoẻ hàng đợi cào đa VPS -- đếm job/acc theo trạng thái, danh sách
    worker, job gần nhất. Dữ liệu vận hành chung, mọi nhân viên đã đăng nhập đều xem được."""
    _get_user_from_header(authorization, request)  # chỉ cần đăng nhập hợp lệ, không cần lọc quyền
    return BaseResponse(
        success=True,
        message="Success",
        data={
            "job_counts": queue_service.get_job_status_counts(),
            "account_counts": pool_service.get_account_status_counts(),
            "workers": queue_service.list_workers(),
            "recent_jobs": queue_service.get_recent_jobs(limit=20),
        },
    )
