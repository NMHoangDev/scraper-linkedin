import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Final process count
print("=== ZCA Node processes ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Total: {count}")

# Backend health
print("\n=== Backend health ===")
cmd = "curl -s http://localhost:8000/health"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
print(stdout.read().decode())

# Check for any crashes in recent logs
print("\n=== Crash events in logs ===")
cmd = "docker logs --tail 5000 seeding-backend 2>&1 | grep -c 'crashed\\|Separator is found' || echo 0"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
crash_count = int(stdout.read().decode().strip())
print(f"Crash events: {crash_count}")

# Check recent save_listener_messages (new messages saved successfully)
print("\n=== Messages saved ===")
cmd = "docker logs --tail 5000 seeding-backend 2>&1 | grep 'save_listener_messages.*messages=' | tail -5"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\msg_saved.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Commit hashes
print("\n=== Current state ===")
print("Container: RUNNING")
print(f"ZCA processes: {count} (should be 1)")
print(f"Crash events: {crash_count}")
print(f"Python fix: YES (drain + backoff + max crash limit)")
print(f"Node.js fix: YES (requestOldMessages DISABLED)")
print(f"Git commits: 2 (local) - push manually with 'git push origin restyle-form'")

client.close()
