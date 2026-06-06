import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import httpx
# THAY ĐỔI: Sử dụng AsyncIOScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor


from collections import defaultdict

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
from app.modules.facebook.src.modules.crud.groupsFb.groups import reset_all_posts_per_week,get_all_groupsFB
from app.modules.facebook.src.modules.crud.vps_fb.vps_fb import get_http_main_vps_result,get_active_vps
logger = logging.getLogger(__name__)

async def execute_crawl_workflow():
    """Luồng đọc sheet 24h và phân bổ lệnh cào cho VPS chuẩn Intent-based Routing"""
    logger.info("🚀 BẮT ĐẦU CHẠY TIẾN TRÌNH CÀO DỮ LIỆU TỰ ĐỘNG (CRON 24H)...")
    service_24h = TargetGroupSheet24HService()
    telegram = TelegramService()
    
    try:
        # 1. Lấy thông tin cấu hình và VPS hoạt động
        https_result = await asyncio.to_thread(get_http_main_vps_result)
        MAIN_WEBHOOK_URL = https_result
        
        active_vps = await asyncio.to_thread(get_active_vps)
        
        if not active_vps or not MAIN_WEBHOOK_URL:
            logger.error("❌ Lỗi cấu hình: Không có VPS nào đang hoạt động hoặc thiếu Webhook URL.")
            return

        # Phân loại VPS theo id_intent
        vps_by_intent = defaultdict(list)
        vps_null = []

        for vps in active_vps:
            intent = vps.get('id_intent')
            vps_url = vps.get('http')
            
            if not vps_url:
                continue
                
            if intent:
                vps_by_intent[intent].append(vps_url)
            else:
                vps_null.append(vps_url)

        # 2. Lấy danh sách Group từ cơ sở dữ liệu 24h
        sheet_data = await asyncio.to_thread(get_all_groupsFB_24h)
        
        if not sheet_data:
            logger.warning("❌ Không tìm thấy danh sách Group hợp lệ trong 24h.")
            return

        # Khởi tạo bộ chia lô
        vps_batches = {vps['http']: [] for vps in active_vps if vps.get('http')}
        intent_counters = defaultdict(int)
        null_counter = 0
        
       
        

        for row in sheet_data:
            group_url = row.get("url", "").strip()
            group_name = row.get("group_name", "Unknown").strip()
            group_id = row.get("id", "").strip()
            id_member = row.get("id_member")
            g_intent = row.get("id_intent")
            
            if not group_url:
                continue

            # --- KIỂM TRA RÀNG BUỘC THỜI GIAN ---

            # --- PHÂN BỔ VÀO VPS (Intent-based Routing) ---
            # Chỉ truyền payload cần thiết cho Frontend/VPS xử lý
            clean_group = {
                "name": group_name, 
                "url": group_url, 
                "id": group_id,
                "id_member": id_member
            }

            if g_intent and g_intent in vps_by_intent and len(vps_by_intent[g_intent]) > 0:
                # Có VPS xử lý riêng cho intent này -> Chia vòng xoay
                target_list = vps_by_intent[g_intent]
                idx = intent_counters[g_intent] % len(target_list)
                selected_url = target_list[idx]
                
                vps_batches[selected_url].append(clean_group)
                intent_counters[g_intent] += 1
            else:
                # Không có intent hoặc không có VPS map với intent đó
                if len(vps_null) > 0:
                    idx = null_counter % len(vps_null)
                    selected_url = vps_null[idx]
                    
                    vps_batches[selected_url].append(clean_group)
                    null_counter += 1
                else:
                    logger.warning(f"Bỏ qua group {group_name} vì không có VPS phù hợp đang hoạt động.")

        # 3. Dọn dẹp và chuẩn bị Job Tracker
        active_batches = {url: batch for url, batch in vps_batches.items() if len(batch) > 0}
        total_jobs = len(active_batches)

        if total_jobs == 0:
            logger.info("⏭️ Không có task nào được phân bổ cho các máy chủ trong cron 24h.")
            return

        job_tracker["CRON_24H"] = {
            "total": total_jobs,
            "completed": 0,
            "data": [] 
        }

        # 4. Phát lệnh gọi các máy cày
        logger.info(f"Đã chia groups thành {total_jobs} lô. Phát lệnh tới các VPS...")
        async with httpx.AsyncClient() as client:
            for url, batch in active_batches.items():
                payload_data = {
                    "batch_data": batch, 
                    "client_id": "CRON_24H",
                    "webhook_url": MAIN_WEBHOOK_URL
                }
                try:
                    await client.post(url, json=payload_data, timeout=5)
                except Exception as e:
                    logger.error(f"⚠️ Gửi lệnh thất bại tới {url}: {e}")
                    # Cộng completed ảo để không bị treo logic webhook chờ
                    job_tracker["CRON_24H"]["completed"] += 1 

    except Exception as e:
        logger.error(f"❌ Thất bại trong luồng cron 24h: {e}", exc_info=True)
        try:
            telegram.send_message(f"🚨 <b>LỖI HỆ THỐNG CRON 24H</b> 🚨\n\n<code>{str(e)}</code>")
        except Exception: 
            pass
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
            
        else:
            logger.error("❌ Sao lưu thành công nhưng lệnh RESET điểm số về 0 thất bại.")

    except Exception as e:
        logger.error(f"❌ Thất bại trong quy trình xử lý cuối tuần: {e}", exc_info=True)
        try:
            telegram.send_message(f"🚨 <b>LỖI HỆ THỐNG CRON WEEKLY</b> 🚨\n\n<code>{str(e)}</code>")
        except Exception:
            pass
async def execute_crawl_hourly():
    """Luồng đọc data từ database và chia lệnh cào theo cấu hình start/end/interval, phân bổ VPS theo id_intent"""
    logger.info("🚀 BẮT ĐẦU CHẠY TIẾN TRÌNH CÀO DỮ LIỆU TỰ ĐỘNG THEO GIỜ...")
    
    try:
        current_hour = datetime.now().hour
        now = datetime.now()
        current_date = now.date()

        # 1. Lấy thông tin cấu hình và VPS hoạt động
        https_result = await asyncio.to_thread(get_http_main_vps_result)
        MAIN_WEBHOOK_URL = https_result
        
        active_vps = await asyncio.to_thread(get_active_vps)
        
        if not active_vps or not MAIN_WEBHOOK_URL:
            logger.error("❌ Lỗi cấu hình: Không có VPS nào đang hoạt động hoặc thiếu Webhook URL.")
            return

        # 2. Phân loại VPS theo id_intent
        vps_by_intent = defaultdict(list)
        vps_null = []

        for vps in active_vps:
            intent = vps.get('id_intent')
            vps_url = vps.get('http')
            
            if not vps_url:
                continue
                
            if intent:
                vps_by_intent[intent].append(vps_url)
            else:
                vps_null.append(vps_url)

        # 3. Lấy dữ liệu Groups và thiết lập bộ chia lô
        sheet_data = await asyncio.to_thread(get_all_groupsFB) 
        
        vps_batches = {vps['http']: [] for vps in active_vps if vps.get('http')}
        intent_counters = defaultdict(int)
        null_counter = 0

        for row in sheet_data:
            group_url = row.get("url", "").strip()
            group_name = row.get("group_name", "Unknown").strip()
            group_id = row.get("id", "").strip()
            id_member = row.get("id_member")
            g_intent = row.get("id_intent")
            
            # --- KIỂM TRA NGÀY HẾT HẠN (end_date_hour) ---
            end_date_hour_raw = row.get("end_date_hour")
            if not end_date_hour_raw or str(end_date_hour_raw).strip() == "":
                continue
                
            try:
                end_date_str = str(end_date_hour_raw).strip()[:10]
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
                if end_date < current_date:
                    continue
            except Exception as parse_err:
                logger.error(f"⚠️ Lỗi định dạng ngày tại group {group_name}: {parse_err}")
                continue 

            # --- KIỂM TRA ĐIỀU KIỆN THỜI GIAN CÀO ---
            start_hour_raw = row.get("start_date_crawl")
            end_hour_raw = row.get("end_date_crawl")
            time_crawl_raw = row.get("time_crawl")

            # Bỏ qua ngay lập tức nếu bất kỳ cờ thời gian nào bị Null hoặc rỗng
            if start_hour_raw is None or start_hour_raw == "" or \
               end_hour_raw is None or end_hour_raw == "" or \
               time_crawl_raw is None or time_crawl_raw == "":
                continue

            try:
                time_crawl = int(time_crawl_raw)
                start_hour = int(start_hour_raw)
                end_hour = int(end_hour_raw)
            except ValueError:
                continue

            # Kiểm tra xem giờ hiện tại có nằm trong khung giờ quy định không
            if not (start_hour <= current_hour <= end_hour):
                continue 

            # Tính toán chu kỳ cào: Khoảng cách từ lúc bắt đầu chia hết cho chu kỳ
            hours_passed = current_hour - start_hour 
            if hours_passed % time_crawl != 0:
                continue

            if not group_url:
                continue

            # --- PHÂN BỔ VÀO VPS (Chuẩn Intent-based Routing) ---
            # Payload sạch, không chứa id_intent để gửi cho VPS
            clean_group = {
                "name": group_name, 
                "url": group_url, 
                "id": group_id,
                "id_member": id_member
            }

            if g_intent and g_intent in vps_by_intent and len(vps_by_intent[g_intent]) > 0:
                # Xoay vòng VPS cho intent hiện tại
                target_list = vps_by_intent[g_intent]
                idx = intent_counters[g_intent] % len(target_list)
                selected_url = target_list[idx]
                
                vps_batches[selected_url].append(clean_group)
                intent_counters[g_intent] += 1
            else:
                # Đẩy vào các VPS không định danh intent
                if len(vps_null) > 0:
                    idx = null_counter % len(vps_null)
                    selected_url = vps_null[idx]
                    
                    vps_batches[selected_url].append(clean_group)
                    null_counter += 1
                else:
                    logger.warning(f"Bỏ qua group {group_name} vì không có VPS phù hợp đang hoạt động.")

        # 4. Phát lệnh gọi VPS
        # Lọc bỏ các VPS rỗng không có task
        active_batches = {url: batch for url, batch in vps_batches.items() if len(batch) > 0}
        total_jobs = len(active_batches)

        if total_jobs == 0:
            logger.info(f"⏭️ Khung giờ {current_hour}h: Không có Group nào đến lịch cần cào hoặc không có task phân bổ.")
            return

        job_tracker["CRON_HOURLY"] = {
            "total": total_jobs,
            "completed": 0,
            "data": [] 
        }

        logger.info(f"Khung {current_hour}h: Giao việc cho {total_jobs} máy chủ. Phát lệnh tới VPS...")
        async with httpx.AsyncClient() as client:
            for url, batch in active_batches.items():
                payload_data = {
                    "batch_data": batch, 
                    "client_id": "CRON_HOURLY", 
                    "webhook_url": MAIN_WEBHOOK_URL
                }
                
                try:
                    # Request timeout cực ngắn giống WS, máy chủ nhận lệnh là xử lý nền ngay
                    await client.post(url, json=payload_data, timeout=5)
                except Exception as e:
                    logger.error(f"⚠️ Gửi lệnh thất bại tới {url}: {e}")
                    # Mồi completion để tránh kẹt vòng lặp job tracking phía sau
                    job_tracker["CRON_HOURLY"]["completed"] += 1 

    except Exception as e:
        logger.error(f"❌ Thất bại trong luồng cron hourly: {e}", exc_info=True)
        
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
    func=execute_crawl_hourly,
    trigger='cron',
    hour='*',      # Chạy mỗi đầu giờ (0h - 23h)
    minute=0,      # Đúng phút 00
    id='hourly_facebook_crawl',
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