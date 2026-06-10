import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta

from app.core.supabase_client import get_supabase_client
from app.modules.all_platform.websocket import manager

# Sử dụng dịch vụ cào từ all_platform
from app.modules.all_platform.services.facebook_crawl_service import crawl_facebook_groups
from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService

logger = logging.getLogger(__name__)

def get_vietnam_now() -> datetime:
    """Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)."""
    return datetime.now(timezone(timedelta(hours=7)))


async def run_crawl_task_background(groups: List[Dict[str, Any]], user_id: str, involved_users_list: List[str]):
    """
    Tiến trình chạy nền thực hiện việc cào dữ liệu cho một danh sách nhóm cụ thể.
    """
    logger.info(f"▶️ Bắt đầu tiến trình chạy nền cào {len(groups)} nhóm cho user {user_id}")
    
    # Bắn socket báo bắt đầu cào
    asyncio.create_task(manager.broadcast({
        "event": "crawl_started",
        "message": f"Bắt đầu cào 24h tự động cho {len(groups)} nhóm Facebook",
        "count": len(groups),
        "involved_users": involved_users_list
    }))
    
    max_retries = 2
    result = None
    for attempt in range(max_retries + 1):
        try:
            result = await crawl_facebook_groups(
                groups=groups,
                user_id=user_id
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
                    # Gửi báo lỗi Telegram nếu max retries
                    try:
                        telegram = TelegramService()
                        telegram.send_message(f"🚨 <b>LỖI CÀO NỀN (FB)</b> 🚨\n\n<code>{str(e)}</code>")
                    except Exception:
                        pass
                    return
                else:
                    try:
                        telegram = TelegramService()
                        telegram.send_message(f"🚨 <b>LỖI CÀO NỀN (FB)</b> 🚨\n\n<code>{str(e)}</code>")
                    except Exception:
                        pass
                    return # Lỗi khác thì văng luôn không cần retry
    
    if not result:
        logger.error("❌ Không lấy được kết quả sau các lần thử.")
        return

    # 3. Gửi báo cáo
    total_posts = result.total_posts_saved
    total_duplicates = getattr(result, 'total_duplicates', 0)
    
    msg_broadcast = f"Cào xong {len(groups)} nhóm, lưu được {total_posts} bài viết."
    if total_duplicates > 0:
        msg_broadcast += f" Phát hiện {total_duplicates} bài viết trùng lặp đã có trong cơ sở dữ liệu."

    asyncio.create_task(manager.broadcast({
        "event": "crawl_success",
        "message": msg_broadcast,
        "total_posts": total_posts,
        "total_duplicates": total_duplicates,
        "involved_users": involved_users_list
    }))
    logger.info(f"✅ HOÀN TẤT TIẾN TRÌNH CÀO FB CHO {len(groups)} NHÓM (user: {user_id}).")
    
    try:
        telegram = TelegramService()
        supabase = get_supabase_client()
        
        # Lấy tên User
        user_name = user_id
        if user_id != "00000000-0000-0000-0000-000000000000":
            user_res = supabase.table("app_users").select("name, email").eq("id", user_id).execute()
            if user_res.data:
                user_name = user_res.data[0].get("name") or user_res.data[0].get("email") or user_id
        
        # Lấy tối đa 5 bài viết mới nhất vừa được lưu
        recent_posts_text = ""
        if total_posts > 0:
            posts_res = supabase.table("facebook_posts").select("content, reactions, comments, group_id").eq("id_member", user_id).order("created_at", desc=True).limit(min(5, total_posts)).execute()
            if posts_res.data:
                recent_posts_text = "\n\n📝 <b>CHI TIẾT CÁC BÀI VIẾT NỔI BẬT:</b>\n"
                for i, post in enumerate(posts_res.data):
                    content = post.get("content") or ""
                    if len(content) > 100:
                        content = content[:100] + "..."
                    recent_posts_text += f"\n{i+1}. <i>{content}</i>\n"
                    recent_posts_text += f"   👉 Tương tác: 👍 {post.get('reactions', 0)} | 💬 {post.get('comments', 0)}\n"
        
        group_names = ", ".join([g.get("name", "Unknown Group") for g in groups])
        
        msg = f"✅ <b>[ALL-PLATFORM] BÁO CÁO CÀO TỰ ĐỘNG 24H</b>\n"
        msg += f"• Nền tảng: Facebook\n"
        msg += f"• Người thực thi: {user_name}\n"
        msg += f"• Nhóm đã quét ({len(groups)}): {group_names}\n"
        msg += f"• Nhóm thành công: {result.total_groups_ok}\n"
        msg += f"• Tổng số bài viết mới: {total_posts}\n"
        if total_duplicates > 0:
            msg += f"• Bỏ qua {total_duplicates} bài viết trùng lặp (từ các nhóm trên)."
        msg += recent_posts_text
        
        telegram.send_message(msg)
    except Exception as tel_err:
        logger.error(f"Lỗi gửi Telegram: {tel_err}")
    
    if result.errors and len(result.errors) > 0:
        for err in result.errors:
            logger.error(f"❌ Lỗi FB Crawl: {err}")


async def execute_all_platform_crawl_workflow():
    """
    Luồng cào tự động 24h cho All-Platform.
    Chạy mỗi phút để kiểm tra nhóm nào có giờ cào khớp với hiện tại.
    """
    logger.info("🚀 [ALL-PLATFORM] KIỂM TRA LỊCH CÀO DỮ LIỆU TỰ ĐỘNG...")
    supabase = get_supabase_client()
    
    try:
        now = get_vietnam_now()
        
        # 1. Lấy tất cả nhóm Facebook được bật cào 24h
        res = supabase.table("facebook_groups").select("*").eq("chay_24h", True).execute()
        all_auto_groups = res.data or []
        
        # Gom nhóm theo user_id để mỗi user chạy một luồng background cào riêng
        target_groups_by_user: Dict[str, List[Dict[str, Any]]] = {}
        involved_users_by_user: Dict[str, set] = {}
        
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
                        # Lấy UUID hợp lệ từ cấu hình
                        user_id = str(row.get("id_member") or row.get("assignee_id") or "00000000-0000-0000-0000-000000000000")
                        
                        if user_id not in target_groups_by_user:
                            target_groups_by_user[user_id] = []
                            involved_users_by_user[user_id] = set()
                            
                        target_groups_by_user[user_id].append({
                            "name": group_name,
                            "url": group_url,
                            "Intent": intent_val
                        })
                        
                        # Thu thập ID của những người liên quan
                        id_member = row.get("id_member")
                        assignee_id = row.get("assignee_id")
                        co_assignee_id = row.get("co_assignee_id")
                        if id_member: involved_users_by_user[user_id].add(str(id_member))
                        if assignee_id: involved_users_by_user[user_id].add(str(assignee_id))
                        if co_assignee_id: involved_users_by_user[user_id].add(str(co_assignee_id))

        if not target_groups_by_user:
            return

        # 2. Đẩy các luồng cào ra background tasks
        logger.info(f"Phát hiện {len(target_groups_by_user)} luồng cào cần khởi chạy.")
        
        for user_id, groups in target_groups_by_user.items():
            involved_users_list = list(involved_users_by_user.get(user_id, set()))
            # Sử dụng create_task để chạy ngầm và trả ngay luồng điều khiển lại cho Scheduler
            asyncio.create_task(run_crawl_task_background(groups, user_id, involved_users_list))

    except Exception as e:
        logger.error(f"❌ Thất bại trong lúc check scheduler: {e}", exc_info=True)
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
        replace_existing=True,
        max_instances=10  # Dự phòng nếu script loop chạy lâu hơn 1 phút do độ trễ lấy DB
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
