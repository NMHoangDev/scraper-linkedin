import paramiko

HOST = "10.120.80.45"
USER = "seeding"
PASS = "1"
PORT = 22

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

print("=== VM service-fb-seeding environment ===")

# Check .env
out, err = run("cat /opt/service/service/.env 2>/dev/null || echo 'no .env found at /opt/service/service/'")
print("Service .env file:")
print(out[:3000])

# Check KPI_BACKEND
out, err = run("grep -i 'KPI_BACKEND' /opt/service/service/.env 2>/dev/null || echo 'not found'")
print(f"\nKPI_BACKEND_URL setting: {out.strip()}")

# Check running process args
out, err = run("ps aux | grep python | grep -v grep | head -5")
print(f"\nPython processes: {out[:1000]}")

# Check service logs for KPI errors
out, err = run("tail -50 /opt/service/service.log 2>/dev/null || echo 'no log found'")
print(f"\nService logs (tail 50): {out[:2000]}")

client.close()
