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

# Get publish logic
print("=== publish_zalo_message_event code (140-260) ===")
r = run("docker exec seeding-backend sh -c 'sed -n \"140,260p\" /app/app/modules/all_platform/zalo/services/message_events.py' 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

# Find events.py
print("\n=== events.py SSE endpoint ===")
r = run("docker exec seeding-backend sh -c 'find /app/app/modules/all_platform/zalo -name \"events.py\" 2>/dev/null'")
print(r)

r = run("docker exec seeding-backend sh -c 'cat /app/app/modules/all_platform/zalo/api/routes/events.py 2>/dev/null' 2>&1")
print(r.encode('ascii', errors='replace').decode('ascii')[:5000])

client.close()