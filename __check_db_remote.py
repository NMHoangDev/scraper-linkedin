"""
Check Supabase DB state for FB Post KPI flow - write results to file.
"""
import urllib.request
import urllib.error
import json
import os

os.chdir(r"D:\CrawlDataLinkedin\linkedin_group_crawler")

BACKEND_URL = "https://aba9-14-174-210-31.ngrok-free.app"
SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"

def sb_get(table, select="*", filters=None, limit=100):
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}"
    if filters:
        for k, v in filters.items():
            url += f"&{k}=eq.{urllib.request.quote(str(v))}"
    url += f"&limit={limit}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

out = []

def log(msg):
    out.append(msg)

log("=" * 60)
log("1. fb_inbox_accounts")
log("=" * 60)
status, data = sb_get("fb_inbox_accounts", select="*")
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  id={str(row.get('id'))}")
        log(f"  user_id={row.get('user_id')!r}")
        log(f"  fb_user_id={row.get('fb_user_id')!r}")
        log(f"  id_member={str(row.get('id_member'))}")
        log(f"  is_active={row.get('is_active')}")
        log("")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("2. fb_post_kpi")
log("=" * 60)
status, data = sb_get("fb_post_kpi", select="*", limit=20)
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  job_id={row.get('job_id')!r}")
        log(f"  id_member={str(row.get('id_member'))}")
        log(f"  user_id={row.get('user_id')!r}")
        log(f"  post_url={row.get('post_url')!r}")
        log(f"  is_confirmed={row.get('is_confirmed')}")
        log("")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("3. app_users (sample)")
log("=" * 60)
status, data = sb_get("app_users", select="id,email,role,is_active", limit=20)
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  id={str(row.get('id'))}  email={row.get('email')!r}  role={row.get('role')}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("4. teams")
log("=" * 60)
status, data = sb_get("teams", select="*")
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  id={str(row.get('id'))}  name={row.get('name_team')!r}  leader={str(row.get('id_leader'))}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("5. member_of_teams")
log("=" * 60)
status, data = sb_get("member_of_teams", select="*")
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  id_teams={str(row.get('id_teams'))}  id_member={str(row.get('id_member'))}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("6. team_associations")
log("=" * 60)
status, data = sb_get("team_associations", select="*")
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Total rows: {len(data)}")
    for row in data:
        log(f"  member_id={str(row.get('member_id'))}  leader_id={str(row.get('leader_id'))}  is_active={row.get('is_active')}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("7. Check: user_id starting with 'fb_' in fb_inbox_accounts")
log("=" * 60)
status, data = sb_get("fb_inbox_accounts", select="user_id,fb_user_id,id_member,is_active",
                       filters={"user_id": "ilike.fb_%25"})
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Found {len(data)} rows with user_id like 'fb_%'")
    for row in data:
        log(f"  user_id={row.get('user_id')!r}  fb_user_id={row.get('fb_user_id')!r}  id_member={str(row.get('id_member'))}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("8. Check: fb_post_kpi.is_confirmed column")
log("=" * 60)
status, data = sb_get("fb_post_kpi", select="id,job_id,is_confirmed", limit=5)
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Sample: {[{'job_id': d.get('job_id'), 'is_confirmed': d.get('is_confirmed')} for d in data]}")
else:
    log(f"Error: {data[:200]}")

log("")
log("=" * 60)
log("9. Extension user_id format check")
log("=" * 60)
log("  Extension generates: user_id = 'fb_' + c_user cookie (FB real UID)")
log("  e.g., if FB UID=10001, user_id='fb_10001'")
log("  Must match fb_inbox_accounts.user_id column")

# Write results
with open(r"D:\CrawlDataLinkedin\__db_check.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Results written to __db_check.txt")
