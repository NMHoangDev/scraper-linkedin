import httpx
import json

SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"
HEADERS = {"apikey": ROLE_KEY, "Authorization": f"Bearer {ROLE_KEY}"}

out = []

def log(msg):
    out.append(str(msg))

# Check fb_inbox_accounts
log("=== fb_inbox_accounts (all records) ===")
resp = httpx.get(
    f"{SUPABASE_URL}/rest/v1/fb_inbox_accounts?select=*&limit=50",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp.status_code}")
try:
    d = resp.json()
    log(f"Total records: {len(d)}")
    for row in d:
        log(json.dumps(row, ensure_ascii=False, indent=2))
except:
    log(resp.text[:500])

# Check fb_post_kpi
log("\n=== fb_post_kpi (all records) ===")
resp2 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/fb_post_kpi?select=*&limit=50",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp2.status_code}")
try:
    d2 = resp2.json()
    log(f"Total records: {len(d2)}")
    for row in d2:
        log(json.dumps(row, ensure_ascii=False, indent=2))
except:
    log(resp2.text[:500])

# Check app_users (first 5)
log("\n=== app_users (first 5) ===")
resp3 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/app_users?select=id,email,role&limit=5",
    headers=HEADERS, timeout=15.0
)
log(f"Status: {resp3.status_code}")
try:
    d3 = resp3.json()
    log(f"Total records shown: {len(d3)}")
    for row in d3:
        log(json.dumps(row, ensure_ascii=False, indent=2))
except:
    log(resp3.text[:300])

# Check service-fb-seeding user_id format from the service's state
# Let's also check if the service has any jobs or accounts set up
log("\n=== service_fb_seeding analysis ===")
log("Note: service-fb-seeding runs locally/on-VM with its own state.")
log("user_id format: fb_<c_user from FB cookie>")
log("Example: fb_100000123456789")

with open("D:/CrawlDataLinkedin/__check_db3.py", "w", encoding="utf-8") as f:
    pass  # Don't overwrite

with open("D:/CrawlDataLinkedin/__fb_inbox_check.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Done")
