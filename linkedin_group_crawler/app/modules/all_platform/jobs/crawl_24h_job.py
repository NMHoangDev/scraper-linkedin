import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime

from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.websocket import manager

# Sử dụng dịch vụ cào từ all_platform
from app.modules.all_platform.services.facebook_crawl_service import crawl_facebook_groups
from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)

async def execute_all_platform_crawl_workflow():
    """
    Luồng cào tự động 24h cho All-Platform.
    Chạy mỗi phút để kiểm tra nhóm nào có giờ cào khớp với hiện tại.
    """
    logger.info("🚀 [ALL-PLATFORM] KIỂM TRA LỊCH CÀO DỮ LIỆU TỰ ĐỘNG...")
    supabase = get_supabase_client()
    
    try:
        now = datetime.now()
        
        # 1. Lấy tất cả nhóm Facebook được bật cào 24h
        res = supabase.table("facebook_groups").select("*").eq("chay_24h", True).execute()
        all_auto_groups = res.data or []
        
        target_groups = []
        involved_users = set()
        
        for row in all_auto_groups:
            start_time = row.get("start_time_in_day")
            end_time = row.get("end_time_in_day")
            time_crawl = row.get("time_crawl")
            end_date_str = row.get("end_date_hour")
            
            if start_time is None or end_time is None or time_crawl is None or time_crawl <= 0:
                continue

            if end_date_str:
                try:
                    end_date = datetime.strptime(end_date_str[:10], "%Y-%m-%d").date()
                    if now.date() > end_date:
                        continue
                except ValueError:
                    pass

            now_minutes = now.hour * 60 + now.minute
            start_minutes = start_time * 60
            end_minutes = end_time * 60

            if start_minutes <= now_minutes <= end_minutes:
                if (now_minutes - start_minutes) % time_crawl == 0:
                    group_url = row.get("group_url", "").strip()
                    group_name = row.get("group_name", "Unknown").strip()
                    intent_val = str(row.get("id_intent", ""))
                    if group_url:
                        target_groups.append({
                            "name": group_name,
                            "url": group_url,
                            "Intent": intent_val
                        })
                        
                        # Thu thập ID của những người liên quan
                        id_member = row.get("id_member")
                        assignee_id = row.get("assignee_id")
                        co_assignee_id = row.get("co_assignee_id")
                        if id_member: involved_users.add(str(id_member))
                        if assignee_id: involved_users.add(str(assignee_id))
                        if co_assignee_id: involved_users.add(str(co_assignee_id))

        if not target_groups:
            return

        involved_users_list = list(involved_users)

        # 2. Bắt đầu cào
        logger.info(f"Tổng cộng có {len(target_groups)} group FB cần cào.")
        
        # Bắn socket báo bắt đầu cào
        asyncio.create_task(manager.broadcast({
            "event": "crawl_started",
            "message": f"Bắt đầu cào 24h tự động cho {len(target_groups)} nhóm Facebook",
            "count": len(target_groups),
            "involved_users": involved_users_list
        }))
        
        # Sử dụng crawl_facebook_groups từ all_platform/services
        # Kèm theo cơ chế tự động thử lại (Retry) khi gặp lỗi mạng (getaddrinfo)
        max_retries = 2
        result = None
        for attempt in range(max_retries + 1):
            try:
                result = await crawl_facebook_groups(
                    groups=target_groups,
                    user_id="cronjob"
                )
                
                # Kiểm tra xem có lỗi liên quan đến mạng không
                has_network_error = False
                if result and result.errors:
                    for err in result.errors:
                        err_str = str(err).lower()
                        if "getaddrinfo" in err_str or "network" in err_str or "timeout" in err_str:
                            has_network_error = True
                            break
                            
                if has_network_error and attempt < max_retries:
                    logger.warning(f"⚠️ [ALL-PLATFORM] Phát hiện lỗi mạng (Attempt {attempt+1}/{max_retries}). Đợi 5s rồi thử lại...")
                    await asyncio.sleep(5)
                    continue
                
                break  # Thành công hoặc không có lỗi mạng thì thoát loop
                
            except Exception as e:
                err_str = str(e).lower()
                if ("getaddrinfo" in err_str or "network" in err_str or "timeout" in err_str) and attempt < max_retries:
                    logger.warning(f"⚠️ [ALL-PLATFORM] Bắt được Exception mạng (Attempt {attempt+1}/{max_retries}): {e}. Đợi 5s rồi thử lại...")
                    await asyncio.sleep(5)
                else:
                    if attempt == max_retries:
                        raise e
                    else:
                        raise e # Lỗi khác thì văng luôn không cần retry
        
        if not result:
            logger.error("❌ Không lấy được kết quả sau các lần thử.")
            return

        # 3. Gửi báo cáo
        total_posts = result.total_posts_saved
        asyncio.create_task(manager.broadcast({
            "event": "crawl_success",
            "message": f"Cào xong {len(target_groups)} nhóm, lưu được {total_posts} bài viết",
            "total_posts": total_posts,
            "involved_users": involved_users_list
        }))
        logger.info("✅ HOÀN TẤT TIẾN TRÌNH CÀO TỰ ĐỘNG FB.")
        
        try:
            telegram = TelegramService()
            msg = f"✅ <b>[ALL-PLATFORM] BÁO CÁO CÀO TỰ ĐỘNG 24H</b>\n"
            msg += f"• Nền tảng: Facebook\n"
            msg += f"• Tổng số nhóm đã quét: {len(target_groups)}\n"
            msg += f"• Nhóm thành công: {result.total_groups_ok}\n"
            msg += f"• Tổng số bài viết thu được: {total_posts}\n"
            telegram.send_message(msg)
        except Exception as tel_err:
            logger.error(f"Lỗi gửi Telegram: {tel_err}")
        
        if result.errors and len(result.errors) > 0:
            for err in result.errors:
                logger.error(f"❌ Lỗi FB Crawl: {err}")

    except Exception as e:
        logger.error(f"❌ Thất bại: {e}", exc_info=True)
        asyncio.create_task(manager.broadcast({
            "event": "crawl_error",
            "message": f"Lỗi hệ thống khi cào FB: {e}"
        }))
        try:
            telegram = TelegramService()
            telegram.send_message(f"🚨 <b>LỖI HỆ THỐNG CRON 24H (FB)</b> 🚨\n\n<code>{str(e)}</code>")
        except Exception:
            pass


def setup_all_platform_jobs():
    """
    Khởi tạo scheduler cho All-Platform.
    """
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.executors.asyncio import AsyncIOExecutor

    executors = {
        'default': AsyncIOExecutor()
    }

    scheduler = AsyncIOScheduler(executors=executors)

    # Thêm tác vụ cào 24h
    scheduler.add_job(
        func=execute_all_platform_crawl_workflow,
        trigger='cron',
        minute='*', # Chạy mỗi phút
        id='all_platform_daily_facebook_crawl',
        replace_existing=True
    )

    # Chuyển job weekly backup từ module cũ sang để không làm đứt gãy logic
    from app.modules.facebook.src.jobs.daily_crawl_job import execute_weekly_backup_and_reset_workflow
    scheduler.add_job(
        func=execute_weekly_backup_and_reset_workflow,
        trigger='cron',
        day_of_week='sun', # Thực thi vào Chủ nhật
        hour=2,            # Lúc 2 giờ sáng
        minute=0,          # 00 phút
        id='weekly_user_score_backup_reset',
        replace_existing=True
    )

    logger.info(f"🕒 All-Platform Scheduler khởi động (Chế độ: AsyncIO).")
    scheduler.start()
