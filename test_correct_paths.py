import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Test /api/zalo/events/stream directly
print("=== /api/zalo/events/stream (port 8000) ===")
cmd = 'curl -s -N --max-time 5 "http://localhost:8000/api/zalo/events/stream?user_id=test-user&role=member" 2>&1 | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

# Test /api/zalo/listener/status
print("\n=== /api/zalo/listener/status (port 8000) ===")
cmd = 'curl -s "http://localhost:8000/api/zalo/listener/status" --max-time 5 2>&1 | head -3'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:300])

# Test /api/zalo/events/test-publish
print("\n=== /api/zalo/events/test-publish (port 8000) ===")
cmd = 'curl -s "http://localhost:8000/api/zalo/events/test-publish?account_id=test-acct&sender_name=TestBot&message_text=hello123" --max-time 5 2>&1 | head -3'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:300])

# Check what openapi says about /api/zalo/events
print("\n=== /api/zalo/events/ in openapi ===")
cmd = "python3 -c \"\nimport json\nwith open('/tmp/openapi.json') as f:\n    d = json.load(f)\npaths = d.get('paths', {})\nfor p in sorted(paths.keys()):\n    if 'event' in p.lower():\n        print(p)\n        print(json.dumps(paths[p], indent=2)[:200])\n\""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:500])

client.close()
