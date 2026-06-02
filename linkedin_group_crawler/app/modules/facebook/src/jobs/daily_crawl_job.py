import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import httpx
# THAY ĐỔI: Sử dụng AsyncIOScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor

# Import các service
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_24h import TargetGroupSheet24HService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_posts import GoogleSheetServicePosts
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_service import GroupManagementSheetService

from app.modules.facebook.src.modules.gg_sheet.services.history_sheet_service import HistorySheetService
from app.modules.facebook.src.modules.gg_sheet.services.user_score_sheet_service import UserScoreSheetService
from app.modules.facebook.src.modules.facebook.services.facebook_scraper import FacebookScraper, GroupTarget
from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService
from app.modules.facebook.src.core.config.env import Config
from app.modules.facebook.src.modules.crawl_fb.models.GroupSummary import GroupSummary

from app.modules.facebook.src.modules.crawl_fb.router.index import job_tracker
from app.modules.facebook.src.modules.crud.groups24hFb.group24h import get_all_groupsFB_24h
from app.modules.facebook.src.modules.crud.groupsFb.groups import reset_all_posts_per_week

logger = logging.getLogger(__name__)

async def execute_crawl_workflow():
    """Luồng đọc sheet 24h và chia lệnh cào cho 3 VPS"""
    logger.info("🚀 BẮT ĐẦU CHẠY TIẾN TRÌNH CÀO DỮ LIỆU TỰ ĐỘNG...")
    service_24h = TargetGroupSheet24HService()
    telegram = TelegramService()
    
    try:
        sheet_data = await asyncio.to_thread(get_all_groupsFB_24h)
        
        all_groups_dict = []
        for row in sheet_data:
            group_url = row.get("url", "").strip()
            group_name = row.get("group_name", "Unknown").strip()
            id = row.get("id", "").strip()
            if group_url:
                all_groups_dict.append({"name": group_name, "url": group_url, "id": id})

        if not all_groups_dict:
            logger.warning("❌ Không tìm thấy danh sách Group hợp lệ.")
            return

        # 1. Lấy thông tin các VPS
        WORKER_URLS = Config.get_worker_urls()
        MAIN_WEBHOOK_URL = Config.MAIN_WEBHOOK_URL
        
        if not WORKER_URLS or not MAIN_WEBHOOK_URL:
            logger.error("❌ Thiếu cấu hình WORKER_URLS hoặc MAIN_WEBHOOK_URL trong .env")
            return

        # 2. Chia lô cho các máy cày
        num_workers = len(WORKER_URLS)
        chunk_size = (len(all_groups_dict) + num_workers - 1) // num_workers
        batches = [all_groups_dict[i:i + chunk_size] for i in range(0, len(all_groups_dict), chunk_size)]

        # 3. Ghi danh vào sổ theo dõi (Để Webhook biết mà hứng)
        job_tracker["CRON_24H"] = {
            "total": len(batches),
            "completed": 0,
            "data": [] # Khởi tạo mảng rỗng để hứng data đổ về
        }

        # 4. Phát lệnh gọi các máy cày
        logger.info(f"Đã chia {len(all_groups_dict)} groups thành {len(batches)} phần. Phát lệnh tới các VPS...")
        async with httpx.AsyncClient() as client:
            for idx, batch in enumerate(batches):
                url = WORKER_URLS[idx % num_workers]
                payload_data = {
                    "batch_data": batch, 
                    "client_id": "CRON_24H", # Định danh là Cronjob
                    "webhook_url": MAIN_WEBHOOK_URL
                }
                try:
                    await client.post(url, json=payload_data, timeout=5)
                except Exception as e:
                    logger.error(f"⚠️ Gửi lệnh thất bại tới {url}: {e}")
                    # Nếu máy chết, phải +1 completed ảo để Webhook không đợi mãi
                    job_tracker["CRON_24H"]["completed"] += 1 

    except Exception as e:
        logger.error(f"❌ Thất bại: {e}", exc_info=True)
        try:
            telegram.send_message(f"🚨 <b>LỖI HỆ THỐNG CRON 24H</b> 🚨\n\n<code>{str(e)}</code>")
        except: pass
def execute_update_groups_workflow():
    """
    Luồng công việc tổng hợp cập nhập lại điểm số sau 1 tuần
    """
    try:
        logger.info("🔄 BẮT ĐẦU QUY TRÌNH CẬP NHẬT LẠI ĐIỂM SỐ VÀ THÔNG TIN GROUPS...")
        reset_all_posts_per_week() # Reset lại posts_per_week về 0 cho tất cả groups trước khi cập nhật
    except Exception as e:
        logger.error(f"❌ Thất bại trong quy trình cập nhật groups: {e}", exc_info=True)

# ==============================================================================
# ✅ LUỒNG TÁC VỤ 3 THÊM MỚI: BACKUP VÀ RESET ĐIỂM SỐ HÀNG TUẦN (CHỦ NHẬT 2:00 AM)
# ==============================================================================
async def execute_weekly_backup_and_reset_workflow():
    """
    Tác vụ chạy ngầm hàng tuần:
    1. Đọc toàn bộ bảng User_Scores.
    2. Chuyển đổi DTO và đẩy sang bảng History.
    3. Reset toàn bộ điểm tuần về 0 cho bảng User_Scores cũ.
    """
    logger.info("📅 [WEEKLY JOB] BẮT ĐẦU QUY TRÌNH SAO LƯU VÀ RESET ĐIỂM TUẦN...")
    telegram = TelegramService()
    user_score_service = UserScoreSheetService()
    history_service = HistorySheetService()

    try:
        # 1. Đọc bảng điểm số hiện tại (Chạy trên Threadpool để tránh block Event Loop)
        user_scores: List[Dict[str, Any]] = await asyncio.to_thread(user_score_service.get_all_user_scores)
        
        if not user_scores:
            logger.warning("⚠️ Bảng điểm User_Scores trống hoặc không đọc được dữ liệu. Hủy quy trình backup.")
            return

        current_date_str = datetime.now().strftime("%Y-%m-%d")
        records_to_backup: List[Dict[str, str]] = []

        # 2. Ánh xạ (Mapping) cấu trúc header từ bảng điểm cũ sang cấu trúc lịch sử mới
        for row in user_scores:
            uid = row.get(Config.USER_COMMENT_HEADER_ID)
            name = row.get(Config.USER_COMMENT_HEADER_NAME)
            score = row.get(Config.USER_COMMENT_HEADER_SCORE_WEEK)

            if uid:
                records_to_backup.append({
                    "id": str(uid).strip(),
                    "name": str(name).strip(),
                    "score": str(score if score is not None else 0).strip(),
                    "date": current_date_str
                })

        if not records_to_backup:
            logger.warning("⚠️ Không tìm thấy bản ghi hợp lệ nào để sao lưu.")
            return

        # 3. Thực hiện Bulk Insert vào sheet History
        logger.info(f"📦 Đang sao lưu {len(records_to_backup)} bản ghi thành viên sang Sheet Lịch sử...")
        backup_success = await asyncio.to_thread(
            history_service.add_multiple_histories, 
            records_to_backup
        )

        if not backup_success:
            raise RuntimeError("Lỗi hệ thống khi đẩy dữ liệu lên Google Sheet History.")

        # 4. Sau khi backup thành công tuyệt đối -> Thực hiện reset điểm số về 0
        logger.info("🔄 Đang dọn dẹp và reset cột điểm tuần về 0...")
        reset_success = await asyncio.to_thread(user_score_service.reset_all_scores_to_zero)

        if reset_success:
            logger.info("✅ HOÀN TẤT CHU KỲ TUẦN. Đã sao lưu dữ liệu và đưa toàn bộ điểm về 0.")
            # Báo cáo trạng thái tốt qua Telegram channel
            telegram.send_message(
                f"📊 <b>BÁO CÁO CUỐI TUẦN</b> 📊\n\n"
                f"✅ Đã sao lưu thành công <code>{len(records_to_backup)}</code> tài khoản sang lịch sử.\n"
                f"🔄 Đã đưa toàn bộ điểm số tuần về 0."
            )
        else:
            logger.error("❌ Sao lưu thành công nhưng lệnh RESET điểm số về 0 thất bại.")

    except Exception as e:
        logger.error(f"❌ Thất bại trong quy trình xử lý cuối tuần: {e}", exc_info=True)
        try:
            telegram.send_message(f"🚨 <b>LỖI HỆ THỐNG CRON WEEKLY</b> 🚨\n\n<code>{str(e)}</code>")
        except Exception:
            pass
        
def setup_and_start_jobs():
    """
    Khởi tạo scheduler theo phong cách Async chuẩn Product.
    """
    # 1. Cấu hình Executor cho phép chạy Async
    executors = {
        'default': AsyncIOExecutor()
    }

    # 2. Khởi tạo AsyncIOScheduler thay vì BackgroundScheduler
    scheduler = AsyncIOScheduler(executors=executors)

    # 3. Thêm công việc vào lịch
    scheduler.add_job(
        func=execute_crawl_workflow,
        trigger='cron',
        hour=Config.CRAWL_HOUR,
        minute=Config.CRAWL_MINUTE,
        id='daily_facebook_crawl',
        replace_existing=True
    )
    scheduler.add_job(
        func=execute_update_groups_workflow,
        trigger='cron',
        day_of_week='mon', # Thực thi vào Chủ nhật
        hour=Config.GROUP_HOUR,
        minute=Config.GROUP_MINUTE,
        id='daily_facebook_UPDATE_GROUP',
        replace_existing=True
    )
    scheduler.add_job(
        func=execute_weekly_backup_and_reset_workflow,
        trigger='cron',
        day_of_week='sun', # Thực thi vào Chủ nhật
        hour=2,            # Lúc 2 giờ sáng
        minute=0,          # 00 phút
        id='weekly_user_score_backup_reset',
        replace_existing=True
    )

    logger.info(f"🕒 Scheduler khởi động (Chế độ: AsyncIO). Lịch: {Config.CRAWL_HOUR}:{Config.CRAWL_MINUTE:02d}")
    
    # Bắt đầu bộ đếm thời gian
    scheduler.start()