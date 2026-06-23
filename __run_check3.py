import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

print("=== Backend LGC environment ===")

# Check backend logs for fb_post_kpi
container_id_cmd = "docker ps -q --filter name=linkedin 2>/dev/null | head -1"
container_id, _ = run(container_id_cmd)
container_id = container_id.strip()
if container_id:
    out, err = run(f"docker logs {container_id} --tail 30 2>/dev/null | grep -i 'fb_post_kpi\\|kpi\\|404\\|error\\|500' | tail -30")
else:
    out = "No linkedin container found"
print(f"Backend logs with kpi: {out[:2000]}")

# Check if uvicorn is running
out, err = run("ps aux | grep uvicorn | grep -v grep | head -5")
print(f"\nUvicorn processes: {out[:1000]}")

# Check openapi for the fb/post-kpi route
out, err = run("curl -s http://localhost:8000/openapi.json 2>/dev/null")
if out and out.strip():
    import json as jsonmod
    try:
        d = jsonmod.loads(out)
        paths = sorted([p for p in d.get("paths", {}).keys() if "kpi" in p.lower() or "fb" in p.lower()])
        out = "\n".join(paths)
    except:
        pass
else:
    out = "openapi check failed"
print(f"\nOpenAPI paths with kpi/fb: {out[:2000]}")

client.close()
