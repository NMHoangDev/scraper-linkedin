"""Đồng bộ like/comment/share cho bài LinkedIn trong Internal Engagement — hoàn toàn
server-side qua Playwright (giống cách Facebook tự cào server-side), không cần browser
extension/trình duyệt của user. Dùng lại account LinkedIn đã đăng ký sẵn (bảng
linkedin_account_crawl) của người tạo bài — không tạo cơ chế Playwright mới, chỉ lắp
ráp lại các hàm login/session/đọc-số-liệu đã có cho luồng crawl group cũ.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone

from app.core.logger import get_logger
from app.core.playwright_browser_pool import _lock_for, run_with_linkedin_session_page
from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.services.supabase_internal_engagement_kpi_service import (
    sync_linkedin_post_engagement_db,
)
from app.modules.all_platform.services.supabase_linkedin_account_service import (
    get_linkedin_account_password,
)
from app.modules.linkedin.services.auth_service import build_session_state_path
from app.modules.linkedin.services.linkedin_engagement_session import (
    ensure_linkedin_session_for_engagement,
)
from app.modules.linkedin.services.linkedin_session_nav import goto_linkedin_url
from app.modules.linkedin.services.parser_service import _extract_metric_by_aria
from app.modules.linkedin.services.sync_progress_service import extract_post_metrics

logger = get_logger(__name__)

# Bấm "Đồng bộ" lại ngay trên 1 bài vừa mới đọc xong -> trả luôn số cũ trong DB,
# không mở Playwright/đăng nhập gì cả (đỡ tốn, đỡ phải chờ).
POST_SYNC_CACHE_SECONDS = 5 * 60

# Mỗi tài khoản LinkedIn chỉ cho phép đăng nhập lại THẬT (force_relogin) tối đa 1 lần
# trong khoảng thời gian này — tránh dồn nhiều lượt login tự động vào 1 tài khoản
# (đây mới là thứ khiến LinkedIn nghi ngờ/hạn chế tài khoản, không phải số lần user click).
ACCOUNT_RELOGIN_COOLDOWN_SECONDS = 15 * 60

# email_linkedin (lowercase) -> timestamp (time.monotonic()) của lần force-relogin gần nhất.
# In-memory, mất khi restart server — chấp nhận được vì đây chỉ là cooldown mềm.
_last_forced_login_at: dict[str, float] = {}
# Khoá riêng chỉ để đọc+ghi _last_forced_login_at atomic (check-then-act) — KHÔNG dùng
# _lock_for(state_path) cho việc này vì lock đó không tái nhập được (threading.Lock
# thường), mà run_with_linkedin_session_page() bên dưới cũng tự khoá theo state_path;
# giữ 2 khoá tách biệt để tránh tự deadlock trong cùng 1 thread.
_cooldown_lock = threading.Lock()


class NoLinkedInAccountError(Exception):
    """Người tạo bài chưa đăng ký tài khoản LinkedIn nào trong linkedin_account_crawl."""


class _StaleLinkedInSessionError(Exception):
    """Session cookie có vẻ hợp lệ (chưa hết hạn theo ngày) nhưng LinkedIn đã âm thầm
    thu hồi phía server — trang hiện ra ở dạng xem-công-khai (không có thanh
    like/comment/share thật), nếu đọc số liệu lúc này sẽ ra toàn 0 sai lệch."""


def _seconds_since_iso(value: str | None) -> float | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds()


def _cached_result_from_post(post: dict) -> dict:
    likes = post.get("fb_total_likes") or 0
    comments = post.get("fb_total_comments") or 0
    shares = post.get("fb_total_shares") or 0
    return {
        **post,
        "public_likes": likes,
        "public_comments": comments,
        "public_shares": shares,
        "synced_at": post.get("last_synced_at"),
        "from_cache": True,
    }


def _post_root(page):
    root = page.locator("main").first
    if root.count() == 0:
        return page
    return root


_GUEST_LOGIN_PROMPT_SELECTOR = "text=/(hãy đăng nhập|sign in to|log in to)/i"
_INTERACTIVE_COMMENT_BUTTON_SELECTOR = 'button[aria-label*="Comment" i], button[aria-label*="bình luận" i]'


def _looks_like_guest_view(page) -> bool:
    """Phát hiện bản xem-công-khai-cho-khách (session đã bị LinkedIn thu hồi phía server)
    thay vì bài thật sự có 0 like/0 comment/0 share (bài mới đăng, chưa ai tương tác).

    Tín hiệu chắc nhất: LinkedIn tự chèn dòng "... hãy đăng nhập" / "sign in to..." thay
    cho khung bình luận thật khi đang ở bản khách. Chỉ dựa vào việc "không thấy thanh
    social-counts" sẽ báo sai bài hợp lệ có 0 tương tác (thanh đó cũng bị ẩn nếu chưa có
    like/comment/share nào), nên chỉ coi thiếu thanh đó là guest-view khi ĐỒNG THỜI cũng
    không có nút bấm tương tác thật (Comment) — nút này luôn render khi đã đăng nhập,
    bất kể số lượng tương tác."""

    root = _post_root(page)
    try:
        if root.locator(_GUEST_LOGIN_PROMPT_SELECTOR).count() > 0:
            return True
    except Exception:
        pass

    try:
        has_counts_bar = root.locator('[class*="social-details-social-counts"]').count() > 0
        has_interactive_button = root.locator(_INTERACTIVE_COMMENT_BUTTON_SELECTOR).count() > 0
        return not has_counts_bar and not has_interactive_button
    except Exception:
        return True


def sync_linkedin_post_engagement_via_playwright(post_id: str) -> dict:
    supabase = get_supabase_client()

    post_res = (
        supabase.table("internal_engagement_custom_posts")
        .select(
            "id,link_post,id_member,is_deleted,last_synced_at,"
            "fb_total_likes,fb_total_comments,fb_total_shares"
        )
        .eq("id", post_id)
        .execute()
    )
    if not post_res.data:
        raise Exception("Không tìm thấy bài viết.")
    post = post_res.data[0]
    if post.get("is_deleted"):
        raise Exception("Bài viết đã bị xóa.")

    age_seconds = _seconds_since_iso(post.get("last_synced_at"))
    if age_seconds is not None and age_seconds < POST_SYNC_CACHE_SECONDS:
        logger.info(
            "[LI-SYNC-PW] post=%s vừa đồng bộ %ds trước -> trả số cũ, không mở Playwright",
            post_id, int(age_seconds),
        )
        return _cached_result_from_post(post)

    id_member = post.get("id_member")
    if not id_member:
        raise NoLinkedInAccountError("Bài viết không xác định được người tạo.")

    link_post = post.get("link_post")
    if not link_post:
        raise Exception("Bài viết không có link LinkedIn hợp lệ.")

    # Nhiều tài khoản LinkedIn cùng 1 người -> lấy account mới thêm nhất.
    acc_res = (
        supabase.table("linkedin_account_crawl")
        .select("email_linkedin")
        .eq("id_member", id_member)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not acc_res.data:
        raise NoLinkedInAccountError("Người tạo bài chưa đăng ký tài khoản LinkedIn nào.")
    email_linkedin = acc_res.data[0]["email_linkedin"]

    password = get_linkedin_account_password(email_linkedin)
    _, state_path = build_session_state_path(session_id=None, email=email_linkedin)
    email_key = email_linkedin.lower()

    def _login(force_relogin: bool) -> None:
        try:
            ensure_linkedin_session_for_engagement(
                email=email_linkedin, password=password, force_relogin=force_relogin
            )
        except RuntimeError as exc:
            raise Exception(f"Không đăng nhập được LinkedIn ({email_linkedin}): {exc}") from exc

    def _read_metrics(page):
        try:
            goto_linkedin_url(page.context, page, link_post, timeout_ms=60000, post_load_wait_ms=3500)
        except RuntimeError as exc:
            # goto_linkedin_url tự phát hiện login/guest/cold-join và raise RuntimeError —
            # coi đây cũng là 1 dạng "session có vẻ đã chết" để cùng chạy qua nhánh
            # force-relogin-rồi-thử-lại bên dưới, không để lọt ra ngoài như lỗi cụt.
            raise _StaleLinkedInSessionError(str(exc)) from exc
        if _looks_like_guest_view(page):
            raise _StaleLinkedInSessionError("guest view (không có thanh social-counts/nút Comment)")
        metrics = extract_post_metrics(page)
        post_root = _post_root(page)
        shares = _extract_metric_by_aria(post_root, "repost") or _extract_metric_by_aria(post_root, "share")
        return metrics["total_reactions"], metrics["total_comments"], shares

    _login(force_relogin=False)
    try:
        likes, comments, shares = run_with_linkedin_session_page(
            state_path=state_path, persist_state=True, action=_read_metrics
        )
    except (_StaleLinkedInSessionError, RuntimeError) as exc:
        # Check-then-act atomic trên _last_forced_login_at: khoá ngắn, chỉ giữ trong lúc
        # đọc+ghi dict, KHÔNG giữ khoá suốt lúc login thật (chậm) — tránh 2 request cùng
        # lúc đều thấy "chưa ai login lại" rồi cùng login thật 2 lần vào 1 tài khoản.
        with _cooldown_lock:
            last_at = _last_forced_login_at.get(email_key)
            cooling_down = last_at is not None and (time.monotonic() - last_at) < ACCOUNT_RELOGIN_COOLDOWN_SECONDS
            if not cooling_down:
                # Đánh dấu "đã tiêu 1 lượt login thật" NGAY LÚC THỬ, không đợi thành công —
                # 1 lượt login thất bại (sai OTP, checkpoint...) vẫn là 1 lượt gửi credentials
                # thật lên LinkedIn, vẫn phải tính vào cooldown để không thử lại dồn dập.
                _last_forced_login_at[email_key] = time.monotonic()

        if cooling_down:
            raise Exception(
                f"Session LinkedIn của {email_linkedin} có vẻ đã hết hạn, nhưng vừa đăng nhập lại "
                f"thật trong {ACCOUNT_RELOGIN_COOLDOWN_SECONDS // 60} phút gần đây — tạm không login "
                "lại nữa để tránh bị LinkedIn để ý (dùng tạm luồng Extension)."
            ) from exc

        logger.info(
            "[LI-SYNC-PW] session %s có vẻ đã bị LinkedIn thu hồi phía server, thử login lại thật",
            email_linkedin,
        )
        # state_path bị ghi đè trực tiếp ở đây (login_and_save_session), KHÔNG đi qua
        # run_with_linkedin_session_page() — khoá theo state_path để không đụng lượt
        # đọc/ghi cookie của 1 request khác đang chạy song song cho cùng tài khoản này.
        with _lock_for(state_path):
            _login(force_relogin=True)
        try:
            likes, comments, shares = run_with_linkedin_session_page(
                state_path=state_path, persist_state=True, action=_read_metrics
            )
        except (_StaleLinkedInSessionError, RuntimeError) as exc2:
            raise Exception(
                f"LinkedIn trả về trang xem-công-khai cho {email_linkedin} dù đã đăng nhập lại — "
                "có thể tài khoản đang bị LinkedIn hạn chế truy cập tự động."
            ) from exc2

    logger.info(
        "[LI-SYNC-PW] post=%s email=%s likes=%s comments=%s shares=%s",
        post_id, email_linkedin, likes, comments, shares,
    )
    return sync_linkedin_post_engagement_db(post_id, likes=likes, comments=comments, shares=shares)
