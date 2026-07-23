"""In-process fan-out bus for authenticated admin SSE clients."""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator

from fastapi import Request


class AdminEventBus:
    def __init__(self, queue_size: int = 100) -> None:
        self._queue_size = queue_size
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    async def publish(self, event: dict[str, Any]) -> None:
        for queue in list(self._subscribers):
            if queue.full():
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                # A subscriber that remains stalled will catch the next event.
                pass

    async def stream(
        self,
        request: Request,
        *,
        heartbeat_seconds: float = 15.0,
    ) -> AsyncIterator[str]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(
            maxsize=self._queue_size,
        )
        self._subscribers.add(queue)
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(
                        queue.get(),
                        timeout=heartbeat_seconds,
                    )
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
                    continue

                payload = json.dumps(
                    event,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    default=str,
                )
                yield f"event: bridge-event\ndata: {payload}\n\n"
        finally:
            self._subscribers.discard(queue)


admin_event_bus = AdminEventBus()
