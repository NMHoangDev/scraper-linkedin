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

# 1. Read current JS from container
print("=== 1. Read current JS ===")
cmd = "docker exec seeding-backend cat /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
content = stdout.read().decode("utf-8", errors="replace")

# 2. Apply fix
old_block = """  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    requestOldMessages(listener);
    if (!oldMessageTimer) {
      oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    }
  });"""

new_block = """  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    // NOTE: requestOldMessages DISABLED - Python startup sync (_sync_recent_groups_after_connect)
    // handles old message loading with rate-limiting. Calling it here floods Zalo WebSocket
    // and causes "Separator is found" crashes from massive message bursts.
    // if (!oldMessageTimer) {
    //   oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    // }
  });"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Fix applied")
else:
    print("ERROR: Pattern not found!")
    exit(1)

# 3. Save to local file
with open(LOCAL_JS, "w", encoding="utf-8") as f:
    f.write(content)
print(f"Saved locally: {len(content)} bytes")

# 4. SFTP upload to VM
print("\n=== 4. SFTP upload ===")
sftp = client.open_sftp()
sftp.put(LOCAL_JS, TMP_VM)
print(f"Uploaded to {TMP_VM}")

# 5. Copy to container
print("\n=== 5. Copy to container ===")
cmd = f"docker exec seeding-backend cp {TMP_VM} /app/scripts/zca_persistent_listener.js && echo OK"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode().strip()
err = stderr.read().decode().strip()
print(f"stdout: {out}")
if err:
    print(f"stderr: {err}")

# 6. Verify
print("\n=== 6. Verify ===")
cmd = 'docker exec seeding-backend grep -n "DISABLED\\|requestOldMessages\\|connected" /app/scripts/zca_persistent_listener.js | head -15'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

sftp.close()
client.close()
print("\nDone!")
