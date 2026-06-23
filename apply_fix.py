import paramiko
import base64
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read the full file
stdin, stdout, stderr = client.exec_command(f"cat {FILE}", timeout=30)
content = stdout.read().decode("utf-8", errors="replace")
print(f"File size: {len(content)} bytes")

# Fix 1: Add UUID_RE after "import uuid"
UUID_RE_LINE = "import uuid"
UUID_RE_ADD = "import uuid\nimport re\n\n_UUID_RE = re.compile(r\"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$\", re.IGNORECASE)"

if UUID_RE_LINE in content and "#" not in content.split(UUID_RE_LINE)[0].split("\n")[-1]:
    # Check if already added
    if "_UUID_RE" not in content:
        content = content.replace(UUID_RE_LINE, UUID_RE_ADD)
        print("Added UUID_RE pattern")
    else:
        print("UUID_RE pattern already exists")
else:
    print("WARNING: 'import uuid' not found or has comment")

# Fix 2: Replace uuid.UUID(mid) check with _UUID_RE.match(mid)
old_code = """    uuid_ids = []
    source_ids = []
    for mid in message_ids:
        try:
            uuid.UUID(mid)
            uuid_ids.append(mid)
        except ValueError:
            source_ids.append(mid)"""

new_code = """    uuid_ids = []
    source_ids = []
    for mid in message_ids:
        if _UUID_RE.match(mid):
            uuid_ids.append(mid)
        else:
            source_ids.append(mid)"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Replaced uuid.UUID(mid) with _UUID_RE.match(mid)")
else:
    print("ERROR: old code block NOT found")

# Write fixed content to temp file
TMP_FILE = "/tmp/supabase_service_fixed.py"
b64_content = base64.b64encode(content.encode("utf-8")).decode()
cmd = f'python3 -c "import base64; open(\'{TMP_FILE}\', \'wb\').write(base64.b64decode(\'{b64_content}\')); print(len(open(\'{TMP_FILE}\',\'rb\').read()))"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(f"Write temp: {out.strip()} {err.strip()}")

# Copy to final location
stdin, stdout, stderr = client.exec_command(f"cp {TMP_FILE} {FILE}", timeout=15)
exit_code = stdout.channel.recv_exit_status()
print(f"Copy: exit={exit_code}")

# Verify
stdin, stdout, stderr = client.exec_command(f"grep -n '_UUID_RE\\|UUID_RE' {FILE} | head -5", timeout=10)
print(f"Verify: {stdout.read().decode('utf-8', errors='replace').strip()}")

stdin, stdout, stderr = client.exec_command(f"grep -n 'uuid.UUID(mid)' {FILE}", timeout=10)
remaining = stdout.read().decode("utf-8", errors="replace").strip()
print(f"uuid.UUID(mid) remaining: '{remaining}' (empty = good)")

client.close()
print("Done!")
