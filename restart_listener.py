import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# The grep was showing function def lines. Verify connected handler has NO active requestOldMessages call
print("=== Verify: connected handler has NO active requestOldMessages call ===")
# Get the connected handler block
cmd = 'docker exec seeding-backend sed -n "400,420p" /app/scripts/zca_persistent_listener.js'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Count active (non-commented) requestOldMessages calls in the connected handler
# A line like "    requestOldMessages(listener);" at column 4 (not commented)
print("\n=== Check for non-commented active requestOldMessages calls ===")
cmd = 'docker exec seeding-backend sed -n "400,420p" /app/scripts/zca_persistent_listener.js | grep -n "requestOldMessages" | grep -v "^.*//"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace") or "NONE (good!)")

# Restart the listener to use the new JS
print("\n=== Restart ZCA listener for zl_8560c387 ===")
cmd = 'curl -s -X POST http://localhost:8000/api/zalo/listener/stop -H "Content-Type: application/json" -d \'{"user_id":"zl_8560c387"}\' 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

import time
time.sleep(3)

cmd = 'curl -s -X POST http://localhost:8000/api/zalo/listener/start -H "Content-Type: application/json" -d \'{"user_id":"zl_8560c387"}\' 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

time.sleep(5)

# Check process count
print("\n=== Process count after restart ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"ZCA processes: {count}")

# Check logs for crashes
print("\n=== Recent backend logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 50 seeding-backend 2>&1 | grep -v 'HTTP Request' | grep -v httpx",
    timeout=30
)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\restart_logs.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
