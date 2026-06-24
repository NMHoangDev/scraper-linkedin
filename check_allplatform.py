import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check if there's a service on port 8001 (old backend)
print("=== Port 8001 ===")
cmd = "ss -tlnp | grep 8001 || netstat -tlnp | grep 8001 || echo 'no 8001'"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:300])

# Check the route registration more carefully
print("\n=== Route registration check ===")
script = """
import sys
sys.path.insert(0, '/app')
from app.main import app

# Try to find all_platform router
for r in app.routes:
    path = getattr(r, 'path', None) or getattr(r, 'prefix', None) or ''
    if 'all' in path.lower() or 'platform' in path.lower() or 'api' in path.lower():
        print(f"Route: {path!r} methods={getattr(r,'methods',None)}")
    # Check for nested
    if hasattr(r, 'routes'):
        for nr in r.routes:
            npath = getattr(nr, 'path', None) or getattr(nr, 'prefix', None) or ''
            if npath:
                print(f"  Nested: {npath!r}")
"""
import base64
b64 = base64.b64encode(script.encode()).decode()
client.exec_command(f'echo "{b64}" | base64 -d > /tmp/check_routes2.py')
cmd = "docker exec seeding-backend python3 /tmp/check_routes2.py 2>&1 | grep -v Warning"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\route_check.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check what the all_platform_router prefix is
print("\n=== all_platform_router ===")
cmd = "grep -n 'prefix.*=.*/api\\|include_router.*all_platform\\|all_platform_router' /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/router.py | head -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\platform_router.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
