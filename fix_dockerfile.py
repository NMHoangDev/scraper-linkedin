import paramiko
import sys
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
LOCAL_PATH = r"D:\CrawlDataLinkedin\dockerfile_new"
FINAL_PATH = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/Dockerfile"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

with open(LOCAL_PATH, "rb") as f:
    content = f.read()
content_str = content.decode("utf-8")

# Write Dockerfile
cmd = f"cat > {FINAL_PATH} <<'DOCKEREOF'\n{content_str}\nDOCKEREOF"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(f"Write: exit={exit_code}, out={out.strip()}, err={err[:200] if err else ''}")

stdin, stdout, stderr = client.exec_command(f"wc -l {FINAL_PATH}", timeout=10)
lines = stdout.read().decode().strip()
print(f"File lines: {lines}")

# Build Docker image
print("\n=== Building Docker image ===")
stdin, stdout, stderr = client.exec_command(
    f"cd /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler && docker build --no-cache -t scraper-linkedin-backend:latest . 2>&1",
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
print(text[-6000:])
print(f"\nExit code: {exit_code}")

if exit_code == 0:
    print("\nBuild succeeded! Restarting containers...")
    stdin, stdout, stderr = client.exec_command(
        "cd /opt/apps/seeding_markeeai/scraper-linkedin && docker compose down && docker compose up -d 2>&1",
        timeout=120
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out)
    if err:
        print("STDERR:", err[-2000:])

    print("\n=== Health check ===")
    stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health 2>&1", timeout=15)
    print(stdout.read().decode("utf-8", errors="replace"))
else:
    print("\nBuild failed.")

client.close()
