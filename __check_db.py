import httpx
import json

SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"
HEADERS = {"apikey": ROLE_KEY, "Authorization": f"Bearer {ROLE_KEY}"}

member_id = "613877fc-c12a-4fc6-837d-10f1aa80a29a"

out = []

def log(msg):
    out.append(str(msg))

log("=== 1. app_users record ===")
resp = httpx.get(
    f"{SUPABASE_URL}/rest/v1/app_users?id=eq.{member_id}&select=*",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp.status_code}")
try:
    d = resp.json()
    log(json.dumps(d, ensure_ascii=False, indent=2)[:1000])
except:
    log(resp.text[:500])

log("\n=== 2. fb_inbox_kpi for this member (BEFORE sync) ===")
resp2 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/fb_inbox_kpi?id_member=eq.{member_id}&select=*",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp2.status_code}")
try:
    d2 = resp2.json()
    log(json.dumps(d2, ensure_ascii=False, indent=2))
except:
    log(resp2.text[:500])

log("\n=== 3. social_accounts for this user ===")
resp3 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/social_accounts?app_user_id=eq.{member_id}&select=*",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp3.status_code}")
try:
    d3 = resp3.json()
    log(json.dumps(d3, ensure_ascii=False, indent=2)[:1000])
except:
    log(resp3.text[:500])

log("\n=== 4. Call KPI fb-inbox-sync ===")
resp4 = httpx.post(
    "http://localhost:8000/api/all-platform/kpi/fb-inbox-sync",
    json={
        "leader_email": "minhchautran@gmail.com",
        "member_email": "minhchautran@gmail.com",
        "conv_ids": ["1004421572518915"],
        "user_id": "fb_61590643803233",
        "is_lead": False
    },
    headers={"Content-Type": "application/json"},
    timeout=15.0
)
log(f"Status: {resp4.status_code}")
try:
    d4 = resp4.json()
    log(json.dumps(d4, ensure_ascii=False, indent=2))
except:
    log(resp4.text[:500])

log("\n=== 5. fb_inbox_kpi AFTER sync ===")
resp5 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/fb_inbox_kpi?id_member=eq.{member_id}&select=*",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp5.status_code}")
try:
    d5 = resp5.json()
    log(json.dumps(d5, ensure_ascii=False, indent=2))
except:
    log(resp5.text[:500])

with open("D:/CrawlDataLinkedin/__db_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Done - results in __db_result.txt")
