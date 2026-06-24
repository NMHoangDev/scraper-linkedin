import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Rebuild frontend
print("=== Building Docker frontend ===")
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && docker compose build --no-cache frontend 2>&1",
    timeout=900
)
out_full = b""
while True:
    chunk = stdout.read(8192)
    if not chunk:
        break
    out_full += chunk

exit_code = stdout.channel.recv_exit_status()
text = out_full.decode("utf-8", errors="replace")
print(text[-6000:])
print(f"\nExit code: {exit_code}")

if exit_code == 0:
    print("\nFrontend build succeeded! Restarting containers...")
    stdin, stdout, stderr = client.exec_command(
        f"cd {CWD} && docker compose up -d 2>&1",
        timeout=120
    )
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    print(out)
    if err:
        print("STDERR:", err[-2000:])

    print("\n=== Container status ===")
    stdin, stdout, stderr = client.exec_command(f"cd {CWD} && docker compose ps 2>&1", timeout=30)
    print(stdout.read().decode("utf-8", errors="replace"))

    print("\n=== Health check ===")
    stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health 2>&1", timeout=15)
    print(stdout.read().decode("utf-8", errors="replace"))

client.close()
