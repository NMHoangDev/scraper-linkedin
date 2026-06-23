import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check disk space
print("=== Disk space ===")
stdin, stdout, stderr = client.exec_command("df -h", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

# Check docker usage
print("\n=== Docker disk usage ===")
stdin, stdout, stderr = client.exec_command("docker system df", timeout=30)
print(stdout.read().decode("utf-8", errors="replace"))

# Check large directories
print("\n=== Largest directories ===")
stdin, stdout, stderr = client.exec_command("du -sh /var/lib/docker/ 2>/dev/null || echo 'N/A'", timeout=30)
print(stdout.read().decode("utf-8", errors="replace"))

client.close()
