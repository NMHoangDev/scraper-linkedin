from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import List
import os
import httpx

from app.modules.facebook.src.modules.facebook.services.facebook_scraper import FacebookScraper, GroupTarget
from app.modules.facebook.src.core.config.env import Config
from app.modules.facebook.src.core.utils.logger import setup_logger

logger = setup_logger(__name__)
worker_router = APIRouter()
scraper = FacebookScraper(Config())

class GroupItemDTO(BaseModel):
    name: str
    url: str
    id: str

class CrawlBatchRequest(BaseModel):
    batch_data: List[GroupItemDTO]
    client_id: str
    webhook_url: str

def process_and_callback(target_groups: List[GroupTarget], worker_email: str, client_id: str, webhook_url: str):
    """Tiến trình cào ngầm. Xong việc sẽ tự gọi Webhook trả đồ."""
    logger.info(f"🔄 Bắt đầu cào ngầm {len(target_groups)} groups cho Client: {client_id}")
    
    try:
        results = scraper.scrape_groups(groups=target_groups, custom_email=worker_email, client_id=client_id)
        payload = {
            "client_id": client_id,
            "status": "success",
            "data": jsonable_encoder(results)
        }
    except Exception as e:
        logger.error(f"❌ Lỗi cào ngầm: {e}", exc_info=True)
        payload = {
            "client_id": client_id,
            "status": "error",
            "message": str(e),
            "data": []
        }

    # Bắn Webhook trả về Main VPS
    try:
        with httpx.Client() as client:
            client.post(webhook_url, json=payload, timeout=30)
            logger.info(f"✅ Đã trả kết quả qua Webhook cho Main VPS thành công.")
    except Exception as e:
        logger.error(f"❌ Lỗi kết nối Webhook trả về Main VPS: {e}")

@worker_router.post("/internal/crawl-batch")
def execute_crawl_batch(req: CrawlBatchRequest, background_tasks: BackgroundTasks):
    worker_email = os.getenv("FB_DEFAULT_EMAIL")
    target_groups = [GroupTarget(name=item.name, url=item.url, id=item.id) for item in req.batch_data]

    # Quăng vào luồng ngầm (Luồng chính trả HTTP 200 luôn)
    background_tasks.add_task(
        process_and_callback, 
        target_groups=target_groups, 
        worker_email=worker_email, 
        client_id=req.client_id, 
        webhook_url=req.webhook_url
    )

    return {"status": "acknowledged", "message": "Đã nhận lệnh, đang cào ngầm..."}