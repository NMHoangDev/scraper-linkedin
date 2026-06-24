import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test /api/all-platform/zalo/events/stream
print("=== /api/all-platform/zalo/events/stream (SSE, 5s timeout) ===")
cmd = f"""timeout 5 curl -s -N "http://localhost:8080/api/all-platform/zalo/events/stream?user_id=test-user&role=member" 2>&1 | head -10"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:1000])

# Test test-publish endpoint
print("\n=== /api/all-platform/zalo/events/test-publish ===")
test_msg = "Hello_" + str(int(time.time()))
cmd = f'curl -s "http://localhost:8080/api/all-platform/zalo/events/test-publish?account_id=test-acct&sender_name=TestBot&message_text={test_msg}" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

# Test listener status
print("\n=== /api/all-platform/zalo/listener/status ===")
cmd = 'curl -s "http://localhost:8080/api/all-platform/zalo/listener/status" 2>&1'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

# Test full SSE stream with publish to verify round-trip
print("\n=== SSE stream + publish round-trip test ===")
# First open SSE stream in background
cmd = f"""bash -c 'curl -s -N "http://localhost:8080/api/all-platform/zalo/events/stream?user_id=roundtrip-test&role=member" --max-time 8 &\nsleep 2\ncurl -s "http://localhost:8080/api/all-platform/zalo/events/test-publish?account_id=roundtrip-acct&sender_name=TestBot&message_text=roundtrip-ok"\nsleep 3\nwait\n' 2>&1 | head -20"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=20)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:1500])

client.close()
