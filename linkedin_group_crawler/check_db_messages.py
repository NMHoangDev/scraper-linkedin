import asyncio
import os
import sys

# Add current path to sys.path so we can import app modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.modules.all_platform.zalo.services.supabase_service import _rest, is_supabase_configured

async def main():
    print(f"Supabase configured: {is_supabase_configured()}")
    try:
        rows = await _rest(
            "GET",
            "zalo_messages",
            params={
                "select": "id,content,created_at,timestamp_text,sender_name,is_sent",
                "group_id": "eq.4774121453662043180",
                "order": "created_at.desc",
                "limit": "10"
            }
        )
        print("Latest 10 messages in database:")
        for r in rows:
            print(f"- ID: {r.get('id')} | Content: {r.get('content')} | Sender: {r.get('sender_name')} | Created At: {r.get('created_at')} | Sent: {r.get('is_sent')}")
    except Exception as e:
        print(f"Error querying messages: {e}")

if __name__ == "__main__":
    asyncio.run(main())
