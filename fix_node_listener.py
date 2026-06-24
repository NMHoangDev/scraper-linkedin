import paramiko
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read current zca_persistent_listener.js from container
print("=== Read zca_persistent_listener.js ===")
cmd = "docker exec seeding-backend cat /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
content = stdout.read().decode("utf-8", errors="replace")
print(f"Size: {len(content)}")

# The problem: requestOldMessages is called on "connected" event
# This floods Zalo with messages and causes "Separator is found" crash
# Fix: Disable requestOldMessages calls - Python startup sync handles this with rate limiting

# Fix 1: Remove requestOldMessages from "connected" event handler
old_connected = """  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    requestOldMessages(listener);
    if (!oldMessageTimer) {
      oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    }
  });"""

new_connected = """  // NOTE: requestOldMessages is disabled here because the Python startup sync
  // (zca_persistent_listener.py _sync_recent_groups_after_connect) already handles
  // old message loading with proper rate-limiting. Calling requestOldMessages here
  // causes Zalo to flood the WebSocket with massive message bursts, triggering
  // "Separator is found" crashes. Old messages are loaded via Python only.
  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    // requestOldMessages DISABLED - handled by Python startup sync instead
    // if (!oldMessageTimer) {
    //   oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    // }
  });"""

if old_connected in content:
    content = content.replace(old_connected, new_connected)
    print("Fix: Disabled requestOldMessages on connected event")
else:
    print("WARNING: Pattern not found - checking...")
    idx = content.find("listener.on(\"connected\"")
    print(f"  listener.on connected at: {idx}")
    if idx >= 0:
        print(content[idx:idx+500])

# Write to local file first, then upload via base64
b64 = base64.b64encode(content.encode("utf-8")).decode()
print(f"\nBase64 length: {len(b64)}")

# Write to VM via python base64 decode
import math
chunk_size = 50000
num_chunks = math.ceil(len(b64) / chunk_size)
print(f"Splitting into {num_chunks} chunks...")

# Write to temp file in parts
TMP = "/tmp/zca_listener_fixed.js"
for i in range(num_chunks):
    chunk = b64[i*chunk_size:(i+1)*chunk_size]
    part_file = f"/tmp/part_{i}.b64"
    client.exec_command(f'python3 -c "import base64; open(\'{part_file}\', \'w\').write(\'{chunk}\')"')
    print(f"  Chunk {i+1}/{num_chunks} written ({len(chunk)} bytes)")

# Concatenate
client.exec_command(f"python3 -c \"import base64; data=''.join(open(f'/tmp/part_{{i}}.b64').read() for i in range({num_chunks})); open('{TMP}', 'wb').write(base64.b64decode(data))\"")
print(f"Concatenated to {TMP}")

# Verify size
cmd = f"wc -c {TMP}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
size = stdout.read().decode().strip()
print(f"Decoded size: {size}")

# Deploy
print("\n=== Deploy to container ===")
# Copy into container
client.exec_command(f"docker exec seeding-backend cp {TMP} /app/scripts/zca_persistent_listener.js")
print("Copied to container")

# Verify
cmd = "docker exec seeding-backend wc -l /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
print(f"Lines: {stdout.read().decode().strip()}")

# Verify fix
cmd = 'docker exec seeding-backend grep -c "requestOldMessages DISABLED" /app/scripts/zca_persistent_listener.js'
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = stdout.read().decode().strip()
print(f"Fix verification: {count}")

client.close()
print("\nDone!")
