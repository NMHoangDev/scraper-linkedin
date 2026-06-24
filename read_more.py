import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read supabase_service save_listener_messages + _listener_message_payload
print("=== save_listener_messages (lines 790-1000) ===")
cmd = f"sed -n '790,1000p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "save_listener.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check nginx config for SSE/proxy buffering
print("\n=== Nginx config for SSE ===")
cmd = f"grep -n 'proxy_buffer\\|buffering\\|X-Accel\\|Cache-Control\\|Connection' {CWD}/nginx-router/nginx.conf 2>/dev/null || echo 'no nginx conf'"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "nginx_sse.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check docker compose for SSE config
print("\n=== Docker compose SSE config ===")
cmd = f"grep -n 'buffering\\|X-Accel\\|Cache-Control\\|proxy_read\\|proxy_http' {CWD}/docker-compose.yml 2>/dev/null || echo 'none'"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "docker_sse.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check logs for recent errors
print("\n=== Recent container logs (last 100 lines, errors) ===")
cmd = "docker logs --tail 100 seeding-backend 2>&1 | grep -i 'error\\|warn\\|exception\\|fail' | tail -30"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(os.path.join(LOCAL, "container_errors.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check if there are issues with the SSE generator (FIRST_COMPLETED bug)
print("\n=== message_events subscribe_zalo_events asyncio.wait ===")
cmd = f"grep -n 'asyncio.wait\\|FIRST_COMPLETED\\|FIRST_ALL\\|asyncio.wait_for\\|timeout=20\\|pending\\|done,' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "asyncio_wait.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
