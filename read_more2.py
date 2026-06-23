import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check startup hooks
print("=== main.py startup hooks ===")
cmd = f"grep -n 'start_persisted\\|startup\\|on_event\\|lifespan\\|PersistentListener' {CWD}/linkedin_group_crawler/app/main.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "main_startup.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check uvicorn process
print("\n=== Running uvicorn process ===")
cmd = "docker exec seeding-backend ps aux 2>/dev/null | grep -i 'uvicorn\\|python' | head -10"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "uvicorn_proc.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check startup command
print("\n=== App startup command ===")
cmd = "docker exec seeding-backend cat /proc/1/cmdline 2>/dev/null | tr '\\0' ' ' || echo 'not accessible'"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "startup_cmd.txt"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Read full main.py to find startup hooks
print("\n=== main.py content ===")
cmd = f"cat {CWD}/linkedin_group_crawler/app/main.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(os.path.join(LOCAL, "main.py"), "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
