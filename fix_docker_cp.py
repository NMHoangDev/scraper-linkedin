import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
LOCAL_JS = r"D:\CrawlDataLinkedin\realtime_explore\zca_fixed_local.js"
TMP_VM = "/tmp/zca_persistent_listener_fixed.js"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# The file zca_fixed_local.js already exists from previous run
# Just use docker cp to copy it into the container
# docker cp <src> <container>:<dest>
print("=== Copy fixed JS into container ===")
cmd = f"docker cp {TMP_VM} seeding-backend:/app/scripts/zca_persistent_listener.js 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f"stdout: {out}")
print(f"stderr: {err}")

import time
time.sleep(2)

# Verify
print("\n=== Verify ===")
cmd = 'docker exec seeding-backend grep -n "DISABLED\\|requestOldMessages" /app/scripts/zca_persistent_listener.js | grep -v "//.*requestOld" | head -10'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

client.close()
print("\nDone!")
