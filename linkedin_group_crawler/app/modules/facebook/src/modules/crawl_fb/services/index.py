import logging
import asyncio
import os
import time
from typing import Any

from typing import List, Optional
from fastapi import HTTPException, status 
from fastapi.concurrency import run_in_threadpool
from app.modules.facebook.src.modules.crawl_fb.schemas.crawl_schema import CrawlPayload
from app.modules.facebook.src.modules.crawl_fb.models.GroupSummary import GroupSummary
from app.modules.facebook.src.modules.facebook.services.facebook_scraper import FacebookScraper
from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_service import GroupManagementSheetService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_posts import GoogleSheetServicePosts
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_24h import TargetGroupSheet24HService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_intent_service import IntentSheetService
from app.modules.all_platform.services.supabase_facebook_crawl_service import save_facebook_crawl_to_supabase


logger = logging.getLogger(__name__)

# ĐÃ XÓA Ổ KHÓA TOÀN CỤC (crawl_lock) ĐỂ CHẠY SONG SONG KHÔNG GIỚI HẠN

class CrawlService:
    def __init__(
        self, 
        scraper: FacebookScraper, 
        telegram: TelegramService
    ):
        self.scraper = scraper
        self.telegram = telegram


    async def _execute_scraping(self, payload: CrawlPayload, client_id: Optional[str] = None) -> List[GroupSummary]:
     
        # THAY VÌ: return await self.scraper.scrape_groups(...)
        # HÃY DÙNG:
        return await run_in_threadpool(
            self.scraper.scrape_groups, 
            groups=payload.groups,
            custom_email=getattr(payload.tkFB, 'useName', None), 
            custom_pass=getattr(payload.tkFB, 'password', None),
            client_id=client_id
        )

    # DÙNG CHO CRONJOB / SCHEDULER (Chạy ngầm theo lịch)
    async def CrawlDataGroupFB(self, payload: CrawlPayload):
        try:
            # ĐÃ BỎ async with crawl_lock, CHẠY TRỰC TIẾP
            daily_summary_report = await self._execute_scraping(payload)
             
            if daily_summary_report:
                # Chỉ lưu lên Supabase, loại bỏ Google Sheets
                email_crawl = getattr(payload.tkFB, 'useName', '') if payload.tkFB else ''
                
                try:
                    await asyncio.to_thread(save_facebook_crawl_to_supabase, email_crawl, daily_summary_report)
                except Exception as db_err:
                    logger.error(f"Lỗi khi lưu Supabase trong Cronjob: {db_err}")

                self.telegram.send_completion_notification()
                mes = self.telegram.format_daily_telegram_report(summaries=daily_summary_report)
                self.telegram.send_message(mes)
                return {"status": "success", "message": "Cào dữ liệu hoàn tất."}
            else:
                self.telegram.send_message("ℹ️ *Báo cáo Crawler*\nKhông có bài viết mới.")
                return {"status": "success", "message": "Hoàn tất nhưng không có dữ liệu."}
                
        except ValueError as e:
            if str(e) == "LOGIN_FAILED":
                self.telegram.send_message("🚨 *LỖI ĐĂNG NHẬP*\nSai tài khoản hoặc Checkpoint!")
                return {"status": "error", "message": "Đăng nhập thất bại."}
            raise e 
        
        except Exception as e:
            logger.error(f"Lỗi hệ thống bất ngờ: {e}")
            self.telegram.send_message(f"❌ *Lỗi hệ thống Crawler*\n{str(e)[:100]}...")
            return {"status": "error", "message": "Lỗi hệ thống."}

    # DÙNG CHO FRONTEND GỌI API (Có trả Data về FE)
    async def FetchDataDirectly(self, payload: CrawlPayload, client_id: Optional[str] = None):
        try:
            # ĐÃ BỎ async with crawl_lock, CHẠY TRỰC TIẾP
            scraped_data = await self._execute_scraping(payload, client_id=client_id)
            
            if scraped_data:
                email_crawl = client_id or (getattr(payload.tkFB, 'useName', '') if payload.tkFB else '')
                

                try:
                    # Chuyển đổi và lưu bài viết lên Supabase facebook_posts
                    save_result = await asyncio.to_thread(
                        save_facebook_crawl_to_supabase,
                        email_crawl,
                        scraped_data,
                    )

                    # Background AI filter (không chặn UI)
                    try:
                        from app.modules.all_platform.services.post_relevance_ai_service import (
                            classify_post_relevance,
                        )
                        from app.core.supabase_client import get_supabase_client

                        async def _ai_filter_and_cleanup():
                            inserted_posts = save_result.get("inserted_posts") or []
                            if not inserted_posts:
                                return

                            supabase = get_supabase_client()


                            # Config validation (non-crashing defaults)
                            def _safe_int(env_key: str, default: int) -> int:
                                try:
                                    v = int(os.getenv(env_key, str(default)))
                                    return v if v > 0 else default
                                except Exception:
                                    logger.warning("[AI FILTER] Invalid int env %s, using default=%s", env_key, default)
                                    return default

                            def _safe_float(env_key: str, default: float) -> float:
                                try:
                                    v = float(os.getenv(env_key, str(default)))
                                    return v if v >= 0 else default
                                except Exception:
                                    logger.warning("[AI FILTER] Invalid float env %s, using default=%s", env_key, default)
                                    return default

                            batch_size = _safe_int("RELEVANCE_AI_BATCH_SIZE", 8)
                            delay_s = _safe_float("RELEVANCE_AI_DELAY_S", 1.2)

                            start_all_t = time.time()
                            total = len(inserted_posts)
                            approved = 0
                            rejected = 0
                            failed = 0

                            # prompt version may be exposed by the service; keep stable in logs
                            prompt_version = None

                            # Rate limit / batch nhỏ


                            for i in range(0, len(inserted_posts), batch_size):
                                chunk = inserted_posts[i : i + batch_size]

                                for p in chunk:
                                    post_url = p.get("post_url")
                                    content = p.get("content") or ""
                                    industry = p.get("industry")
                                    if not post_url or not content:
                                        continue

                                    try:
                                        start_post_t = time.time()

                                        result = classify_post_relevance(content, industry)
                                        label = result.get("label")
                                        reason = result.get("reason")

                                        # Fill counters for metrics
                                        elapsed = time.time() - start_post_t

                                        batch_no = (i // batch_size) + 1
                                        prompt_version = result.get("prompt_version")
                                        model = result.get("model")

                                        logger.info(
                                            "AI classify",
                                            extra={
                                                "post_url": post_url,
                                                "id_member": email_crawl,
                                                "label": label,
                                                "reason": reason,
                                                "elapsed": elapsed,
                                                "batch": batch_no,
                                                "prompt_version": prompt_version,
                                            },
                                        )

                                    except Exception as ai_exc:
                                        failed += 1
                                        logger.exception(
                                            "Gemini classify failed (fail-safe keep post). post_url=%s err=%s",
                                            post_url,
                                            ai_exc,
                                        )
                                        continue

                                    if label == "seeding_reject":

                                        rejected += 1
                                    else:
                                        approved += 1


                                        # MUST reuse same business rule as endpoint delete:

                                        # member only delete own posts. Here we only have id_member (email_crawl)
                                        # as stored in facebook_posts.id_member.
                                        try:
                                            supabase.table("facebook_posts").delete().eq(
                                                "post_url", post_url
                                            ).eq("id_member", email_crawl).execute()

                                            # log AI metadata for audit
                                            ai_success = result.get("ai_success") if isinstance(result, dict) else None
                                            model = result.get("model") if isinstance(result, dict) else None
                                            prompt_version = result.get("prompt_version") if isinstance(result, dict) else None
                                            logger.info(
                                                "AI rejected post deleted. post_url=%s reason=%s ai_success=%s model=%s prompt_version=%s",
                                                post_url,
                                                reason,
                                                ai_success,
                                                model,
                                                prompt_version,
                                            )

                                        except Exception as del_exc:
                                            logger.exception(
                                                "Failed to delete rejected post (keep safe). post_url=%s err=%s",
                                                post_url,
                                                del_exc,
                                            )
                                    # else: keep

                                    # small delay to protect quota
                                    time.sleep(delay_s)

                                # extra delay between chunks
                                time.sleep(delay_s)

                            # Metrics summary
                            total_duration = time.time() - start_all_t
                            avg_per_post = (total_duration / total) if total else 0
                            logger.info(
                                "AI FILTER FINISHED",
                                extra={
                                    "total_posts": total,
                                    "approved": approved,
                                    "rejected": rejected,
                                    "failed": failed,
                                    "total_duration": total_duration,
                                    "avg_per_post": avg_per_post,
                                },
                            )

                        asyncio.create_task(_ai_filter_and_cleanup())

                    except Exception as bg_exc:
                        logger.exception("Failed to start AI background filter: %s", bg_exc)

                except Exception as db_err:
                    logger.error(f"Lỗi khi lưu Supabase: {db_err}")
                    # Không văng lỗi 500 để vẫn trả về data cho FE, chỉ log lại

                return {"status": "success", "message": "Cào thành công.", "data": scraped_data}

            else:
                return {"status": "success", "message": "Không có bài viết mới.", "data": []}

        except ValueError as e:
            if str(e) == "LOGIN_FAILED":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Sai tài khoản, mật khẩu hoặc dính Checkpoint."
                )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        except Exception as e:
            logger.error(f"Lỗi hệ thống: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Hệ thống Crawler gặp sự cố: {str(e)}"
            )
            

