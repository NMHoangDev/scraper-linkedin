import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL_JS = r"D:\CrawlDataLinkedin\realtime_explore\zca_fixed_local.js"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Copy fixed JS to the source directory on VM
print("=== Copy to source dir ===")
sftp = client.open_sftp()
dest_vm = f"{CWD}/scripts/zca_persistent_listener.js"
sftp.put(LOCAL_JS, dest_vm)
print(f"Copied to {dest_vm}")
sftp.close()

# 2. Copy into container too
print("\n=== Copy to container ===")
cmd = f"docker cp {dest_vm} seeding-backend:/app/scripts/zca_persistent_listener.js && echo OK"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
print(stdout.read().decode().strip())

# 3. Commit the Node.js fix
print("\n=== Git commit Node.js fix ===")
cmd = f"""cd {CWD} && git add scripts/zca_persistent_listener.js && git commit -m 'fix(zalo): disable requestOldMessages on connected event

The requestOldMessages call on ZCA WebSocket "connected" event caused
Zalo to flood the socket with massive message bursts. This triggered
"Separator is found" crashes and cascaded into an infinite restart loop
spawning 46 zombie Node processes.

Python startup sync (_sync_recent_groups_after_connect) already handles
old message loading with proper rate-limiting, so this call is redundant
and harmful.

Changes:
- Comment out requestOldMessages(listener) in connected handler
- Comment out the oldMessageTimer interval that also called it'"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
print(out[:500])

# Verify commit
print("\n=== Git log ===")
cmd = f"cd {CWD} && git log -5 --oneline"
stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
print("\nDone!")
