import httpx
import os
import asyncio
from pprint import pprint

SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

async def main():
    async with httpx.AsyncClient() as client:
        # Check permissions for the conversation
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/zalo_conversation_permissions",
            headers=headers,
            params={"conversation_id": "eq.4740120513800124271"}
        )
        print("Permissions:", r.json())
        
        # Check messages for the conversation
        r2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/zalo_messages",
            headers=headers,
            params={"group_id": "eq.4740120513800124271", "limit": 5}
        )
        print("Messages by group_id:", r2.json())
        
        # In case it's group_name
        r3 = await client.get(
            f"{SUPABASE_URL}/rest/v1/zalo_messages",
            headers=headers,
            params={"group_name": "eq.4740120513800124271", "limit": 5}
        )
        print("Messages by group_name:", r3.json())

        # Check zalo_groups for this conversation
        r4 = await client.get(
            f"{SUPABASE_URL}/rest/v1/zalo_groups",
            headers=headers,
            params={"group_id": "eq.4740120513800124271"}
        )
        print("Groups:", r4.json())

if __name__ == "__main__":
    asyncio.run(main())
