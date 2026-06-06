# src/modules/crawl/route/crawl_route.py
from datetime import datetime
import json
import asyncio
import logging
from pathlib import Path
from fastapi import APIRouter, Depends, status, BackgroundTasks, WebSocket, WebSocketDisconnect
from typing import Any, List, Optional, Dict
from pydantic import BaseModel
import uuid
from fastapi import HTTPException
from collections import defaultdict
# Imports từ project của bạn
from app.modules.facebook.src.modules.facebook.services.facebook_auth import FacebookAuth
from app.modules.facebook.src.modules.crawl_fb.schemas.crawl_schema import CrawlPayload
from app.modules.facebook.src.modules.crawl_fb.schemas.update_group_schema import UpdateGroupRequest, UpdateGroupResponse
from app.modules.facebook.src.modules.crawl_fb.services.index import CrawlService
from app.modules.facebook.src.modules.facebook.services.facebook_scraper import FacebookScraper, cancel_registry
from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets import GoogleApiService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_service import GroupManagementSheetService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_posts import GoogleSheetServicePosts
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_24h import TargetGroupSheet24HService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_intent_service import IntentSheetService
from app.modules.facebook.src.core.config.env import Config
from app.modules.facebook.src.modules.crud.posts.post import create_multiple_postsFB
from app.modules.facebook.src.modules.crud.groupsFb.groups import update_groups_per_crawl
from app.modules.facebook.src.core.utils.facebook_parsers import convert_to_datetime
from app.modules.facebook.src.modules.crud.vps_fb.vps_fb import get_active_vps,get_http_main_vps_result
from fastapi.encoders import jsonable_encoder
import traceback

logger = logging.getLogger(__name__)

crawl_fb_router = APIRouter(tags=["Crawler Management FB"])

# ── QUẢN LÝ THƯ MỤC OTP ────────────────────────────────

# Đảm bảo thư mục lưu cache OTP luôn tồn tại
OTP_DIRECTORY = Path("temp_otp")
OTP_DIRECTORY.mkdir(parents=True, exist_ok=True)

# ĐÃ GỠ BỎ TOÀN BỘ SEMAPHORE VÀ LOCK ĐỂ CHẠY SONG SONG KHÔNG GIỚI HẠN
# login_semaphore = asyncio.Semaphore(3)
# ws_crawl_lock = asyncio.Lock()

# ── SCHEMAS ───────────────────────────────────────────────────────────────────

class LoginPayload(BaseModel):
    email: str
    password: str
    secret_2fa: Optional[str] = None

class CheckPhonePayload(BaseModel):
    session_id: str

class SubmitOTPPayload(BaseModel):
    session_id: str
    otp_code: str
# ── WEBSOCKET MANAGER ─────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(
        self,
        websocket: WebSocket,
        email: str,
        *,
        accept: bool = True,
    ):
        if accept:
            await websocket.accept()
        self.active_connections[email] = websocket

    # ĐÂY LÀ HÀM BẠN ĐÃ ĐỊNH NGHĨA
    def disconnect(self, email: str):
        if email in self.active_connections:
            del self.active_connections[email]

    async def send_json(self, email: str, safe_message: dict):
        if email in self.active_connections:
            try:
                await self.active_connections[email].send_json(safe_message)
            except WebSocketDisconnect:
                 print(f"Client {email} đã ngắt kết nối (WebSocketDisconnect).")
                 # SỬA LẠI Ở ĐÂY: Dùng self.disconnect(email) thay vì self._remove_connection
                 self.disconnect(email)
            except RuntimeError as e:
                 print(f"Lỗi RuntimeError khi gửi cho {email}: {e}")
                 # SỬA LẠI Ở ĐÂY
                 self.disconnect(email)
            except Exception as e:
                 print(f"Lỗi không xác định khi gửi tin nhắn cho {email}: {e}")
manager = ConnectionManager()

# ── ĐỊNH NGHĨA DEPENDENCY ─────────────────────────────────────────────────────

def get_crawl_service():
    """
    Hàm này chịu trách nhiệm khởi tạo class CrawlService.
    FastAPI sẽ tự động tạo một phiên bản Service mỗi khi có Request tới.
    """
    scraper = FacebookScraper(config=Config)
    telegram = TelegramService()
    group_sheet: GroupManagementSheetService = GroupManagementSheetService()
    post_sheet: GoogleSheetServicePosts = GoogleSheetServicePosts()
    group_24h_sheet: TargetGroupSheet24HService = TargetGroupSheet24HService()
    intent_sheet: IntentSheetService = IntentSheetService()

    return CrawlService(scraper=scraper, telegram=telegram, group_sheet=group_sheet, post_sheet=post_sheet, intent_sheet=intent_sheet, group_24h_sheet=group_24h_sheet)

# ── ROUTER CÀO DỮ LIỆU (CŨ) ───────────────────────────────────────────────────

# Route POST để kích hoạt cào dữ liệu ngầm
@crawl_fb_router.post("/CrawlDataGroupFB", status_code=status.HTTP_200_OK)
async def trigger_crawl_fb_api(
    payload: CrawlPayload, 
    background_tasks: BackgroundTasks,
    service: CrawlService = Depends(get_crawl_service)
):
    """
    API kích hoạt tiến trình cào dữ liệu Facebook thủ công chạy ngầm.
    """
    background_tasks.add_task(service.CrawlDataGroupFB, payload)
    
    return {
        "status": "success",
        "message": "Đã nhận lệnh! Bot đang tiến hành cào dữ liệu ngầm trên server."
    }

# ROUTER FE YÊU CẦU CÀO VÀ TRẢ DỮ LIỆU TRỰC TIẾP
@crawl_fb_router.post("/CrawlFbForFE", status_code=status.HTTP_200_OK)
async def fetch_data_direct_for_fe(
    payload: CrawlPayload, 
    service: CrawlService = Depends(get_crawl_service)
):
    """
    API dành cho Frontend: 
    Nhận tài khoản FB + danh sách group -> Cào dữ liệu -> Trả thẳng kết quả về cho FE.
    """
    return await service.FetchDataDirectly(payload)

@crawl_fb_router.get("/Posts", status_code=status.HTTP_200_OK)
async def get_all_facebook_posts(
    service: CrawlService = Depends(get_crawl_service)
):
    """
    API dành cho Frontend: 
    Lấy toàn bộ dữ liệu bài viết đã được cào và lưu trong Database.
    """
    posts = await service.get_all_posts_from_sheet()
    return posts

# ROUTER WEBSOCKET XẾP HÀNG YÊU CẦU CÀO DỮ LIỆU
# @crawl_fb_router.websocket("/ws/CrawlFbForFE/{email}")
# async def websocket_crawl_endpoint(websocket: WebSocket, email: str):
#     """WebSocket API for Facebook crawl data request queuing.

#     Không dùng ``Depends(get_crawl_service)`` trên WebSocket — FastAPI resolve dependency
#     *trước* ``accept()``, lỗi Google credentials/config sẽ gây đóng kết nối 1006 im lặng.
#     """
#     logger.info("WebSocket connection attempt from %s", email)
#     logger.info(
#         "Client headers: origin=%s, host=%s",
#         websocket.headers.get("origin"),
#         websocket.headers.get("host"),
#     )

#     try:
#         await websocket.accept()
#         logger.info("WebSocket accepted for %s", email)
#     except Exception as e:
#         logger.error("Failed to accept WebSocket for %s: %s", email, e, exc_info=True)
#         return

#     try:
#         service = get_crawl_service()
#     except Exception as e:
#         logger.error("CrawlService init failed for %s: %s", email, e, exc_info=True)
#         try:
#             await websocket.send_json(
#                 {
#                     "status": "error",
#                     "message": (
#                         "Không khởi tạo được dịch vụ crawl Facebook. "
#                         "Kiểm tra GOOGLE_CREDENTIALS_PATH, SPREADSHEET_ID trong .env backend. "
#                         f"Chi tiết: {e}"
#                     ),
#                 }
#             )
#             await websocket.close(code=1011, reason="Service init failed")
#         except Exception:
#             pass
#         return

#     await manager.connect(websocket, email, accept=False)
#     cancel_registry[email] = False

#     try:
#         logger.info(f"Waiting for payload from {email}...")
#         data = await websocket.receive_text()
#         logger.info(f"Received payload from {email}, size: {len(data)} bytes")
#         payload_dict = json.loads(data)
#         payload = CrawlPayload(**payload_dict)

#         await manager.send_json(
#             {
#                 "status": "processing",
#                 "message": f"Processing crawl request for {email}...",
#             },
#             email,
#         )

#         # 2. ✅ CHUẨN SENIOR: TẠO BACKGROUND TASK ĐỘC LẬP
#         # Đẩy luồng I/O nặng sang Async Task để giải phóng hoàn toàn Event Loop
#         crawl_task = asyncio.create_task(
#             service.FetchDataDirectly(payload, client_id=email)
#         )

#         # 3. ✅ VÒNG LẶP DUY TRÌ KẾT NỐI (POLLING & HEARTBEAT LOOP)
#         elapsed_seconds = 0

#         while not crawl_task.done():
#             # A. KIỂM TRA LỆNH HỦY TỪ USER
#             # Chỉ hủy khi cờ cancel_registry thực sự được Admin/User bật sang True
#             if cancel_registry.get(email):
#                 crawl_task.cancel()  # Gửi tín hiệu ngắt ngay lập tức vào Task ngầm
#                 await manager.send_json(
#                     {"status": "canceled", "message": "Đã hủy tiến trình cào dữ liệu."},
#                     email,
#                 )
#                 await websocket.close()
#                 manager.disconnect(email)
#                 return

#             # B. CƠ CHẾ HEARTBEAT (Bơm tín hiệu mỗi 30 giây)
#             # Ngăn chặn các bộ định tuyến mạng (Nginx, Cloudflare) ngắt Socket do rỗi (Idle)
#             if elapsed_seconds % 30 == 0 and elapsed_seconds > 0:
#                 try:
#                     await manager.send_json(
#                         {
#                             "status": "heartbeat",
#                             "message": f"Tiến trình vẫn đang thu thập dữ liệu ngầm... ({elapsed_seconds // 60} phút)",
#                         },
#                         email,
#                     )
#                 except Exception:
#                     # Rớt mạng Client -> Bỏ qua lỗi gửi tin để Task ngầm tiếp tục sống
#                     pass

#             # C. NHƯỜNG LUỒNG (1 giây) để hệ điều hành phản hồi các gói tin TCP/Ping ngầm
#             await asyncio.sleep(1)
#             elapsed_seconds += 1

#         # 4. ✅ TRÍCH XUẤT KẾT QUẢ KHI TIẾN TRÌNH HOÀN TẤT
#         try:
#             raw_result = crawl_task.result()

#             # Chuẩn hóa dữ liệu đầu ra
#             actual_data_list = (
#                 raw_result["data"]
#                 if isinstance(raw_result, dict) and "data" in raw_result
#                 else raw_result
#             )

#             # --- NƠI ĐÂY LÀ LOGIC ĐƯA VÀO GOOGLE SHEET CỦA BẠN ---
#             # ...

#             # Gửi kết quả cuối cùng cho Client (Nếu họ vẫn còn đang mở kết nối)
#             if not cancel_registry.get(email):
#                 standardized_response = {
#                     "status": "success",
#                     "message": "Cào dữ liệu thành công!",
#                     "data": actual_data_list,
#                 }
#                 await manager.send_json(standardized_response, email)

#         except asyncio.CancelledError:
#             # Luồng Task bị ngắt do lệnh Cancel -> Thoát êm ái
#             pass
#         except Exception as task_error:
#             # Bắt trọn vẹn lỗi từ Scraper (lỗi parse, rớt mạng HĐH ngầm...)
#             if not cancel_registry.get(email):
#                 await manager.send_json(
#                     {"status": "error", "message": f"Lỗi Scraper: {str(task_error)}"},
#                     email,
#                 )

#         # Chủ động đóng socket khi toàn bộ quy trình kết thúc trọn vẹn
#         await websocket.close()
#         manager.disconnect(email)
#         logger.info(f"WebSocket closed cleanly for {email}")

#     except WebSocketDisconnect:
#         logger.warning(f"WebSocket disconnected for {email} (background task continues)")
#         manager.disconnect(email)

#     except Exception as general_error:
#         logger.error(f"WebSocket error for {email}: {general_error}", exc_info=True)
#         manager.disconnect(email)


import httpx

job_tracker = {}

class WebhookResponse(BaseModel):
    client_id: str
    status: str
    message: Optional[str] = None
    data: Optional[List[Any]] = []

# ========================================================
# 1. API ĐÓN KẾT QUẢ (WEBHOOK) TỪ CÁC MÁY CÀY TRẢ VỀ
# ========================================================
@crawl_fb_router.post("/webhook/crawl-result")
async def receive_webhook_result(payload: WebhookResponse):
    client_id = payload.client_id
    
    # ==========================================
    # 1. GOM DỮ LIỆU TỪ WORKER VÀO TRACKER CHUNG
    # ==========================================
    if client_id in job_tracker:
        job_tracker[client_id]["completed"] += 1
        if payload.status == "success" and payload.data:
            # Đảm bảo có key data để không bị lỗi KeyError
            if "data" not in job_tracker[client_id]:
                job_tracker[client_id]["data"] = []
            
            # Gộp dữ liệu từ máy này vào mảng tổng
            job_tracker[client_id]["data"].extend(payload.data)

    # ==========================================
    # 2. XỬ LÝ GIAO DIỆN REALTIME CHO FRONTEND
    # ==========================================
    # Nếu không phải CRON, tức là người dùng đang xem trên UI -> Bắn WebSocket
    if client_id != "CRON_24H" and client_id != "CRON_HOURLY":
        try:
            if payload.status == "success":
                await manager.send_json(
                    {
                        "status": "partial_success",
                        "message": f"Vừa nhận dữ liệu từ 1 máy chủ ({len(payload.data)} groups).",
                        "data": payload.data
                    }, 
                    client_id
                )
            else:
                await manager.send_json(
                    {"status": "warning", "message": f"Máy chủ báo lỗi: {payload.message}"}, 
                    client_id
                )
        except Exception as e:
            # Chỉ ghi log cảnh báo, KHÔNG làm crash hàm
            logger.warning(f"Người dùng {client_id} đã tắt giao diện, bỏ qua bước gửi realtime. Tiếp tục lưu Data...")
    # ==========================================
    # 3. KIỂM TRA HOÀN THÀNH & CHỐT SỔ LÊN GG SHEETS
    # ==========================================
    # Logic này áp dụng cho TẤT CẢ client_id (CRON hay FE đều chạy)
    if client_id in job_tracker and job_tracker[client_id]["completed"] >= job_tracker[client_id]["total"]:
        logger.info(f"✅ Tất cả các máy chủ đã hoàn tất lệnh cào cho: {client_id}!")
        
        final_data = job_tracker[client_id].get("data", [])
        
        if final_data:
            from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_posts import GoogleSheetServicePosts
            from app.modules.facebook.src.modules.crawl_fb.models.GroupSummary import GroupSummary
            # Tạm thời comment Telegram để tránh spam group khi test tay. 
            # Nếu muốn gửi Telegram luôn thì bạn uncomment 2 dòng dưới:
            # from app.modules.facebook.src.modules.telegram.services.telegram_service import TelegramService
            # telegram = TelegramService()
            
            
            
            # Ép kiểu lại dữ liệu thành các entity GroupSummary chuẩn
            summaries = [GroupSummary(**item) for item in final_data]
            
            try:
                    service_posts_to_db=[]
                    groups_update=[]
                    for summary in summaries:
                        # 2. Tạo một DICTIONARY (Từ điển) MỚI cho bài viết hiện tại
                        groups_data={}
                        groups_data["id"]=summary.id
                        groups_data["last_crawl"]=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        post_data = {}
                        post_data["id"] = str(uuid.uuid4())
                        post_data["group_id"] = summary.id
                        post_data["crawl_date"]=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        post_data["id_member"]=summary.id_member
                        post = summary.hot_post
                        
                        if post is None:
                            continue
                        if post:
                            groups_data["health_score"]=post.score
                            post_data["post_time"] = post.date
                            post_data["content"] = post.content
                            post_data["reactions"] = post.reactions
                            post_data["comments"] = post.comments
                            post_data["shares"] = post.shares
                            post_data["score"] = post.score
                            post_data["media_url"] = post.media_url
                            post_data["image_urls"] = post.images
                            # Nếu API yêu cầu post_url, bạn có thể thêm:
                            post_data["post_url"] = post.url
                        service_posts_to_db.append(post_data)
                    # thêm vào supabase
                    
                    await asyncio.to_thread(create_multiple_postsFB, service_posts_to_db)
                    # cập nhật lại thông tin groups sau mỗi lần crawl
                    await asyncio.to_thread(update_groups_per_crawl, groups_update)
                    # Logic báo Telegram (tùy chọn)
                    # telegram.send_completion_notification()
                    # mes = telegram.format_daily_telegram_report(summaries=summaries)
                    # telegram.send_message(mes)
            except Exception as e:
                logger.error(f"❌ Lỗi khi lưu Google Sheets cho {client_id}: {e}")
        
            # DỌN DẸP THÔNG MINH:
            if client_id == "CRON_24H":
                # CRON không có WebSocket, Webhook phải tự dọn dẹp RAM của nó
                del job_tracker[client_id]
                logger.info("Đã dọn dẹp bộ nhớ cho CRON_24H.")
            else:
                # Nếu là FE, để nguyên đó cho WebSocket lấy data gửi về. 
                # WebSocket sẽ chịu trách nhiệm dọn dẹp sau!
                pass
            
    return {"status": "ok"}

@crawl_fb_router.websocket("/ws/CrawlFbForFE/{email}")
async def websocket_crawl_endpoint(websocket: WebSocket, email: str):
    await websocket.accept()
    await manager.connect(websocket, email, accept=False)
    cancel_registry[email] = False

    def build_status_msg(vps_info_dict):
        """Hàm hỗ trợ tạo chuỗi text báo cáo trạng thái các VPS"""
        lines = []
        for vps_name, info in vps_info_dict.items():
            g_names = ", ".join(info["group_names"])
            if info["status"] == "đang cào":
                lines.append(f"🟢 {vps_name} đang cào {info['count']} groups gồm: {g_names}")
            elif info["status"] == "hoàn thành":
                lines.append(f"✅ {vps_name} cào {info['count']} groups đã hoàn thành")
            elif info["status"] == "lỗi":
                lines.append(f"❌ {vps_name} bị lỗi khi cào {info['count']} groups")
        return "\n".join(lines)

    try:
        data = await websocket.receive_text()
        payload = CrawlPayload(**json.loads(data))
        
        # 1. Lấy thông tin cấu hình và VPS hoạt động
        https_result = await asyncio.to_thread(get_http_main_vps_result)
        MAIN_WEBHOOK_URL = https_result
        active_vps = await asyncio.to_thread(get_active_vps)

        print(f"debug vps: {active_vps}")
        print(f"debug payload: {payload}")
        await manager.send_json({"status": "info", "message": "Đang phân tích và phân bổ công việc..."}, email)
        
        # Xóa bỏ lệnh return chặn ngang nếu có
        if not active_vps or not MAIN_WEBHOOK_URL:
            await manager.send_json({"status": "error", "message": "Lỗi cấu hình VPS hoặc Webhook. Vui lòng kiểm tra lại."}, email)
            return

        # 2. Phân loại VPS theo id_intent & Tạo bộ từ điển ánh xạ URL sang Tên
        vps_by_intent = defaultdict(list)
        vps_null = []
        url_to_name = {} # Map url -> name để hiển thị

        for vps in active_vps:
            intent = vps.get('id_intent')
            vps_url = vps.get('http')
            vps_name = vps.get('name', 'Unknown VPS')
            
            if not vps_url:
                continue
                
            url_to_name[vps_url] = vps_name
            if intent:
                vps_by_intent[intent].append(vps_url)
            else:
                vps_null.append(vps_url)

        # 3. Chia Lô (Phân bổ Groups vào các VPS)
        vps_batches = {vps['http']: [] for vps in active_vps if vps.get('http')}
        intent_counters = defaultdict(int)
        null_counter = 0
        
        for group in payload.groups:
            g_intent = getattr(group, 'id_intent', None)
            clean_group = {"name": group.name, "url": group.url, "id": group.id,"id_member":group.id_member}
            
            if g_intent and g_intent in vps_by_intent and len(vps_by_intent[g_intent]) > 0:
                target_list = vps_by_intent[g_intent]
                idx = intent_counters[g_intent] % len(target_list)
                selected_url = target_list[idx]
                
                vps_batches[selected_url].append(clean_group)
                intent_counters[g_intent] += 1
            else:
                if len(vps_null) > 0:
                    idx = null_counter % len(vps_null)
                    selected_url = vps_null[idx]
                    
                    vps_batches[selected_url].append(clean_group)
                    null_counter += 1
                else:
                    logger.warning(f"Bỏ qua group {group.name} vì không có VPS phù hợp đang hoạt động.")

        active_batches = {url: batch for url, batch in vps_batches.items() if len(batch) > 0}
        total_jobs = len(active_batches)

        if total_jobs == 0:
            await manager.send_json({"status": "error", "message": "Không có task nào được phân bổ cho các máy chủ."}, email)
            return

        # 4. Khởi tạo bộ theo dõi chi tiết từng VPS
        vps_tracking_info = {}
        for url, batch in active_batches.items():
            v_name = url_to_name[url]
            vps_tracking_info[v_name] = {
                "status": "đang cào",
                "count": len(batch),
                "group_names": [g["name"] for g in batch]
            }

        job_tracker[email] = {
            "total": total_jobs, 
            "completed": 0, 
            "data": [],
            "vps_info": vps_tracking_info # Thêm dữ liệu chi tiết vào tracker
        }

        # Gửi thông báo khởi tạo ban đầu cho FE
        initial_msg = build_status_msg(job_tracker[email]["vps_info"])
        await manager.send_json(
            {"status": "processing", "message": f"Bắt đầu phân bổ công việc:\n\n{initial_msg}"}, email
        )

        # 5. PHÁT LỆNH BẰNG HTTPX
        async with httpx.AsyncClient() as client:
            for url, batch in active_batches.items():
                v_name = url_to_name[url]
                # CHÚ Ý: Gửi thêm vps_name vào payload để webhook biết máy nào trả kết quả về
                payload_data = {
                    "batch_data": batch, 
                    "client_id": email, 
                    "webhook_url": MAIN_WEBHOOK_URL,
                    "vps_name": v_name 
                }
                
                try:
                    await client.post(url, json=payload_data, timeout=5)
                except Exception as e:
                    logger.error(f"Lỗi gọi VPS {url}: {e}")
                    job_tracker[email]["completed"] += 1
                    job_tracker[email]["vps_info"][v_name]["status"] = "lỗi"
                    
                    # Cập nhật ngay khi có máy lỗi
                    current_msg = build_status_msg(job_tracker[email]["vps_info"])
                    await manager.send_json({"status": "warning", "message": f"Cập nhật tiến độ:\n\n{current_msg}"}, email)

        # 6. VÒNG LẶP CHỜ WEBHOOK TỪ CÁC MÁY BÁO VỀ
        elapsed_seconds = 0
        while email in job_tracker and job_tracker[email]["completed"] < job_tracker[email]["total"]:
            if cancel_registry.get(email):
                await manager.send_json({"status": "canceled", "message": "Đã ngắt theo dõi giao diện."}, email)
                break

            # Cập nhật tiến độ mỗi 5 giây thay vì 30 giây để FE thấy real-time rõ hơn
            if elapsed_seconds % 5 == 0 and elapsed_seconds > 0:
                try:
                    current_msg = build_status_msg(job_tracker[email]["vps_info"])
                    await manager.send_json(
                        {
                            "status": "heartbeat",
                            "message": f"Tiến độ cào dữ liệu:\n\n{current_msg}",
                        }, email
                    )
                except: pass

            await asyncio.sleep(1)
            elapsed_seconds += 1

        # 7. KẾT THÚC
        if not cancel_registry.get(email):
            final_data = job_tracker.get(email, {}).get("data", [])
            final_msg = build_status_msg(job_tracker.get(email, {}).get("vps_info", {}))
            await manager.send_json(
                {"status": "success", "message": f"Toàn bộ quá trình hoàn tất!\n\n{final_msg}", "data": final_data}, email
            )

        # 8. Dọn dẹp
        if email in job_tracker:
            del job_tracker[email]
            
        await websocket.close()
        manager.disconnect(email)

    except WebSocketDisconnect:
        manager.disconnect(email)
    except Exception as e:
        logger.error(f"WS Error: {e}", exc_info=True)
        manager.disconnect(email)
# ── WRAPPER KIỂM SOÁT LUỒNG ĐĂNG NHẬP ─────────────────────────────────────────

async def controlled_login_task(auth_service: FacebookAuth, email: str, password: str, secret_2fa: Optional[str], cache_file: Path):
    """
    Hàm gọi Playwright ngầm không bị giới hạn bởi Semaphore nữa.
    """
    # Khi tiến trình ngầm được chạy, cập nhật trạng thái file
    if cache_file.exists():
        try:
            status_data = {"status": "PROCESSING", "otp_code": None}
            cache_file.write_text(json.dumps(status_data), encoding="utf-8")
        except Exception:
            pass
    
    # Chạy tác vụ Playwright đồng bộ (sync) vào ThreadPool ngầm
    await asyncio.to_thread(
        auth_service.standalone_login,
        custom_email=email,
        custom_pass=password,
        custom_2fa=secret_2fa
    )

# ── ROUTER ĐĂNG NHẬP (STANDALONE LOGIN) ───────────────────────────────────────

async def controlled_login_task(auth_service: FacebookAuth, email: str, password: str, session_id: str, secret_2fa: Optional[str]):
    """Tiến trình ngầm bọc Playwright."""
    await asyncio.to_thread(
        auth_service.user_login_get_cookie,
        user_email=email,   # Sửa custom_email thành user_email
        user_pass=password, # Sửa custom_pass thành user_pass
        session_id=session_id,
        custom_2fa=secret_2fa
    )

@crawl_fb_router.post("/auth/login", status_code=status.HTTP_200_OK)
async def standalone_login_api(payload: LoginPayload):
    """
    BƯỚC 1: Khởi tạo phiên login ngầm. Tăng thời gian chờ ban đầu và sửa lại trạng thái mặc định.
    """
    auth_service = FacebookAuth(config=Config)
    
    session_id = uuid.uuid4().hex
    otp_cache_file = OTP_DIRECTORY / f"session_{session_id}.json"
    
    status_data = {"status": "INIT", "message": "Khởi tạo trình duyệt ngầm...", "otp_code": None}
    otp_cache_file.write_text(json.dumps(status_data), encoding="utf-8")

    asyncio.create_task(
        controlled_login_task(
            auth_service=auth_service,
            email=payload.email,
            password=payload.password,
            session_id=session_id,
            secret_2fa=payload.secret_2fa
        )
    )

    # TĂNG THỜI GIAN CHỜ BAN ĐẦU LÊN 20 GIÂY để Playwright có đủ thời gian gõ và nhận diện lỗi sai pass
    for _ in range(20):
        await asyncio.sleep(1)
        if otp_cache_file.exists():
            try:
                current = json.loads(otp_cache_file.read_text(encoding="utf-8"))
                st = current.get("status")
                
                if st == "SUCCESS":
                    return {"status": "success", "message": "Đăng nhập thành công!","cookie": current.get("cookie") }
                elif st == "ERROR_WRONG_PASS":
                    # Trả về lỗi Out ngay lập tức
                    return {"status": "error", "message": current.get("message", "Sai email hoặc mật khẩu.")}
                elif st == "ERROR_BOT_BLOCKED":
                    return {"status": "error_bot_blocked", "message": current.get("message", "Bị chặn bởi Bot/CAPTCHA.")}
                elif st == "WAITING_FOR_PHONE_APPROVAL":
                    return {
                        "status": "need_phone_approval", 
                        "session_id": session_id,
                        "message": "Bị chặn xác nhận thiết bị. Vui lòng mở điện thoại phê duyệt."
                    }
                elif st == "WAITING_FOR_OTP":
                    return {
                        "status": "need_otp", 
                        "session_id": session_id,
                        "message": "Yêu cầu nhập mã OTP."
                    }
            except Exception:
                pass

    # SỬA LỖI 2 TẠI ĐÂY: Nếu quá 20s mà mạng chậm Playwright chưa load xong, 
    # TRẢ VỀ TRẠNG THÁI "PROCESSING" (Không báo nhầm là đợi điện thoại nữa)
    return {
        "status": "processing", 
        "session_id": session_id, 
        "message": "Hệ thống đang xử lý đăng nhập, vui lòng đợi thêm giây lát..."
    }

@crawl_fb_router.post("/auth/check-phone-approval", status_code=status.HTTP_200_OK)
async def check_phone_approval_api(payload: CheckPhonePayload):
    """
    BƯỚC 2: API này giờ đây đóng vai trò là "Polling endpoint" dùng chung.
    Nó vừa dùng để chờ khách bấm điện thoại (60s), vừa dùng để theo dõi tiếp 
    nếu Bước 1 bị delay trả về trạng thái "processing".
    """
    otp_cache_file = OTP_DIRECTORY / f"session_{payload.session_id}.json"
    
    if not otp_cache_file.exists():
        return {"status": "error", "message": "Phiên làm việc ngầm đã kết thúc hoặc không tồn tại."}

    # Theo dõi tiến trình ngầm tối đa 60 giây
    for _ in range(60):
        await asyncio.sleep(1)
        if not otp_cache_file.exists():
            return {"status": "success", "message": "Xử lý hoàn tất."}

        try:
            current = json.loads(otp_cache_file.read_text(encoding="utf-8"))
            st = current.get("status")

            if st == "SUCCESS":
                
                return {
                        "status": "success", 
                        "message": "Đăng nhập thành công!",
                        "cookie": current.get("cookie")
                    }
            elif st == "ERROR_WRONG_PASS":
                # Bắt bồi thêm lỗi sai pass nếu trước đó bị delay
                return {"status": "error", "message": current.get("message", "Sai email hoặc mật khẩu.")}
            elif st == "ERROR_BOT_BLOCKED":
                return {"status": "error_bot_blocked", "message": current.get("message", "Bị chặn bởi Bot/CAPTCHA.")}
            elif st == "WAITING_FOR_PHONE_APPROVAL":
                # Nếu tiến trình ngầm mới chuyển sang đợi điện thoại, tiếp tục giữ vòng lặp không làm gì cả
                pass
            elif st == "WAITING_FOR_OTP":
                return {
                    "status": "need_otp", 
                    "session_id": payload.session_id,
                    "message": "Yêu cầu nhập mã OTP."
                }
            elif st == "ERROR":
                return {"status": "error", "message": current.get("message", "Đăng nhập thất bại.")}
        except Exception:
            pass

    return {"status": "error", "message": "Hết thời gian chờ phản hồi từ Facebook."}
@crawl_fb_router.post("/auth/submit-otp", status_code=status.HTTP_200_OK)
async def submit_auth_otp_api(payload: SubmitOTPPayload):
    """
    BƯỚC 3: Nạp mã OTP vào phiên ngầm đang đứng đợi.
    """
    otp_cache_file = OTP_DIRECTORY / f"session_{payload.session_id}.json"
    
    if not otp_cache_file.exists():
        return {"status": "error", "message": "Phiên nhập OTP đã hết hạn (Quá thời gian chờ)."}
    
    try:
        # Ghi mã OTP vào file, đổi state thành RECEIVED_OTP để Playwright ngầm nhận diện
        current = json.loads(otp_cache_file.read_text(encoding="utf-8"))
        current["status"] = "RECEIVED_OTP"
        current["otp_code"] = payload.otp_code
        otp_cache_file.write_text(json.dumps(current), encoding="utf-8")

        # Đứng giữ HTTP tối đa 15 giây để chờ Playwright gõ mã và chốt thành công
        for _ in range(15):
            await asyncio.sleep(1)
            if not otp_cache_file.exists():
                return {"status": "success", "message": "Xác thực thành công!","cookie": check.get("cookie")}
            
            try:
                check = json.loads(otp_cache_file.read_text(encoding="utf-8"))
                if check.get("status") == "SUCCESS":
                    return {"status": "success", "message": "Xác thực OTP thành công!"}
                elif check.get("status") in ["ERROR", "ERROR_WRONG_PASS"]:
                    return {"status": "error", "message": check.get("message", "Mã OTP sai hoặc hết hạn.")}
            except Exception:
                pass

        return {"status": "success", "message": "Đã nạp mã OTP, hệ thống đang hoàn tất..."}

    except Exception as e:
        return {"status": "error", "message": f"Lỗi xử lý nạp OTP: {str(e)}"}


# ── ENDPOINT CẬP NHẬT GROUP ─────────────────────────────────────────────────

@crawl_fb_router.put("/groups/update", status_code=status.HTTP_200_OK, response_model=UpdateGroupResponse)
async def update_group_api(
    group_url: str,
    request: UpdateGroupRequest,
    service: CrawlService = Depends(get_crawl_service)
):
    """
    Endpoint cập nhật thông tin Group Facebook
    
    Parameters:
    - group_url: URL của group cần cập nhật
    - request: UpdateGroupRequest chứa các trường cần cập nhật
    
    Returns:
    - UpdateGroupResponse với status, message và dữ liệu được cập nhật
    """
    try:
        # Map tên trường từ frontend sang Google Sheets
        update_data = {}
        
        if request.group_name:
            update_data[Config.NAME_GROUP_GG_SHEET] = request.group_name
        if request.url:
            update_data[Config.NAME_URL_GG_SHEET] = request.url
        if request.intent:
            update_data[Config.INTENT_GG_SHEET] = request.intent
        if request.members is not None:
            update_data[Config.MEMBERS_GG_SHEET] = request.members
        if request.posts_per_week is not None:
            update_data[Config.POSTS_PER_WEEK_GG_SHEET] = request.posts_per_week
        if request.health_score is not None:
            update_data[Config.HEALTH_SCORE_GG_SHEET] = request.health_score
        if request.status:
            # Nếu trường status tồn tại, lưu nó (tùy thuộc vào Config)
            update_data["status"] = request.status
        if request.industry is not None:
            update_data["industry"] = request.industry
        if request.tier is not None:
            update_data["tier"] = request.tier
        if request.team is not None:
            update_data["team"] = request.team
        if request.icp is not None:
            update_data["icp"] = request.icp
        if request.icp_desc is not None:
            update_data["icp_desc"] = request.icp_desc
        
        result = await service.update_group(group_url=group_url, update_data=update_data)
        
        return UpdateGroupResponse(
            success=True,
            message=result.get("message", "Cập nhật thành công"),
            data=result.get("data")
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi cập nhật group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi cập nhật group: {str(e)}"
        )

@crawl_fb_router.delete("/groups/delete", status_code=status.HTTP_200_OK)
async def delete_group_api(
    group_url: str,
    service: CrawlService = Depends(get_crawl_service)
):
    """
    Endpoint xóa Group Facebook
    """
    try:
        result = await service.delete_group(group_url=group_url)
        return {
            "success": True,
            "message": result.get("message", "Xóa thành công"),
            "data": result.get("data")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Lỗi xóa group: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xóa group: {str(e)}"
        )





