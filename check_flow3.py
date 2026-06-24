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

# 1. Check that the recent message_seen increased
print("=== Listener status (any change) ===")
r = run("curl -s -H 'X-User-ID: zl_2c470749' -H 'X-API-Key: secret_api_key' 'http://localhost:8080/api/all-platform/zalo/listener/status'")
print(r)

# 2. Check Supabase zalo_messages to see if any new messages were saved
print("\n=== Last 5 zalo_messages from supabase ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_messages', params={'select': 'user_id,thread_id,sender_name,content,created_at', 'order': 'created_at.desc', 'limit': '5'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:3000])\nasyncio.run(main())\n\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 3. Test: send a fake message via direct publish to see if subscribers receive
print("\n=== Try to publish test event directly ===")
# First check the role/email of each connected user
r = run("docker logs seeding-backend --since 5m 2>&1 | grep -E 'stream_ready.*role' | head -5")
print(r.encode('ascii', errors='replace').decode('ascii')[:1500])

# 4. Check the app_users table
print("\n=== app_users from supabase ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'app_users', params={'select': 'id,email,role', 'limit': '20'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:2000])\nasyncio.run(main())\n\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 5. Check zalo_accounts (the table that maps account_id -> owner)
print("\n=== zalo_accounts ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_accounts', params={'select': 'user_id,owner_id,email,status'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:2000])\nasyncio.run(main())\n\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 6. Check shared_conversations
print("\n=== zalo_shared_conversations ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_shared_conversations', params={'select': '*', 'limit': '20'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:2000])\nasyncio.run(main())\n\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 7. Check if there is a test that publishes a message and tracks delivery
print("\n=== Recent messages saved by listener ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -E 'save_listener_messages|publish_zalo_message' | head -10")
print(r.encode('ascii', errors='replace').decode('ascii')[:1500])

client.close()