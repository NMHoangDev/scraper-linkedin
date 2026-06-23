import paramiko
import time

host, port, user, password = "10.30.50.29", 22, "vmadmin", "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__restart_be.txt", "w", encoding="utf-8", errors="replace")

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

# 1. Find the backend process PID
print("1. Finding backend process...", file=out_file)
out, err = run("ps aux | grep uvicorn | grep 'port 8000' | grep -v grep")
print(f"PID line: {out}", file=out_file)

# 2. Kill and restart with --reload (if not running with reload)
pid = None
for line in out.strip().split("\n"):
    if "port 8000" in line and "vmadmin" in line:
        pid = line.split()[1]
        break

if pid:
    print(f"2. Killing PID {pid}...", file=out_file)
    run(f"kill {pid}")
    time.sleep(2)

# 3. Start with --reload
print("3. Starting backend with --reload...", file=out_file)
run(f"cd {CWD} && nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend.log 2>&1 &")
time.sleep(3)

# 4. Health check
print("4. Health check after restart...", file=out_file)
out, err = run("curl -s --max-time 10 http://127.0.0.1:8000/health 2>&1")
print(f"Health: {out}", file=out_file)

# 5. Test new endpoint
print("5. Testing new endpoint...", file=out_file)
out, err = run("curl -s --max-time 10 'http://127.0.0.1:8000/api/all-platform/fb/session/owner/test123' 2>&1")
print(f"New endpoint: {out[:300]}", file=out_file)

# 6. Verify via service
out, err = run("curl -s --max-time 10 -H 'X-API-Key: 0ZuQJygUBevRMOfMswmNttMGIzet8Y-w' 'https://auto-fb.zenithglobal.dev/session/owner/fb_61554278518170' 2>&1")
print(f"Service direct: {out[:300]}", file=out_file)

out_file.close()
client.close()
print("Done")
