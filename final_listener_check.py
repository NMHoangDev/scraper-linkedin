import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check listener status for zl_8560c387 (the main account)
print("=== Listener status (zl_8560c387) ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s http://localhost:8000/api/zalo/listener/status -H 'X-User-ID: zl_8560c387' 2>&1",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Check ZCA processes
print("\n=== ZCA node processes ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep",
    timeout=15
)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Count
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l",
    timeout=15
)
count = int(stdout.read().decode().strip())
print(f"Total: {count}")

# Recent logs
print("\n=== Recent backend logs (last 30 non-HTTP lines) ===")
stdin, stdout, stderr = client.exec_command(
    "docker logs --tail 200 seeding-backend 2>&1 | grep -v 'HTTP Request' | tail -30",
    timeout=30
)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:2000])

client.close()
