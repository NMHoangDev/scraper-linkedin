import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check the specific account listener status
print("=== Zalo accounts on VM ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s 'http://localhost:8000/api/zalo/auth/sessions' -H 'x-api-key: test-key' --max-time 5 2>&1 | head -5",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:300])

# Check logs for recent listener activity
print("\n=== Recent ZCA listener logs ===")
cmd = "docker logs --tail 30 seeding-backend 2>&1 | grep -i 'listener\\|ZCA listener\\|connected\\|publish\\|SSE\\|stream\\|auth.*expired\\|startup sync' | tail -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\listener_activity.txt", "wb") as f:
    f.write(out)
print(out.decode("utf-8", errors="replace")[:1000])

# Commit nginx config fix
print("\n=== Commit nginx fix ===")
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
cmd = f"""cd {CWD} && git add nginx-router/nginx.conf && git commit -m 'fix: route /api/all-platform/zalo/ to Docker backend (port 8000) instead of old process (8001)' && git log -1 --oneline"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

client.close()
