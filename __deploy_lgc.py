import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__deploy_lgc.txt", "w", encoding="utf-8", errors="replace")

def run(cmd, timeout=120):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

import time

# 1. Pull latest
print("1. Pulling latest code...", file=out_file)
out, err = run(f"cd {CWD} && git pull origin restyle-form 2>&1", timeout=120)
print(out[-800:], file=out_file)
if err:
    print(f"STDERR: {err[-300:]}", file=out_file)

# 2. Check new endpoint in code
print("2. Checking new endpoint...", file=out_file)
out, err = run(f"grep -n 'session/owner' {CWD}/app/modules/all_platform/routers/fb.py 2>&1")
print(out[:300], file=out_file)

# 3. Build
print("3. Building Docker image (this takes ~5-10min)...", file=out_file)
out, err = run(f"cd {CWD} && docker compose build --no-cache 2>&1", timeout=900)
print(out[-3000:], file=out_file)
if err:
    print(f"STDERR: {err[-500:]}", file=out_file)

# 4. Restart
print("4. Restarting containers...", file=out_file)
out, err = run(f"cd {CWD} && docker compose down && docker compose up -d 2>&1", timeout=180)
print(out[-500:], file=out_file)

# 5. Wait for startup
print("5. Waiting 10s for service to start...", file=out_file)
time.sleep(10)

# 6. Health check
print("6. Health check...", file=out_file)
out, err = run("curl -s --max-time 10 http://localhost:8000/health 2>&1", timeout=15)
print(out[:500], file=out_file)

# 7. Test new endpoint
print("7. Testing /api/all-platform/fb/sessions...", file=out_file)
out, err = run("curl -s --max-time 10 'http://localhost:8000/api/all-platform/fb/sessions' -H 'Authorization: Bearer test' 2>&1 | head -c 300", timeout=15)
print(out[:300], file=out_file)

# 8. Test /api/all-platform/fb/session/owner
print("8. Testing /api/all-platform/fb/session/owner/{user_id}...", file=out_file)
out, err = run("curl -s --max-time 10 'http://localhost:8000/api/all-platform/fb/session/owner/test123' -H 'Authorization: Bearer test' 2>&1 | head -c 300", timeout=15)
print(out[:300], file=out_file)

out_file.close()
client.close()
print("\nDone! See __deploy_lgc.txt")
