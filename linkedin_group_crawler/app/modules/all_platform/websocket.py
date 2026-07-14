import asyncio
import json
import logging
import time
from fastapi import WebSocket

logger = logging.getLogger(__name__)

# active_crawls không có TTL trước đây có thể treo vĩnh viễn nếu 1 crawl bắt đầu
# (crawl_started) nhưng không bao giờ nhận crawl_success/crawl_error (worker crash).
ACTIVE_CRAWL_TTL_SECONDS = 3600


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.active_crawls: dict = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self._prune_stale_crawls()
        # Bắn lại các tiến trình cào đang dở cho người dùng mới kết nối
        for crawl_msg in self.active_crawls.values():
            try:
                await websocket.send_text(json.dumps(crawl_msg["payload"]))
            except Exception:
                logger.warning("Gửi lại trạng thái crawl đang dở cho client mới thất bại", exc_info=True)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    def _prune_stale_crawls(self):
        now = time.monotonic()
        stale_keys = [
            key for key, entry in self.active_crawls.items()
            if now - entry["ts"] > ACTIVE_CRAWL_TTL_SECONDS
        ]
        for key in stale_keys:
            del self.active_crawls[key]
        if stale_keys:
            logger.warning(f"Đã dọn {len(stale_keys)} active_crawls quá hạn (worker/crawl có thể đã crash): {stale_keys}")

    async def broadcast(self, message: dict):
        event = message.get("event")
        user_id = message.get("user_id", "unknown")

        self._prune_stale_crawls()
        if event == "crawl_started":
            self.active_crawls[user_id] = {"payload": message, "ts": time.monotonic()}
        elif event in ["crawl_success", "crawl_error"]:
            self.active_crawls.pop(user_id, None)

        if not self.active_connections:
            return
        msg_str = json.dumps(message)
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(msg_str)
            except Exception:
                logger.warning("Gửi broadcast tới 1 client thất bại, sẽ dọn kết nối này", exc_info=True)
                dead_connections.append(connection)
        for connection in dead_connections:
            self.disconnect(connection)

manager = ConnectionManager()
