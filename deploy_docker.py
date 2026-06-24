import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Pull latest
print("=== Pulling latest code ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git pull origin restyle-form 2>&1", timeout=60)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out)
if err:
    print("STDERR:", err)

# Build docker
print("\n=== Building Docker image ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && docker compose build --no-cache 2>&1", timeout=600)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[-3000:] if len(out) > 3000 else out)
if err:
    print("STDERR:", err[-2000:] if len(err) > 2000 else err)

# Restart container
print("\n=== Restarting containers ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && docker compose down && docker compose up -d 2>&1", timeout=120)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out)
if err:
    print("STDERR:", err)

# Check status
print("\n=== Container status ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && docker compose ps 2>&1", timeout=30)
print(stdout.read().decode("utf-8", errors="replace"))

# Health check
print("\n=== Health check ===")
stdin, stdout, stderr = client.exec_command(f"curl -s http://localhost:8000/health 2>&1 || echo 'not ready yet'", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

client.close()
print("\nDone.")
