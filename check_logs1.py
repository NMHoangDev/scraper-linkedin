import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"
os.makedirs(LOCAL, exist_ok=True)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Backend logs - realtime related
print("=== BACKEND: Realtime logs ===")
cmd = "docker logs --tail 300 seeding-backend 2>&1 | grep -i 'listener\\|SSE\\|stream\\|publish\\|realtime\\|event\\|heartbeat\\|disconnect\\|connect\\|auth.*expired\\|ZCA.*connect\\|ZCA.*startup\\|message.*seen\\|save.*listener\\|sync\\|_run_once\\|start_persisted' | grep -v 'HTTP Request' | tail -60"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(os.path.join(LOCAL, "backend_realtime.txt"), "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# 2. Backend errors
print("=== BACKEND: Errors ===")
cmd = "docker logs --tail 300 seeding-backend 2>&1 | grep -iE 'error\\|exception\\|traceback\\|CRITICAL\\|FATAL' | grep -v 'HTTP Request\\|httpx\\|WARNING.*httpx' | tail -30"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(os.path.join(LOCAL, "backend_errors.txt"), "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# 3. Last 80 lines raw
print("=== BACKEND: Last 80 lines ===")
cmd = "docker logs --tail 80 seeding-backend 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(os.path.join(LOCAL, "backend_raw80.txt"), "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# 4. Frontend logs
print("=== FRONTEND: Last 80 lines ===")
cmd = "docker logs --tail 80 seeding-frontend 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(os.path.join(LOCAL, "frontend_raw80.txt"), "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# 5. Backend process list + CPU/memory
print("=== BACKEND: Process list ===")
cmd = "docker exec seeding-backend ps aux 2>/dev/null | grep -v 'ps aux' | head -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "backend_ps.txt"), "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
print("Done!")
