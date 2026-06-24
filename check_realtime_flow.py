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

# 1. Find the SSE event publisher code
print("=== Find publish_zalo_message_event ===")
r = run("docker exec seeding-backend sh -c 'grep -n \"def publish_zalo_message_event\\|def _publish\\|def register_account_owner\\|def _is_authorized\" /app/app/modules/all_platform/zalo/services/message_events.py 2>&1'")
print(r)

# 2. List all message_events subscribers
print("\n=== Check current SSE subscribers in container ===")
# We can't easily inspect Python objects, but we can check logs
r = run("docker logs seeding-backend --tail 200 2>&1 | grep -iE 'subscriber|publish|sse|sent|delivered|filter' | head -30")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 3. Check shared_conversation_ids
print("\n=== shared_conversation_ids check ===")
r = run("docker exec seeding-backend sh -c 'grep -n \"def list_shared_conversation_ids\\|def list_shared\" /app/app/modules/all_platform/zalo/services/supabase_service.py 2>&1'")
print(r)

# 4. Look at message_events.py publish logic
print("\n=== publish_zalo_message_event source ===")
r = run("docker exec seeding-backend sh -c 'cat /app/app/modules/all_platform/zalo/services/message_events.py' 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

client.close()