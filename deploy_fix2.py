import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Pull latest
print("=== Git pull ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && git pull origin restyle-form 2>&1",
    timeout=60
)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:1000])
if err and "fatal" in err.lower():
    print("STDERR:", err[:500])

# Rebuild backend
print("\n=== Building backend Docker ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose build --no-cache backend 2>&1",
    timeout=900
)
out_full = b""
while True:
    chunk = stdout.read(8192)
    if not chunk:
        break
    out_full += chunk

exit_code = stdout.channel.recv_exit_status()
text = out_full.decode("utf-8", errors="replace")
print(text[-3000:])
print(f"\nExit code: {exit_code}")

if exit_code != 0:
    print("BUILD FAILED")
    client.close()
    exit(1)

# Restart containers
print("\n=== Restarting containers ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose up -d 2>&1",
    timeout=120
)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:2000])
if err:
    print("STDERR:", err[-500:])

# Wait for health
import time
time.sleep(5)

# Health check
print("\n=== Health check ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s http://localhost:8000/health 2>&1",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Verify container is using new image
print("\n=== Verify container image ===")
stdin, stdout, stderr = client.exec_command(
    "docker inspect seeding-backend --format '{{.Image}}'",
    timeout=15
)
img = stdout.read().decode().strip()
stdin, stdout, stderr = client.exec_command(
    "docker images scraper-linkedin-backend:latest --format '{{.ID}}'",
    timeout=15
)
latest = stdout.read().decode().strip()
print(f"Container: {img}")
print(f"Latest: {latest}")
print("MATCH" if img == latest or img.endswith(latest) else "MISMATCH")

client.close()
print("\nDone.")
