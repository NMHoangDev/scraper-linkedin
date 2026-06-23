import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Try with the right auth
print("=== Test with x-api-key ===")
cmd = 'curl -v "http://localhost:8000/api/zalo/events/stream?user_id=test&role=member" -H "x-api-key: test-key" --max-time 5 2>&1 | head -30'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace")[:1000])

# Try /api/all-platform/zalo/events/stream
print("\n=== Test /api/all-platform/zalo/events/stream ===")
cmd2 = 'curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/all-platform/zalo/events/stream?user_id=test" -H "x-api-key: test-key"'
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
code = stdout.read().decode().strip()
print(f"HTTP {code}")

# Also check what the nginx/router config does
print("\n=== Nginx routes ===")
stdin, stdout, stderr = client.exec_command(
    "grep -n 'location\\|proxy_pass' /opt/apps/seeding_markeeai/scraper-linkedin/nginx-router/nginx.conf 2>/dev/null | head -20",
    timeout=15
)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\nginx_locations.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check /docs to see what routes are available
print("\n=== OpenAPI ===")
cmd3 = 'curl -s "http://localhost:8000/openapi.json" 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); [print(k) for k in d.get(\"paths\",{}).keys() if \"zalo\" in k.lower() or \"event\" in k.lower()]"'
stdin, stdout, stderr = client.exec_command(cmd3, timeout=15)
out3 = stdout.read()
print(out3.decode("utf-8", errors="replace")[:500])

client.close()
