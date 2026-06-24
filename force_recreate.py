import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Force recreate
print("=== Force recreate ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose up -d --force-recreate backend 2>&1",
    timeout=120
)
out = stdout.read().decode("utf-8", errors="replace")
print(out[:500])

import time
time.sleep(10)

# Verify
print("\n=== Verify ===")
stdin, stdout, stderr = client.exec_command(
    "docker inspect seeding-backend --format '{{.Image}}' 2>&1",
    timeout=15
)
img = stdout.read().decode().strip()
stdin, stdout, stderr = client.exec_command(
    "docker images scraper-linkedin-backend:latest --format '{{.ID}}' 2>&1",
    timeout=15
)
latest = stdout.read().decode().strip()
print(f"Container: {img[-30:]}")
print(f"Latest: {latest}")
print("MATCH" if img.endswith(latest) or img == latest else "MISMATCH")

# Health
print("\n=== Health ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s http://localhost:8000/health 2>&1",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Check Node processes after new start
print("\n=== Node processes ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l",
    timeout=15
)
count = int(stdout.read().decode().strip())
print(f"ZCA processes: {count}")

# Check if listener is running
print("\n=== Listener status ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s http://localhost:8000/api/zalo/listener/status -H 'X-User-ID: zl_8560c387' 2>&1",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Check logs for recent activity
print("\n=== Recent logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 30 seeding-backend 2>&1 | grep -v 'HTTP Request'",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:1000])

client.close()
