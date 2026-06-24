import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Method: Use sed to directly modify the container file
# We need to:
# 1. Comment out requestOldMessages(listener); on line 405
# 2. Comment out the oldMessageTimer interval on line 407

# First check current content around line 403-410
print("=== Current lines 400-415 ===")
cmd = "docker exec seeding-backend sed -n '400,415p' /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\container_lines.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Replace the connected handler using sed
# We need to find and replace the connected block carefully
# Line 403: listener.on("connected", () => {
# Line 404: emit(...)
# Line 405: requestOldMessages(listener);
# Line 406: if (!oldMessageTimer) {
# Line 407: oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
# Line 408: }
# Line 409: });

# Use Python to do the replacement via exec
print("\n=== Apply fix via Python exec ===")

# Read the file from container
cmd = "docker exec seeding-backend cat /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
content = stdout.read().decode("utf-8", errors="replace")

# Replace
old_block = """  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    requestOldMessages(listener);
    if (!oldMessageTimer) {
      oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    }
  });"""

new_block = """  listener.on("connected", () => {
    emit({ event: "connected", user_id: userId, own_id: typeof api.getOwnId === "function" ? api.getOwnId() : null });
    // NOTE: requestOldMessages DISABLED here - Python startup sync (_sync_recent_groups_after_connect)
    // handles old message loading with rate-limiting. Calling it here floods Zalo WebSocket
    // and causes "Separator is found" crashes from massive message bursts.
    // if (!oldMessageTimer) {
    //   oldMessageTimer = setInterval(() => requestOldMessages(listener), oldMessageIntervalMs);
    // }
  });"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print("Replacement found and done")
else:
    print("WARNING: Block not found exactly!")
    # Try without whitespace normalization
    import re
    pattern = r'  listener\.on\("connected", \(\) => \{\s+emit\([^)]+\);\s+requestOldMessages\([^)]+\);\s+if \(!oldMessageTimer\) \{\s+oldMessageTimer = setInterval\(\(\) => requestOldMessages\(listener\), oldMessageIntervalMs\);\s+\}\s+\}\);'
    match = re.search(pattern, content)
    if match:
        print(f"Found via regex at {match.start()}-{match.end()}")
        content = re.sub(pattern, new_block, content)
        print("Replaced via regex")
    else:
        print("NOT FOUND via regex either")
        # Just find and print surrounding context
        idx = content.find('listener.on("connected"')
        print(f"Found 'listener.on(connected' at {idx}")
        if idx >= 0:
            print(content[idx:idx+400])

# Write to VM, then copy to container
import base64
b64 = base64.b64encode(content.encode("utf-8")).decode()

# Use Python on VM to decode
TMP_VM = "/tmp/zca_fixed_new.js"
cmd = f'python3 -c "import base64; open(\'{TMP_VM}\', \'wb\').write(base64.b64decode(\'{b64}\'))"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
err = stderr.read()
if err:
    print(f"Decode error: {err.decode()[:200]}")
else:
    print(f"Decoded to {TMP_VM}")

# Verify VM file
cmd = f"wc -c {TMP_VM}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
size = stdout.read().decode().strip()
print(f"VM file size: {size}")

# Copy to container
cmd = f"docker exec seeding-backend cp {TMP_VM} /app/scripts/zca_persistent_listener.js 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
err = stderr.read()
print(f"Copy stdout: {out.decode()[:100]}")
if err:
    print(f"Copy stderr: {err.decode()[:100]}")

# Verify
cmd = "docker exec seeding-backend grep -n 'DISABLED\\|requestOldMessages\\|connected' /app/scripts/zca_persistent_listener.js | grep -v '//.*requestOld' | head -10"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(f"\nVerification:\n{out.decode('utf-8','replace')}")

client.close()
