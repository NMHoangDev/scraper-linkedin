import paramiko
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
NGINX = f"{CWD}/nginx-router/nginx.conf"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read current nginx config
stdin, stdout, stderr = client.exec_command(f"cat {NGINX}", timeout=15)
nginx_content = stdout.read().decode("utf-8", errors="replace")
print(f"Current nginx config:\n{nginx_content}")

# Replace the proxy_pass to point to Docker backend
old_block = '''    location /api/all-platform/zalo/ {
        proxy_pass http://10.30.50.29:8001/api/all-platform/zalo/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }'''

new_block = '''    location /api/all-platform/zalo/ {
        proxy_pass http://backend:8000/api/all-platform/zalo/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Accel-Buffering no;
        proxy_read_timeout 3600s;
    }'''

if old_block in nginx_content:
    nginx_content = nginx_content.replace(old_block, new_block)
    print("Replaced nginx proxy_pass")
else:
    print("OLD BLOCK NOT FOUND!")
    print("Looking for similar patterns...")
    if "10.30.50.29:8001" in nginx_content:
        print("Found 10.30.50.29:8001 in config")
    if "backend:8000" in nginx_content:
        print("Found backend:8000 in config")

# Write back
b64 = base64.b64encode(nginx_content.encode("utf-8")).decode()
TMP = "/tmp/nginx_fixed.conf"
client.exec_command(f'python3 -c "import base64; open(\'{TMP}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')

# Backup old
client.exec_command(f"cp {NGINX} {NGINX}.bak")

# Write new
client.exec_command(f"cp {TMP} {NGINX}")
print("Written nginx config")

# Reload nginx
print("\n=== Reload nginx ===")
result = client.exec_command("docker exec seeding-router nginx -s reload 2>&1")
out = result[1].read() if hasattr(result[1], 'read') else b""
err = result[2].read() if hasattr(result[2], 'read') else b""
exit_code = result[0].channel.recv_exit_status()
print(f"Reload: exit={exit_code}")
print(f"stdout: {out.decode('utf-8','replace').strip()}")
print(f"stderr: {err.decode('utf-8','replace').strip()}")

# If reload fails, try restart
if exit_code != 0:
    print("\n=== Restart nginx container ===")
    result = client.exec_command("docker restart seeding-router 2>&1")
    out = result[1].read() if hasattr(result[1], 'read') else b""
    err = result[2].read() if hasattr(result[2], 'read') else b""
    exit_code2 = result[0].channel.recv_exit_status()
    print(f"Restart: exit={exit_code2}")
    print(f"stdout: {out.decode('utf-8','replace').strip()}")
    import time
    time.sleep(3)

# Verify
print("\n=== Verify nginx config ===")
result = client.exec_command("docker exec seeding-router nginx -t 2>&1")
out = result[1].read() if hasattr(result[1], 'read') else b""
err = result[2].read() if hasattr(result[2], 'read') else b""
exit_code = result[0].channel.recv_exit_status()
print(f"Config test: exit={exit_code}")
print(f"stdout: {out.decode('utf-8','replace').strip()}")
print(f"stderr: {err.decode('utf-8','replace').strip()}")

client.close()
