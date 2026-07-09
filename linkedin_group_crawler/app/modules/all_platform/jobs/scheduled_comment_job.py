"""APScheduler job for executing due scheduled comments."""

from __future__ import annotations

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.core.logger import get_logger
from app.modules.all_platform.services.scheduled_comment_service import (
    get_due_comments,
    process_comment,
)

logger = get_logger(__name__)


async def _process_due() -> None:
    records = get_due_comments()
    if not records:
        return

    logger.info(f"Processing {len(records)} due scheduled comment(s)")
    for record in records:
        try:
            await process_comment(record)
        except Exception as exc:
            logger.error(f"Job failed for comment {record.get('id')}: {exc}")


def setup_scheduled_comment_job() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _process_due,
        trigger=IntervalTrigger(seconds=30),
        id="scheduled_comment_executor",
        name="Execute due scheduled comments",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduled comment job started (interval=30s)")
    return scheduler
