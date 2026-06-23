import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test 1: Check listener status
print("=== Test 1: Listener status ===")
stdin, stdout, stderr = client.exec_command(
    "curl -s http://localhost:8000/api/zalo/listener/status -H 'X-User-ID: test-user' -H 'x-api-key: test-key' 2>&1",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace").strip())

# Test 2: Use test-publish endpoint to inject a fake message
print("\n=== Test 2: Publish test message ===")
test_msg = "Hello from test - " + str(int(time.time()))
stdin, stdout, stderr = client.exec_command(
    f'curl -s "http://localhost:8000/api/zalo/events/test-publish?account_id=test-account&sender_name=TestBot&message_text={test_msg}" -H "x-api-key: test-key" 2>&1',
    timeout=15
)
out = stdout.read().decode("utf-8", errors="replace")
print(out[:500])

# Test 3: SSE stream test - open stream and check if we get the test message
print("\n=== Test 3: SSE stream test ===")
# Use timeout of 8 seconds to get any messages
cmd = f"""timeout 8 curl -s -N -H "x-api-key: test-key" "http://localhost:8000/api/zalo/events/stream?user_id=test-user&role=member" 2>&1 || true"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode("utf-8", errors="replace")
# Filter to show only SSE lines
lines = out.split("\n")
for line in lines[:30]:
    if line.strip():
        print(line)

# Test 4: Check recent backend logs for listener activity
print("\n=== Test 4: Recent backend logs ===")
cmd = "docker logs --tail 50 seeding-backend 2>&1 | grep -i 'listener\\|ZCA\\|publish\\|realtime\\|SSE\\|stream\\|connected\\|sync' | tail -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
lines = out.strip().split("\n")
for line in lines[:20]:
    if line.strip():
        print(line[:200])

client.close()
