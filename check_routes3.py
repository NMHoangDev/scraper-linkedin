import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Write a script to file, then execute it
script = """
import sys
sys.path.insert(0, '/app')
from app.main import app

def get_all_routes(routes, prefix=''):
    results = []
    for route in routes:
        if hasattr(route, 'routes'):
            r_prefix = getattr(route, 'path', '') or getattr(route, 'prefix', '') or ''
            results.extend(get_all_routes(route.routes, prefix + r_prefix))
        elif hasattr(route, 'path') and route.path:
            methods = list(getattr(route, 'methods', ['GET']) or ['GET'])
            results.append(f"{methods[0]} {prefix}{route.path}")
    return results

routes = get_all_routes(app.routes)
for r in sorted(routes):
    print(r)
"""

import base64
b64 = base64.b64encode(script.encode()).decode()

# Write script to container
cmd = f'echo "{b64}" | base64 -d > /tmp/list_routes.py'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)

cmd2 = "docker exec seeding-backend python3 /tmp/list_routes.py 2>&1"
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\all_routes3.txt", "wb") as f:
    f.write(out)
text = out.decode("utf-8", errors="replace")
print(f"Total routes: {text.count(chr(10))}")
# Show relevant ones
for line in text.strip().split("\n"):
    if line and ("zalo" in line.lower() or "event" in line.lower() or "listener" in line.lower()):
        print(line.strip())

client.close()
