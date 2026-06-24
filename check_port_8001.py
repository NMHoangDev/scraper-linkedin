import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check if port 8001 (old process) has the routes
print("=== Port 8001 (old process) ===")
cmd = 'curl -s "http://localhost:8001/api/zalo/events/stream?user_id=test&role=member" --max-time 3 2>&1 | head -5'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:200])

# Check Docker backend (port 8000)
print("\n=== Docker backend (port 8000) - /api/all-platform/zalo/ ===")
cmd2 = 'curl -s "http://localhost:8000/api/all-platform/zalo/events/stream?user_id=test&role=member" --max-time 3 2>&1 | head -5'
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
out2 = stdout.read()
print(out2.decode("utf-8", errors="replace")[:200])

# Check what process is on 8001
print("\n=== Process on port 8001 ===")
cmd3 = "ps aux | grep 111132 | grep -v grep"
stdin, stdout, stderr = client.exec_command(cmd3, timeout=10)
out3 = stdout.read()
print(out3.decode("utf-8", errors="replace")[:500])

# Check /api/all-platform/ directly
print("\n=== /api/all-platform/ ===")
cmd4 = 'curl -s "http://localhost:8000/api/all-platform/zalo/events/stream?user_id=test&role=member" --max-time 3 2>&1 | head -5'
stdin, stdout, stderr = client.exec_command(cmd4, timeout=15)
out4 = stdout.read()
print(out4.decode("utf-8", errors="replace")[:200])

client.close()
