import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Force recreation
print("=== Force recreate backend ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose up -d --force-recreate backend 2>&1",
    timeout=120
)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:1000])
if err:
    print("STDERR:", err[-300:])

import time
time.sleep(10)

# Verify
print("\n=== Verify image ===")
stdin, stdout, stderr = client.exec_command("docker inspect seeding-backend --format '{{.Image}}' 2>&1", timeout=15)
img = stdout.read().decode().strip()
stdin, stdout, stderr = client.exec_command("docker images scraper-linkedin-backend:latest --format '{{.ID}}' 2>&1", timeout=15)
latest = stdout.read().decode().strip()
print(f"Container: {img}")
print(f"Latest: {latest}")
print("MATCH" if img.endswith(latest) or img == latest else "MISMATCH")

# Health
print("\n=== Health check ===")
stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health 2>&1", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

# Quick test: import the fixed modules
print("\n=== Module import test ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend python3 -c 'from app.modules.all_platform.zalo.services.message_events import publish_zalo_message_event, subscribe_zalo_events; from app.modules.all_platform.zalo.api.routes.events import _auth_expired_watcher; print(\"Import OK\")' 2>&1",
    timeout=30
)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:500])
if err:
    print("Errors:", err[:500])

client.close()
