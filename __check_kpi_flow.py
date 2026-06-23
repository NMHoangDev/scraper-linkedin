"""
Check Supabase DB state for FB Post KPI flow.
Tests: fb_inbox_accounts, fb_post_kpi, teams, member_of_teams, team_associations, app_users
"""
import os
os.chdir(r"D:\CrawlDataLinkedin\linkedin_group_crawler")
import sys
sys.path.insert(0, ".")

from supabase import create_client
import json

def get_client():
    import os
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def check_tables(sb):
    print("=" * 60)
    print("1. CHECK: fb_inbox_accounts")
    print("=" * 60)
    r = sb.table("fb_inbox_accounts").select("*").execute()
    rows = r.data or []
    print(f"Total rows: {len(rows)}")
    if rows:
        for row in rows:
            print(f"  user_id={row.get('user_id')!r:30s} fb_user_id={row.get('fb_user_id')!r:20s} id_member={row.get('id_member')!r:40s} is_active={row.get('is_active')}")
    else:
        print("  [EMPTY] - NO ROWS! This is the problem if you're trying to post.")

    print()
    print("=" * 60)
    print("2. CHECK: fb_post_kpi")
    print("=" * 60)
    r = sb.table("fb_post_kpi").select("*").limit(20).execute()
    rows = r.data or []
    print(f"Total rows: {len(rows)}")
    if rows:
        for row in rows:
            print(f"  job_id={row.get('job_id')!r:40s} id_member={str(row.get('id_member'))!r:40s} post_url={row.get('post_url')!r}")
    else:
        print("  [EMPTY] - No KPI records yet.")

    print()
    print("=" * 60)
    print("3. CHECK: app_users (sample)")
    print("=" * 60)
    r = sb.table("app_users").select("id, email, role, is_active").limit(10).execute()
    rows = r.data or []
    print(f"Total rows: {len(rows)}")
    for row in rows:
        print(f"  id={str(row.get('id'))!r:40s} email={row.get('email')!r:40s} role={row.get('role')}")

    print()
    print("=" * 60)
    print("4. CHECK: teams")
    print("=" * 60)
    r = sb.table("teams").select("*").execute()
    rows = r.data or []
    print(f"Total rows: {len(rows)}")
    for row in rows:
        print(f"  id={str(row.get('id'))!r:40s} name={row.get('name_team')!r:30s} leader={str(row.get('id_leader'))!r:40s}")

    print()
    print("=" * 60)
    print("5. CHECK: member_of_teams")
    print("=" * 60)
    r = sb.table("member_of_teams").select("*").execute()
    rows = r.data or []
    print(f"Total rows: {len(rows)}")
    for row in rows:
        print(f"  id_teams={str(row.get('id_teams'))!r:40s} id_member={str(row.get('id_member'))!r:40s}")

    print()
    print("=" * 60)
    print("6. CHECK: team_associations")
    print("=" * 60)
    try:
        r = sb.table("team_associations").select("*").execute()
        rows = r.data or []
        print(f"Total rows: {len(rows)}")
        for row in rows:
            print(f"  member_id={str(row.get('member_id'))!r:40s} leader_id={str(row.get('leader_id'))!r:40s}")
    except Exception as e:
        print(f"  [ERROR] {e} - Table may not exist")

    print()
    print("=" * 60)
    print("7. CHECK: user_id format expected by resolve_id_member")
    print("=" * 60)
    # Show what user_ids the extension would generate
    print("  Extension generates user_id = f'fb_{c_user}' where c_user = FB real UID")
    print("  e.g., if FB UID = 10001, user_id = 'fb_10001'")
    print("  The fb_inbox_accounts.user_id column MUST match this format.")
    print()
    print("  Example query - find if any fb_inbox_accounts has user_id starting with 'fb_':")
    r = sb.table("fb_inbox_accounts").select("user_id, fb_user_id").ilike("user_id", "fb_%").execute()
    fb_rows = r.data or []
    print(f"  Found {len(fb_rows)} rows with user_id starting with 'fb_'")
    for row in fb_rows:
        print(f"    user_id={row.get('user_id')!r}")

    print()
    print("=" * 60)
    print("8. CHECK: is_confirmed column on fb_post_kpi")
    print("=" * 60)
    try:
        r = sb.table("fb_post_kpi").select("id, job_id, is_confirmed").limit(5).execute()
        print(f"  is_confirmed column exists. Sample:")
        for row in (r.data or []):
            print(f"    job_id={row.get('job_id')!r:40s} is_confirmed={row.get('is_confirmed')}")
    except Exception as e:
        print(f"  [ERROR] {e} - is_confirmed column may not exist")

    print()
    print("=" * 60)
    print("9. CHECK: RLS policies on fb_post_kpi")
    print("=" * 60)
    try:
        r = sb.table("fb_post_kpi").select("id").limit(1).execute()
        print(f"  SELECT policy: OK (found {len(r.data or [])} rows)")
    except Exception as e:
        print(f"  [ERROR] SELECT policy may be blocking: {e}")
    try:
        r = sb.postgrest.table("fb_post_kpi").insert({
            "id_member": "00000000-0000-0000-0000-000000000000",
            "id_leader": "00000000-0000-0000-0000-000000000000",
            "user_id": "test_resolve_check",
            "job_id": "test_resolve_check",
        }).execute()
        print(f"  INSERT policy: OK (service_role bypasses RLS)")
        # Cleanup
        try:
            sb.table("fb_post_kpi").delete().eq("job_id", "test_resolve_check").execute()
            print(f"  DELETE test row: OK")
        except:
            pass
    except Exception as e:
        print(f"  [ERROR] INSERT: {e}")

if __name__ == "__main__":
    print("Connecting to Supabase...")
    sb = get_client()
    check_tables(sb)
    print("\nDone.")
