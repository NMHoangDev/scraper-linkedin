import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Try different approach to list routes
print("=== All registered routes ===")
cmd = """docker exec seeding-backend python3 -c "
import sys
sys.path.insert(0, '/app')
from app.main import app
for route in app.routes:
    if hasattr(route, 'path'):
        methods = getattr(route, 'methods', {'GET'})
        print(f'{list(methods)[0] if methods else \"GET\"} {route.path}')
" 2>&1 | grep -v 'Warning\\|FutureWarning'"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\all_routes.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
