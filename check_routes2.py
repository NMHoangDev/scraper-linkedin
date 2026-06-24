import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# List routes properly
print("=== All routes ===")
cmd = """docker exec seeding-backend python3 << 'EOF'
import sys
sys.path.insert(0, '/app')
from app.main import app

def get_all_routes(routes, prefix=''):
    results = []
    for route in routes:
        if hasattr(route, 'routes'):
            # Nested router
            r_prefix = getattr(route, 'path', '') or getattr(route, 'prefix', '') or ''
            results.extend(get_all_routes(route.routes, prefix + r_prefix))
        elif hasattr(route, 'path') and route.path:
            methods = list(getattr(route, 'methods', ['GET']) or ['GET'])
            results.append(f"{methods[0]} {prefix}{route.path}")
    return results

routes = get_all_routes(app.routes)
for r in sorted(routes):
    print(r)
EOF
"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\all_routes2.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes, {out.decode('utf-8', errors='replace').count(chr(10))} lines")
# Show zalo routes
lines = out.decode("utf-8", errors="replace").strip().split("\n")
for line in lines:
    if "zalo" in line.lower() or "event" in line.lower() or "listener" in line.lower():
        print(line.strip())

client.close()
