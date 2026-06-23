import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test exact paths
paths_to_test = [
    "/api/all-platform/zalo/events/stream",
    "/api/all-platform/zalo/events/test-publish",
    "/api/all-platform/zalo/events/share",
    "/api/zalo/events/stream",
    "/api/zalo/events/test-publish",
    "/api/zalo/events/share",
    "/zalo/events/stream",
    "/zalo/events/test-publish",
]

for path in paths_to_test:
    cmd = f'curl -s -o /dev/null -w "%{{http_code}}" "http://localhost:8000{path}?user_id=test" --max-time 3 -H "x-api-key: test-key" 2>&1'
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    code = stdout.read().decode().strip()
    print(f"  HTTP {code:3s} {path}")

# Check API key requirement
print("\n=== Test without API key ===")
cmd = 'curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/all-platform/zalo/events/stream?user_id=test" --max-time 3 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
code = stdout.read().decode().strip()
print(f"  HTTP {code:3s} /api/all-platform/zalo/events/stream (no key)")

# Check the exact response
print("\n=== Exact response ===")
cmd = 'curl -s "http://localhost:8000/api/all-platform/zalo/events/stream?user_id=test&role=member" --max-time 3 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:200])

client.close()
