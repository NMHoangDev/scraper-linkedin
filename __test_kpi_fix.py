import httpx
import json

out = []

def log(msg):
    out.append(str(msg))

log("=== 1. Markee /session/owner/{fb_id} ===")
resp = httpx.get(
    "https://auto-fb.zenithglobal.dev/session/owner/fb_61590643803233",
    headers={"X-API-Key": "0ZuQJygUBevRMOfMswmNttMGIzet8Y-w"},
    timeout=15.0
)
log(f"Status: {resp.status_code}")
try:
    d = resp.json()
    log(json.dumps(d, ensure_ascii=False, indent=2)[:2000])
except:
    log(resp.text[:500])

# Resolve email -> app_users.id
log("\n=== 2. Resolve email -> app_users.id ===")
if resp.status_code == 200:
    d = resp.json()
    email = d.get("email") or (d.get("account") or {}).get("email") or d.get("owner_email")
    if email:
        log(f"Found email: {email}")
        SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
        ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"
        resp2 = httpx.get(
            f"{SUPABASE_URL}/rest/v1/app_users?email=eq.{email.lower()}&select=id,email",
            headers={"apikey": ROLE_KEY, "Authorization": f"Bearer {ROLE_KEY}"},
            timeout=15.0
        )
        log(f"Status: {resp2.status_code}")
        try:
            log(json.dumps(resp2.json(), ensure_ascii=False, indent=2))
        except:
            log(resp2.text[:300])
    else:
        log("No email found in response")

log("\n=== 3. Check current fb_inbox_kpi ===")
SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"
resp3 = httpx.get(
    f"{SUPABASE_URL}/rest/v1/fb_inbox_kpi?select=*",
    headers={"apikey": ROLE_KEY, "Authorization": f"Bearer {ROLE_KEY}"},
    timeout=15.0
)
log(f"Status: {resp3.status_code}")
try:
    d3 = resp3.json()
    log(json.dumps(d3, ensure_ascii=False, indent=2))
except:
    log(resp3.text[:300])

with open("D:/CrawlDataLinkedin/__kpi_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(out))
print("Done")
