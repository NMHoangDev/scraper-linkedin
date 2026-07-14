import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.modules.all_platform.websocket import manager

router = APIRouter()

@router.websocket("/ws/crawl-status")
async def crawl_status_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Keepalive ping task to prevent proxy/nginx from closing idle connections
        async def keepalive():
            while True:
                await asyncio.sleep(30)
                try:
                    await websocket.send_text('{"event":"ping"}')
                except Exception:
                    break

        ping_task = asyncio.create_task(keepalive())
        try:
            while True:
                # Just keep connection open, receive ping if necessary
                data = await websocket.receive_text()
        finally:
            ping_task.cancel()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        # Mạng rớt không đúng chuẩn (không gửi close frame) vẫn phải dọn kết nối,
        # tránh "half-open" treo vô thời hạn trong active_connections.
        manager.disconnect(websocket)
