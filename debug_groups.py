import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv("d:/CrawlDataLinkedin/linkedin_group_crawler/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

with open("debug.txt", "w", encoding="utf-8") as f:
    res = supabase.table("facebook_groups").select("id, group_name, chay_24h, start_time_in_day, end_time_in_day, time_crawl, id_member").execute()
    groups = res.data or []
    
    f.write(f"Total groups found: {len(groups)}\n")
    
    active = [g for g in groups if g.get("chay_24h") is True]
    f.write(f"Active groups (chay_24h=True): {len(active)}\n")
    
    for g in active:
        f.write(f"Name: {g.get('group_name')} | Start: {g.get('start_time_in_day')} | End: {g.get('end_time_in_day')} | Interval: {g.get('time_crawl')} | User: {g.get('id_member')}\n")
