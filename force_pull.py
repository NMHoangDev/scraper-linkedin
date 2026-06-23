import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check image details
print("=== Image details ===")
stdin, stdout, stderr = client.exec_command(
    "docker images scraper-linkedin-backend --format '{{.Repository}} {{.Tag}} {{.ID}}' 2>&1",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Force pull latest
print("\n=== Docker compose pull ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose pull backend 2>&1",
    timeout=120
)
out = stdout.read().decode("utf-8", errors="replace")
print(out[:1000])

# Force recreate again
print("\n=== Force recreate ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose up -d --force-recreate --no-deps backend 2>&1",
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
print(f"Container: {img}")
print(f"Latest:   {latest}")
print("MATCH" if img.endswith(latest) else "MISMATCH")

# Health
print("\n=== Health ===")
stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health 2>&1", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

# Verify code has fixes by checking the container
print("\n=== Verify fixes in running container ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend grep -n 'Drain any remaining\\|max crash\\|restart_attempt > 10\\|_RESTART_BACKOFFS.*5, 15' /app/app/modules/all_platform/zalo/services/zca_persistent_listener.py 2>&1 | head -10",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

client.close()
