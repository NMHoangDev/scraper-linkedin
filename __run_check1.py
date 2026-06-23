import httpx, json

SUPABASE_URL = "https://rtwpogvficadngtfrcci.supabase.co"
ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc"
HEADERS = {"apikey": ROLE_KEY, "Authorization": "Bearer " + ROLE_KEY}

# Check fb_inbox_accounts
r1 = httpx.get(f"{SUPABASE_URL}/rest/v1/fb_inbox_accounts?select=*&limit=50", headers=HEADERS, timeout=15)
d1 = r1.json()
print("=== fb_inbox_accounts ===")
print(f"Status: {r1.status_code}, Total: {len(d1)}")
for row in d1:
    print(json.dumps(row, ensure_ascii=False))

# Check fb_post_kpi
r2 = httpx.get(f"{SUPABASE_URL}/rest/v1/fb_post_kpi?select=*&limit=50", headers=HEADERS, timeout=15)
d2 = r2.json()
print("\n=== fb_post_kpi ===")
print(f"Status: {r2.status_code}, Total: {len(d2)}")
for row in d2:
    print(json.dumps(row, ensure_ascii=False))

# Check app_users (first 5)
r3 = httpx.get(f"{SUPABASE_URL}/rest/v1/app_users?select=id,email,role&limit=5", headers=HEADERS, timeout=15)
d3 = r3.json()
print("\n=== app_users (sample 5) ===")
print(f"Status: {r3.status_code}")
for row in d3:
    print(json.dumps(row, ensure_ascii=False))

# Check if fb_inbox_accounts has rows where user_id starts with 'fb_'
r4 = httpx.get(f"{SUPABASE_URL}/rest/v1/fb_inbox_accounts?user_id=ilike.fb_*&select=*", headers=HEADERS, timeout=15)
d4 = r4.json()
print(f"\n=== fb_inbox_accounts with user_id like 'fb_%' ===")
print(f"Status: {r4.status_code}, Count: {len(d4)}")
for row in d4:
    print(json.dumps(row, ensure_ascii=False))

# Also check what user_id format exists in fb_inbox_accounts
r5 = httpx.get(f"{SUPABASE_URL}/rest/v1/fb_inbox_accounts?select=user_id,fb_user_id,id_member&limit=20", headers=HEADERS, timeout=15)
d5 = r5.json()
print(f"\n=== fb_inbox_accounts user_id/fb_user_id sample ===")
for row in d5:
    print(json.dumps(row, ensure_ascii=False))
