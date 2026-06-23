import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check Docker container port mapping
print("=== Docker container ports ===")
stdin, stdout, stderr = client.exec_command(
    "docker inspect seeding-backend --format '{{json .NetworkSettings.Ports}}' 2>&1",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

# Check docker-compose for port mapping
print("\n=== docker-compose backend ports ===")
stdin, stdout, stderr = client.exec_command(
    f"grep -A5 'backend:' {CWD}/docker-compose.yml | grep -E 'ports|image|build' | head -10",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:300])

# Check what's listening on port 8080 (public)
print("\n=== Port 8080 (public) ===")
cmd = "curl -s -o /dev/null -w '%{http_code}' 'http://localhost:8080/api/zalo/events/stream?user_id=test&role=member' --max-time 5 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
code = stdout.read().decode().strip()
print(f"HTTP {code}")

# Check if nginx is routing to port 8000 or 8001 for /api/zalo
print("\n=== Nginx route for /api/ ===")
stdin, stdout, stderr = client.exec_command(
    f"cat {CWD}/nginx-router/nginx.conf",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

client.close()
