import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check if file exists
print("=== Check if file exists ===")
cmd = "ls -la /tmp/zca_persistent_listener_fixed.js 2>&1; echo '---'; ls -la /tmp/zca_fixed_new.js 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Try using docker cp directly from the vm to container
print("\n=== Try docker cp ===")
# First check which user docker exec uses
cmd = "docker exec seeding-backend whoami 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
user = stdout.read().decode().strip()
print(f"Container user: {user}")

# Try copying as the container user
cmd = "docker exec seeding-backend ls -la /tmp/zca_persistent_listener_fixed.js 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(f"Container ls: {out.decode()}")

# Maybe we need to copy to a docker volume or the scraper-linkedin project dir
print("\n=== Try alternative paths ===")
# Check where the scraper app lives in container
cmd = "docker exec seeding-backend ls /app/scripts/ 2>&1 | head -5"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(f"Container scripts: {out.decode('utf-8','replace')}")

# Check the project dir on VM
cmd = "ls /opt/apps/seeding_markeeai/scraper-linkedin/scripts/ 2>&1 | head -5"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(f"VM scripts: {out.decode('utf-8','replace')}")

client.close()
