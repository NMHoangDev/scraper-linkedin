import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check for publish_zalo_message_event logs
print("=== publish_zalo_message_event logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 5000 seeding-backend 2>&1 | grep 'publish_zalo_message_event\\|published.*event\\|event published\\|save_listener_messages.*messages=' | grep -v 'HTTP Request' | tail -30",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:3000])

# Check if SSE stream is active
print("\n=== SSE stream status ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 5000 seeding-backend 2>&1 | grep 'SSE stream\\|event_gen\\|_auth_expired\\|closing' | grep -v 'HTTP Request' | tail -20",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:2000])

# Check for any message received events
print("\n=== Message received events ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 5000 seeding-backend 2>&1 | grep -E '\"event\":\"message\"\\|event\":\"message\"\\|message_received\\|Received.*message' | grep -v 'HTTP Request' | tail -10",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:2000])

# Check what the frontend is doing - any SSE connections?
print("\n=== Recent backend logs (last 50) ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 50 seeding-backend 2>&1 | grep -v 'HTTP Request' | grep -v 'httpx'",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:2000])

client.close()
