import asyncio
import json
import os
from pathlib import Path

# Fix relative imports
import sys
sys.path.insert(0, str(Path.cwd()))

from loguru import logger
logger.remove()
logger.add(sys.stdout)

from app.modules.all_platform.zalo.services.zca_auth_store import load_zca_auth
from app.modules.all_platform.zalo.services.zca_api_bridge import get_zca_group_history, get_zca_user_history

async def main():
    auth = await load_zca_auth('zl_8d9a6a45')
    group_id = '8711677600064921995'
    print(f"Retrieving group chat history for groupId={group_id} using zl_8d9a6a45...")
    try:
        msgs = await get_zca_group_history(auth, group_id, count=10)
        print("Messages count:", len(msgs))
        if msgs:
            print("First message ID:", msgs[0].message_id)
            print("First message content:", msgs[0].content)
    except Exception as e:
        print(f"Failed to retrieve group history: {e}")

asyncio.run(main())
