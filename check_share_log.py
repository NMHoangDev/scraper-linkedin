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

# 1. Get the can_view_account code
print("=== can_view_account code ===")
r = run("docker exec seeding-backend sh -c 'sed -n \"90,130p\" /app/app/modules/all_platform/zalo/services/message_events.py'")
print(r.encode('ascii', errors='replace').decode('ascii'))

# 2. Check zalo_accounts (correct schema)
print("\n=== zalo_accounts ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_accounts', params={'select': '*', 'limit': '30'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:5000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

# 3. List shared permissions
print("\n=== ALL zalo_conversation_permissions ===")
r = run("docker exec seeding-backend python -c \"\nimport asyncio\nfrom app.modules.all_platform.zalo.services.supabase_service import _rest\nimport json\nasync def main():\n    res = await _rest('GET', 'zalo_conversation_permissions', params={'select': '*'})\n    print(json.dumps(res, default=str, ensure_ascii=False)[:5000])\nasyncio.run(main())\" 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

client.close()