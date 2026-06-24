import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# publish_zalo_message_event logs
print("=== publish_zalo_message_event logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 5000 seeding-backend 2>&1 | grep 'publish_zalo_message_event\\|published.*event\\|save_listener_messages.*messages=' | grep -v 'HTTP Request' | tail -30",
    timeout=30
)
out = stdout.read()
with open(f"{LOCAL}\\sse_publish.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# SSE stream
print("\n=== SSE stream logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 5000 seeding-backend 2>&1 | grep 'SSE stream\\|_auth_expired\\|event_gen\\|closing' | grep -v 'HTTP Request' | tail -20",
    timeout=30
)
out = stdout.read()
with open(f"{LOCAL}\\sse_stream.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Message events
print("\n=== Message events ===")
stdin, stdout, stderr = client.exec_command(
    'docker logs --tail 5000 seeding-backend 2>&1 | grep "event\":\"message" | grep -v "HTTP Request" | tail -10',
    timeout=30
)
out = stdout.read()
with open(f"{LOCAL}\\message_events.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Recent raw logs
print("\n=== Recent raw logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 80 seeding-backend 2>&1 | grep -v 'HTTP Request' | grep -v httpx",
    timeout=30
)
out = stdout.read()
with open(f"{LOCAL}\\recent_raw.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
