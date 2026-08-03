"""Internal Engagement (Tương tác nội bộ) — company's own Facebook Page posts
pulled from MarkeeAI, for employees to seed-comment/react on internally."""

from __future__ import annotations

from fastapi import APIRouter

from app.modules.all_platform.schemas import (
    BaseResponse,
    InternalEngagementActionRecordRequest,
    InternalEngagementPost,
    InternalEngagementSummaryRequest,
    MyMarksRequest,
    PostInteractionsRequest,
    TeamTotalsRequest,
    TeamTrendRequest,
)
from app.modules.all_platform.schemas.internal_engagement import AddCustomPostRequest, DebugFetchMetaRequest
from app.modules.all_platform.services import markeeai_client
from app.modules.all_platform.services.markeeai_account_links_service import resolve_markeeai_credentials
from app.modules.all_platform.services.supabase_internal_engagement_kpi_service import (
    get_action_summary,
    get_marks_by_links,
    get_post_interactions,
    get_post_team_counts,
    get_team_daily_trend,
    get_team_totals,
    record_action,
    add_custom_post,       
    get_custom_posts_db,
    debug_fetch_facebook_post_metadata,
)

router = APIRouter()


@router.get("/posts", response_model=BaseResponse)
async def list_posts(page: int = 1, page_size: int = 20, email: str | None = None) -> BaseResponse:
    try:
        # Nếu người gọi có tài khoản MarkeeAI riêng (markeeai_account_links),
        # lấy bài bằng đúng danh tính đó (đúng campaign họ thực sự tham gia).
        # Không có thì rơi về 1 service account dùng chung như trước.
        creds = resolve_markeeai_credentials(email) if email else None
        all_posts = await markeeai_client.get_all_company_posts(creds)
        total = len(all_posts)
        start = max(page - 1, 0) * page_size
        page_items = all_posts[start : start + page_size]

        items = [
            InternalEngagementPost(
                id=p["id"],
                fanpage_id=p["fanpage_id"],
                fanpage_name=p.get("fanpage_name"),
                facebook_post_id=p.get("facebook_post_id"),
                content=p.get("content") or "",
                media_urls=p.get("media_urls") or [],
                permalink_url=p.get("permalink_url"),
                status=p.get("status"),
                created_at=p.get("created_at"),
            ).model_dump()
            for p in page_items
        ]
        return BaseResponse(
            success=True,
            data={"items": items, "total": total, "page": page, "page_size": page_size},
        )
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/add-custom-post", response_model=BaseResponse)
@router.post("/social-posts/import", response_model=BaseResponse)
def create_custom_post(payload: AddCustomPostRequest) -> BaseResponse:
    """API để Frontend gọi lưu link thủ công (nhận url hoặc link_post)"""
    try:
        target_url = payload.url or payload.link_post
        if not target_url or not target_url.strip():
            return BaseResponse(success=False, message="Vui lòng cung cấp link bài viết (url hoặc link_post).")

        fan_name = payload.fanpage_name or payload.page_name
        data = add_custom_post(
            email_member=payload.email,
            link_post=target_url.strip(),
            content=payload.content,
            fanpage_name=fan_name,
            media_urls=payload.media_urls,
            cookie=payload.cookie,
        )
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/custom-posts/debug-fetch", response_model=BaseResponse)
def debug_fetch_meta(payload: DebugFetchMetaRequest) -> BaseResponse:
    """Endpoint dùng cho Postman / Dev test cào OpenGraph metadata từ link Facebook"""
    try:
        data = debug_fetch_facebook_post_metadata(payload.url, cookie=payload.cookie)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.get("/custom-posts", response_model=BaseResponse)
def list_custom_posts(page: int = 1, page_size: int = 20) -> BaseResponse:
    """API lấy danh sách bài thủ công và format giống bài Fanpage để FE dễ dùng"""
    try:
        result = get_custom_posts_db(page, page_size)
        
        items = []
        for p in result["items"]:
            post_url = p.get("link_post") or p.get("post_url") or ""
            fanpage_name = p.get("fanpage_name") or p.get("page_name") or "Markee AI Marketing"
            content = p.get("content") or "Bài viết Facebook được nhân viên chia sẻ thủ công."
            media_urls = p.get("media_urls") or p.get("media_url") or []
            if isinstance(media_urls, str):
                media_urls = [media_urls]
            created_at = p.get("published_at") or p.get("created_at")

            items.append({
                "id": str(p["id"]),
                "platform": p.get("platform", "facebook"),
                "fanpage_id": "custom",
                "fanpage_name": fanpage_name,
                "page_name": fanpage_name,
                "facebook_post_id": "",
                "content": content,
                "media_urls": media_urls,
                "media_url": media_urls,
                "permalink_url": post_url,
                "post_url": post_url,
                "link_post": post_url,
                "status": "published",
                "created_at": str(created_at) if created_at else None,
                "published_at": str(created_at) if created_at else None,
            })
        
        return BaseResponse(
            success=True,
            data={"items": items, "total": result["total"], "page": page, "page_size": page_size},
        )
    except Exception as e:
        return BaseResponse(success=False, message=str(e))

@router.post("/my-marks", response_model=BaseResponse)
def my_marks(payload: MyMarksRequest) -> BaseResponse:
    """Bucket a list of post permalinks into need/received/completed for one employee,
    from the dedicated internal_engagement_kpi table."""
    try:
        marks = get_marks_by_links(payload.email_member, payload.link_posts)
        return BaseResponse(success=True, data={"marks": marks})
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/kpi/record", response_model=BaseResponse)
def record_kpi_action(payload: InternalEngagementActionRecordRequest) -> BaseResponse:
    """Record the final result of one comment/reaction/share attempt made by the
    extension. Called by the extension itself right after it executes an action
    (success or failure), so status/error_message reflect the real outcome."""
    try:
        data = record_action(payload.model_dump(exclude_none=True))
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/kpi/summary", response_model=BaseResponse)
def kpi_summary(payload: InternalEngagementSummaryRequest) -> BaseResponse:
    try:
        data = get_action_summary(
            email_member=payload.email_member,
            date_from=payload.date_from,
            date_to=payload.date_to,
        )
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


# ── Team visibility: admin sees every team, leader sees only their own team ────

@router.get("/kpi/post-team-counts", response_model=BaseResponse)
def post_team_counts(link_post: str, email: str, team_id: str | None = None) -> BaseResponse:
    """Small per-team badge counts shown under a post (e.g. 'Team Sales: 3 tương tác')."""
    try:
        data = get_post_team_counts(link_post=link_post, email=email, team_id=team_id)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/kpi/post-interactions", response_model=BaseResponse)
def post_interactions(payload: PostInteractionsRequest) -> BaseResponse:
    """'Xem tương tác thành viên' modal — detailed list of who did what on this post."""
    try:
        data = get_post_interactions(
            link_post=payload.link_post, email=payload.email, team_id=payload.team_id
        )
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/kpi/team-trend", response_model=BaseResponse)
def team_trend(payload: TeamTrendRequest) -> BaseResponse:
    """Daily interaction series per team — trend/stability chart."""
    try:
        data = get_team_daily_trend(email=payload.email, days=payload.days, team_id=payload.team_id)
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))


@router.post("/kpi/team-totals", response_model=BaseResponse)
def team_totals(payload: TeamTotalsRequest) -> BaseResponse:
    """Per-team totals + stability score (active-days ratio) — ranking chart/table."""
    try:
        data = get_team_totals(
            email=payload.email,
            date_from=payload.date_from,
            date_to=payload.date_to,
            team_id=payload.team_id,
        )
        return BaseResponse(success=True, data=data)
    except Exception as e:
        return BaseResponse(success=False, message=str(e))
