import paramiko

HOST = "10.120.80.45"
USER = "seeding"
PASS = "1"
PORT = 22

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)
out_file = open("D:/CrawlDataLinkedin/__vm_service_check.txt", "w", encoding="utf-8", errors="replace")

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

# Check environment variables for KPI config
out, err = run("env | grep -i kpi 2>&1")
out_file.write(f"KPI env vars:\n{out}\n")
out_file.write(f"stderr: {err}\n\n")

# Check .env file
out, err = run("cat /opt/service/service/.env 2>/dev/null || cat ~/service/.env 2>/dev/null || echo 'no .env found'")
out_file.write(f"Service .env:\n{out}\n\n")

# Check running process
out, err = run("ps aux | grep -E 'python|uvicorn|main' | grep -v grep")
out_file.write(f"Running processes:\n{out}\n\n")

# Check service logs for KPI
out, err = run("tail -100 /opt/service/service.log 2>/dev/null || journalctl -u service-fb-seeding --no-pager -n 100 2>/dev/null || echo 'no logs found'")
out_file.write(f"Service logs:\n{out}\n\n")

# Check KPI_BACKEND_URL specifically
out, err = run("grep -r 'KPI_BACKEND' /opt/service/ 2>/dev/null | head -20")
out_file.write(f"KPI_BACKEND in service:\n{out}\n\n")

out_file.close()
client.close()
print("Done - see __vm_service_check.txt")
