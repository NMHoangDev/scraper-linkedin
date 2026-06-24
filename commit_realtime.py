import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Git commit
print("=== Git commit ===")
cmd = f"""cd {CWD} && git add linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py && git commit -m 'fix: Zalo realtime message flow stability

1. message_events: fix publish_zalo_message_event using .get(account) instead of .get(account, set()) - default arg bug
2. zca_persistent_listener: fix event type "new_messages" -> "zalo-message" so SSE delivers messages to frontend
3. events.py: merge auth_expired and zalo-message events via asyncio.wait(FIRST_COMPLETED) so auth expiry is pushed to frontend
4. events.py: add _auth_expired_watcher async generator that watches auth-expired queue
5. zca_persistent_listener: increase startup sync from 5->20 groups and 30->50 messages per group'"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:2000])
if err and "fatal" in err.lower():
    print("STDERR:", err[:500])

print("\n=== Git log ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log -3 --oneline", timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
