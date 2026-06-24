import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check the actual content of the connected handler in the container
print("=== Check connected handler in container ===")
cmd = 'docker exec seeding-backend sed -n "400,420p" /app/scripts/zca_persistent_listener.js'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\container_connected.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Check the local fixed file
LOCAL_JS = r"D:\CrawlDataLinkedin\realtime_explore\zca_fixed_local.js"
with open(LOCAL_JS, "r", encoding="utf-8") as f:
    local = f.read()
idx = local.find("listener.on(\"connected\"")
if idx >= 0:
    with open(r"D:\CrawlDataLinkedin\realtime_explore\local_connected.txt", "w", encoding="utf-8") as f:
        f.write(local[idx:idx+500])
    print("Local connected block saved")
else:
    print("NOT FOUND in local")

# Compare sizes
print("\n=== Size comparison ===")
cmd = 'docker exec seeding-backend wc -l /app/scripts/zca_persistent_listener.js'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
container_lines = stdout.read().decode().strip()
print(f"Container lines: {container_lines}")

print(f"Local lines: {local.count(chr(10))}")

client.close()
