import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    return stdout.read().decode("utf-8", errors="replace"), stderr.read().decode("utf-8", errors="replace")

# Check docker containers
out, err = run("docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null")
print("Docker containers:")
print(out)

# Check which uvicorn is serving port 8000
out, err = run("ss -tlnp | grep 8000 2>/dev/null")
print(f"\nPort 8000: {out}")

# Check if linkedin-crawler container exists
out, err = run("docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Ports}}' 2>/dev/null | grep -i linke")
print(f"\nLinkedin containers: {out}")

# Check uvicorn logs for fb_post_kpi errors
out, err = run("journalctl -u linkedin-crawler --no-pager -n 30 2>/dev/null | grep -i 'fb_post_kpi\\|kpi\\|error' | tail -20")
print(f"\nBackend logs: {out[:2000]}")

client.close()
