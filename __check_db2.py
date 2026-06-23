"""
Deep check: what is fb_inbox_accounts.user_id really?
"""
import urllib.request
import json
import os

os.chdir(r"D:\CrawlDataLinkedin\linkedin_group_crawler")

SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"

def sb_get(url):
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

# Get ALL fb_inbox_accounts rows
log("=" * 60)
log("fb_inbox_accounts - ALL columns (raw)")
log("=" * 60)
status, data = sb_get(f"{SUPABASE_URL}/rest/v1/fb_inbox_accounts?select=*")
log(f"Status: {status}")
if isinstance(data, list):
    log(f"Rows: {len(data)}")
    for row in data:
        log(f"  FULL ROW: {json.dumps(row, ensure_ascii=False)}")
        # Check what user_id looks like
        uid = row.get("user_id")
        log(f"  user_id repr: {repr(uid)}")
        log(f"  user_id type: {type(uid)}")
        log(f"  user_id starts with 'fb_': {str(uid).startswith('fb_') if uid else False}")
        log("")
else:
    log(f"Error: {data}")

# Check what the extension sends vs what resolve_id_member expects
log("")
log("=" * 60)
log("Extension user_id format analysis")
log("=" * 60)
# Extension: fb_<c_user> where c_user is FB real UID
# The fb_inbox_accounts has fb_user_id='61590643803233'
# So extension sends: 'fb_61590643803233'
log("  Extension will send: user_id = 'fb_' + '61590643803233' = 'fb_61590643803233'")
log("  resolve_id_member() looks for: fb_inbox_accounts.user_id = 'fb_61590643803233'")
log("  But fb_inbox_accounts.user_id appears to be EMPTY or NULL")
log("")
log("  This is the ROOT CAUSE of the KPI save failure.")

# Test the resolve with the ACTUAL format
log("")
log("=" * 60)
log("Test: what user_id values would resolve correctly?")
log("=" * 60)
# If fb_user_id = '61590643803233', then:
# - Extension sends: 'fb_61590643803233'
# - Fallback looks for: fb_user_id = '61590643803233'
# So the fb_inbox_accounts row SHOULD have:
#   either user_id = 'fb_61590643803233' OR user_id = '61590643803233'
log("  Row has fb_user_id='61590643803233'")
log("  Extension sends user_id='fb_61590643803233'")
log("  resolve_id_member() tries:")
log("    1. WHERE user_id = 'fb_61590643803233' -> FAILS (user_id is empty/null)")
log("    2. WHERE fb_user_id = '61590643803233' -> SHOULD WORK (fallback)")
log("  -> But the existing row has is_active=True, so fallback SHOULD find it")

# Test with real user_id from extension
log("")
log("=" * 60)
log("Test: POST /fb/post-kpi/save with real fb_user_id as user_id")
log("=" * 60)
BACKEND_URL = "https://aba9-14-174-210-31.ngrok-free.app"
payload = {
    "job_id": "test_real_001",
    "user_id": "61590643803233",  # fb_user_id (fallback case)
    "post_url": "https://facebook.com/test",
    "content": "test content",
    "target_type": "profile",
    "platform": "facebook"
}
req = urllib.request.Request(
    f"{BACKEND_URL}/api/all-platform/fb/post-kpi/save",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "secret_api_key"
    },
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = resp.status, resp.read().decode("utf-8")
except urllib.error.HTTPError as e:
    result = e.code, e.read().decode("utf-8")
except Exception as e:
    result = 0, str(e)
log(f"Status: {result[0]}")
log(f"Body: {result[1]}")
with open(r"D:\CrawlDataLinkedin\__db_check2.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Results written to __db_check2.txt")
