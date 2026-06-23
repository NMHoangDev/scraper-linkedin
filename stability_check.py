import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

import time

# Wait 60s
print("=== Waiting 60s ===")
for i in range(6):
    time.sleep(10)
    cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    count = int(stdout.read().decode().strip())
    print(f"  +{(i+1)*10}s: {count} processes")

# Final check
print("\n=== Final check ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Check for crashes in logs
print("\n=== Crash logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 200 seeding-backend 2>&1 | grep -i 'crashed\\|Separator is found\\|restarting.*attempt\\|connected.*user\\|save_listener_messages' | grep -v 'HTTP Request' | tail -20",
    timeout=30
)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\stability_check.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Full recent logs
print("\n=== Recent raw logs ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 50 seeding-backend 2>&1 | grep -v 'HTTP Request' | grep -v httpx",
    timeout=30
)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\final_raw.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
