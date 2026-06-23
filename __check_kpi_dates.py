"""
Check KPI calculation accuracy - verify comments and inbox are filtered correctly
by current week date range.
"""
import os
import sys
from datetime import date, timedelta

# Load env
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not url or not key:
    print("[ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase: Client = create_client(url, key)

# Calculate current week range (Monday to Sunday)
today = date.today()
monday = today - timedelta(days=today.weekday())
sunday = monday + timedelta(days=6)

print("=" * 60)
print("DATE RANGE CHECK")
print("=" * 60)
print(f"TODAY: {today}")
print(f"CURRENT WEEK: {monday} -> {sunday}")
print()

# Check seeding_content_kpi table structure and data
print("=" * 60)
print("1. CHECK seeding_content_kpi TABLE")
print("=" * 60)

# Get sample data to check current_day format
seeding_sample = supabase.table("seeding_content_kpi").select("*").limit(5).execute()
if seeding_sample.data:
    print("Table exists, sample data:")
    for row in seeding_sample.data:
        current_day = row.get("current_day")
        print(f"  - current_day: '{current_day}' (type: {type(current_day).__name__})")
        print(f"    id_member: {row.get('id_member')}")
        print(f"    verify: {row.get('verify')}")
        print()
else:
    print("No data in seeding_content_kpi")

# Check fb_inbox_kpi table
print("=" * 60)
print("2. CHECK fb_inbox_kpi TABLE")
print("=" * 60)

inbox_sample = supabase.table("fb_inbox_kpi").select("*").limit(5).execute()
if inbox_sample.data:
    print("Table exists, sample data:")
    for row in inbox_sample.data:
        synced_at = row.get("synced_at")
        print(f"  - synced_at: '{synced_at}' (type: {type(synced_at).__name__})")
        print(f"    id_member: {row.get('id_member')}")
        print(f"    conv_id: {row.get('conv_id')}")
        print()
else:
    print("No data in fb_inbox_kpi")

# Check kpi_tracker
print("=" * 60)
print("3. CHECK kpi_tracker TABLE")
print("=" * 60)

kpi_sample = supabase.table("kpi_tracker").select("*").eq("status", "active").limit(5).execute()
if kpi_sample.data:
    print("Active KPIs found:")
    for row in kpi_sample.data:
        start = row.get("start_date")
        end = row.get("end_date")
        print(f"  - Member: {row.get('id_member')}")
        print(f"    start_date: '{start}' (type: {type(start).__name__})")
        print(f"    end_date: '{end}' (type: {type(end).__name__})")
        print(f"    kpi_comment: {row.get('kpi_comment')}")
        print(f"    kpi_inbox: {row.get('kpi_inbox')}")
        print()
else:
    print("No active KPIs")

# Test date filtering logic
print("=" * 60)
print("4. TEST DATE FILTERING LOGIC")
print("=" * 60)

# Get a sample member
members = supabase.table("app_users").select("id, email").limit(3).execute()
if members.data:
    for member in members.data:
        member_id = member["id"]
        email = member["email"]
        print(f"\nMember: {email} ({member_id})")

        # Test seeding_content_kpi filter
        seeding_filtered = (
            supabase.table("seeding_content_kpi")
            .select("id, current_day")
            .eq("id_member", member_id)
            .gte("current_day", str(monday))
            .lte("current_day", str(sunday))
            .execute()
        )
        print(f"  Comments in current week: {len(seeding_filtered.data or [])}")

        # Test without week filter
        seeding_all = (
            supabase.table("seeding_content_kpi")
            .select("id, current_day")
            .eq("id_member", member_id)
            .execute()
        )
        print(f"  Total comments (all time): {len(seeding_all.data or [])}")

        # Test fb_inbox_kpi filter
        inbox_filtered = (
            supabase.table("fb_inbox_kpi")
            .select("id, synced_at")
            .eq("id_member", member_id)
            .gte("synced_at", str(monday))
            .lte("synced_at", str(sunday) + "T23:59:59")
            .execute()
        )
        print(f"  Inbox FB in current week: {len(inbox_filtered.data or [])}")

        # Test without week filter
        inbox_all = (
            supabase.table("fb_inbox_kpi")
            .select("id, synced_at")
            .eq("id_member", member_id)
            .execute()
        )
        print(f"  Total inbox FB (all time): {len(inbox_all.data or [])}")

print()
print("=" * 60)
print("5. CHECK DATE FORMAT ISSUES")
print("=" * 60)

# Check if there are any date format mismatches
seeding_dates = supabase.table("seeding_content_kpi").select("current_day").limit(100).execute()
if seeding_dates.data:
    date_formats = set()
    for row in seeding_dates.data:
        cd = row.get("current_day")
        if cd:
            # Check if it's date or datetime
            if "T" in str(cd):
                date_formats.add("datetime")
            else:
                date_formats.add("date")
    print(f"seeding_content_kpi.current_day formats: {date_formats}")

inbox_dates = supabase.table("fb_inbox_kpi").select("synced_at").limit(100).execute()
if inbox_dates.data:
    date_formats = set()
    for row in inbox_dates.data:
        sa = row.get("synced_at")
        if sa:
            if "T" in str(sa):
                date_formats.add("datetime")
            else:
                date_formats.add("date")
    print(f"fb_inbox_kpi.synced_at formats: {date_formats}")

print()
print("v Check completed!")
