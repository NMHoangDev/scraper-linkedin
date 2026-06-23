import paramiko

host, port, user, password = "10.30.50.29", 22, "vmadmin", "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__local_check2.txt", "w", encoding="utf-8", errors="replace")

cmds = [
    # Check what routes are registered
    'curl -s --max-time 5 http://localhost:8000/openapi.json 2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); [print(p) for p in d.get(\\"paths\\",{}).keys() if \\"fb\\" in p or \\"session\\" in p.lower()]" 2>&1',
    # Check seeder_service_url config
    'docker exec $(docker ps -q --filter name=app 2>/dev/null | head -1) env 2>&1 | grep -i SEEDER 2>&1',
    # Check if there's a local dev backend
    'ps aux | grep -E "uvicorn|python.*main" | grep -v grep | head -5',
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"=== {cmd[:80]} ===", file=out_file)
    print(out[:500] if out else f"(empty, err={err[:200]})", file=out_file)

out_file.close()
client.close()
print("Done")
