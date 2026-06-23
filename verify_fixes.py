import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

print("=== Verify Fix 1: message_events.py - .get(account) ===")
cmd = "grep -n 'for queue, meta in list(_subscribers.get(account' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

print("\n=== Verify Fix 2: zca_persistent_listener.py - 'zalo-message' ===")
cmd = "grep -n '\"type\": \"zalo-message\"' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

print("\n=== Verify Fix 3: events.py - asyncio.wait FIRST_COMPLETED ===")
cmd = "grep -n 'asyncio.wait.*FIRST_COMPLETED' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

print("\n=== Verify Fix 4: _auth_expired_watcher ===")
cmd = "grep -n '_auth_expired_watcher\\|auth_gen\\|msg_gen\\|aclose' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py | head -10"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

print("\n=== Verify Fix 5: startup sync groups ===")
cmd = "grep -n '_STARTUP_SYNC_GROUP_LIMIT\\|_STARTUP_SYNC_MESSAGE_COUNT' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
