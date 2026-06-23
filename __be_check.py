import paramiko

host, port, user, password = "10.30.50.29", 22, "vmadmin", "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__be_check.txt", "w", encoding="utf-8", errors="replace")

# Check which backend is running (pid 467943 is the vmadmin one on port 8000)
cmds = [
    # Get the pid of the backend on port 8000
    'ss -tlnp | grep 8000',
    # Check if new endpoint is reachable via local backend
    'curl -s --max-time 5 http://127.0.0.1:8000/api/all-platform/fb/session/owner/test123 2>&1 | head -c 300',
    # Health
    'curl -s --max-time 5 http://127.0.0.1:8000/health 2>&1 | head -c 200',
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
