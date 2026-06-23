import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

print("=== Check seeding-backend openapi ===")
out, err = run("curl -s http://localhost:8000/openapi.json 2>/dev/null | python3 -c \"import sys,json; d=json.load(sys.stdin); paths=[p for p in d.get('paths',{}).keys() if 'kpi' in p.lower() or 'post-kpi' in p.lower()]; print('\\n'.join(sorted(paths)))\" 2>/dev/null; exit 0")
print(f"OpenAPI kpi paths: {out[:2000]}")

print()
print("=== Check if seeding-backend has fb_post_kpi route ===")
out, err = run("curl -s http://localhost:8000/api/all-platform/fb/post-kpi/summary -X POST -H 'Content-Type: application/json' -d '{\"email\":\"duongmai.13022005@gmail.com\"}' 2>/dev/null | head -c 500")
print(f"POST /api/all-platform/fb/post-kpi/summary: {out[:500]}")

print()
print("=== seeding-backend Docker container code check ===")
out, err = run("docker exec seeding-backend python3 -c \"from app.modules.all_platform.routers.fb_post_kpi import router; print('fb_post_kpi router imported OK')\" 2>&1; exit 0")
print(f"Import check: {out}")

print()
print("=== Check seeding-backend build date ===")
out, err = run("docker inspect seeding-backend --format '{{.Created}}' 2>/dev/null; exit 0")
print(f"Container created: {out}")

print()
print("=== Check if there are multiple backends on port 8000 ===")
out, err = run("ss -tlnp | grep 8000; exit 0")
print(f"Port 8000 listeners: {out}")

print()
print("=== Check what seeding-backend is running (command) ===")
out, err = run("docker inspect seeding-backend --format '{{.Config.Cmd}}' 2>/dev/null; exit 0")
print(f"Container cmd: {out}")

client.close()
