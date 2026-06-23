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

# 1. zalo_accounts (use account_id, not user_id)
print("=== zalo_accounts (correct columns) ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_accounts', params={'select': 'account_id,owner_id,email,display_name'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:3000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 2. App users (just id, email, role)
print("\n=== app_users ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'app_users', params={'select': 'id,email,role'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:3000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 3. zalo_conversation_permissions
print("\n=== zalo_conversation_permissions ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_conversation_permissions', params={'select': '*', 'limit': '30'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:5000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

# 4. List all tables to find correct names
print("\n=== Find team table ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    # Try common names\n    for name in ['team_members', 'teams', 'app_team', 'user_teams']:\n        try:\n            res = await _rest('GET', name, params={'select': '*', 'limit': '3'})\n            print(f'{name}:', res)\n        except Exception as e:\n            print(f'{name}: NOT FOUND')\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

client.close()