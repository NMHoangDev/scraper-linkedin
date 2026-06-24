import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=20):
    try:
        chan = client.exec_command(cmd, timeout=timeout)
        return chan[1].read().decode("utf-8", errors="replace").strip()
    except Exception as e:
        return f"ERROR: {e}"

# 1. Check zalo_accounts - which owner maps to which account
print("=== zalo_accounts (mapping account_id -> owner_id) ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_accounts', params={'select': 'user_id,owner_id,email,status'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:3000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 2. App users (who is admin/leader/member)
print("\n=== app_users ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'app_users', params={'select': 'id,email,role,full_name'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:2000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 3. Shared conversations (who shares what with whom)
print("\n=== zalo_shared_conversations ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_shared_conversations', params={'select': '*', 'limit': '20'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:3000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 4. Teams (leader -> members mapping)
print("\n=== app_team_members (leader -> members) ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'app_team_members', params={'select': '*', 'limit': '20'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:2000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

client.close()