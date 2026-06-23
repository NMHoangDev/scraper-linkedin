import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Kill all ZCA processes
print("=== Kill all ZCA processes ===")
cmd = "docker exec seeding-backend pkill -f zca_persistent_listener.js && echo OK || echo FAILED"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
print(out)

import time
time.sleep(3)

# Verify
print("\n=== Remaining ZCA processes ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Remaining: {count}")

# The Python code will automatically restart new processes with the FIXED JS
# Wait and check
time.sleep(10)

print("\n=== After 10s - process count ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Processes: {count}")

# Wait more
time.sleep(20)

print("\n=== After 30s total - process count ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Processes: {count}")

# Check recent logs
print("\n=== Recent logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 50 seeding-backend 2>&1 | grep -v 'HTTP Request' | grep -v httpx",
    timeout=30
)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\post_restart_logs.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
