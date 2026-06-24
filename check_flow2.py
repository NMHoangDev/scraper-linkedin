import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=15):
    try:
        chan = client.exec_command(cmd, timeout=timeout)
        return chan[1].read().decode("utf-8", errors="replace").strip()
    except Exception as e:
        return f"ERROR: {e}"

# 1. Find all user_id (account) in logs - who's connecting SSE
print("=== UNIQUE SSE CONNECT USER_ID (last 1h) ===")
r = run("docker logs seeding-backend --since 60m 2>&1 | grep -oE 'caller_id=[a-z0-9._-]+' | sort -u | head -20")
print(r)

# 2. Check published events vs subscribers
print("\n=== publish_zalo_message_event calls (last 30min) ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -iE 'publish|sent|delivered|published' | head -20")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 3. Check current auth_status for various accounts
print("\n=== Different accounts current status ===")
for uid in ['zl_2c470749', 'zl_ae2bc011', 'zl_1eda8c6a', 'zl_2c01ce01', 'zl_8d9a6a45', 'zl_8560c387', 'zl_986934c9']:
    r = run(f"curl -s -H 'X-User-ID: {uid}' -H 'X-API-Key: secret_api_key' 'http://localhost:8080/api/all-platform/zalo/auth/current-status'")
    print(f"  {uid}: {r.encode('ascii', errors='replace').decode('ascii')[:200]}")

# 4. Check zalo_accounts table
print("\n=== zalo_accounts from supabase ===")
r = run("docker exec seeding-backend python -c \"from app.modules.all_platform.zalo.services.supabase_service import _rest; import json; res = _rest('GET', 'zalo_accounts', params={'select': 'user_id,owner_id,status,email'}); print(json.dumps(res, default=str)[:2000])\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 5. Check what users are currently subscribed to events (current SSE connections)
print("\n=== Events/stream callers (last 10min) ===")
r = run("docker logs seeding-backend --since 10m 2>&1 | grep -E 'stream_ready|GET /api/all-platform/zalo/events/stream' | head -20")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 6. Check shared conversations table
print("\n=== shared_conversations table ===")
r = run("docker exec seeding-backend python -c \"from app.modules.all_platform.zalo.services.supabase_service import _rest; import json; res = _rest('GET', 'zalo_shared_conversations', params={'select': '*', 'limit': '10'}); print(json.dumps(res, default=str)[:2000])\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:1500])

client.close()