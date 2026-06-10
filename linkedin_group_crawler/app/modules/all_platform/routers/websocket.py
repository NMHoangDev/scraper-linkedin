from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.modules.all_platform.websocket import manager

router = APIRouter()

@router.websocket("/ws/crawl-status")
async def crawl_status_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Just keep connection open, receive ping if necessary
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
