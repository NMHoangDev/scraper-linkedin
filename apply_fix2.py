import paramiko
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read full file
stdin, stdout, stderr = client.exec_command(f"cat {FILE}", timeout=30)
content = stdout.read().decode("utf-8", errors="replace")

# Verify _UUID_RE exists
if "_UUID_RE" not in content:
    print("ERROR: _UUID_RE not found!")
    client.close()
    exit(1)

# ==========================================
# FIX 1: update_library_message (around line 1909)
# The PATCH uses id=eq.{message_id} and the fetch_messages_by_ids call
# ==========================================
old_update = """async def update_library_message(user_id: str, message_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = datetime.utcnow().isoformat()
    include_deleted = payload.get("is_deleted") is True
    rows = await _rest(
        "PATCH",
        "zalo_messages",
        params={"id": f"eq.{message_id}", "user_id": f"eq.{user_id}"},
        json=payload,
        prefer="return=representation",
    )
    if not rows:
        raise KeyError(message_id)
    fetched = await fetch_messages_by_ids(user_id, [message_id], include_deleted=include_deleted)
    return fetched[0] if fetched else rows[0]"""

new_update = """async def update_library_message(user_id: str, message_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    payload = {key: value for key, value in payload.items() if value is not None}
    payload["updated_at"] = datetime.utcnow().isoformat()
    include_deleted = payload.get("is_deleted") is True
    # Use id for real UUIDs, source_message_id for numeric/legacy IDs
    if _UUID_RE.match(message_id):
        id_params = {"id": f"eq.{message_id}"}
    else:
        id_params = {"source_message_id": f"eq.{message_id}"}
    rows = await _rest(
        "PATCH",
        "zalo_messages",
        params={**id_params, "user_id": f"eq.{user_id}"},
        json=payload,
        prefer="return=representation",
    )
    if not rows:
        raise KeyError(message_id)
    fetched = await fetch_messages_by_ids(user_id, [message_id], include_deleted=include_deleted)
    return fetched[0] if fetched else rows[0]"""

if old_update in content:
    content = content.replace(old_update, new_update)
    print("Fixed update_library_message")
else:
    print("ERROR: old_update pattern not found!")
    # Try to find the function
    for i, line in enumerate(content.split("\n")):
        if "def update_library_message" in line:
            print(f"  Found at line {i+1}")

# ==========================================
# FIX 2: bulk_delete_library_messages (around line 1926)
# The params["id"] = f"in.({','.join(ids)})" needs UUID filtering
# ==========================================
old_bulk_delete = """    payload = {"is_deleted": True, "updated_at": datetime.utcnow().isoformat()}
    params: Dict[str, Any] = {"user_id": f"eq.{user_id}", "is_deleted": "eq.false"}
    ids = [message_id for message_id in (message_ids or []) if message_id]
    if delete_all_matching:
        if group_name:
            params["group_name"] = f"ilike.*{group_name}*"
    else:
        if not ids:
            return 0
        params["id"] = f"in.({','.join(ids)})"

    rows = await _rest(
        "PATCH",
        "zalo_messages",
        params=params,
        json=payload,
        prefer="return=representation",
    )"""

new_bulk_delete = """    payload = {"is_deleted": True, "updated_at": datetime.utcnow().isoformat()}
    params: Dict[str, Any] = {"user_id": f"eq.{user_id}", "is_deleted": "eq.false"}
    ids = [message_id for message_id in (message_ids or []) if message_id]
    if delete_all_matching:
        if group_name:
            params["group_name"] = f"ilike.*{group_name}*"
    else:
        if not ids:
            return 0
        uuid_ids = [mid for mid in ids if _UUID_RE.match(mid)]
        source_ids = [mid for mid in ids if not _UUID_RE.match(mid)]
        if uuid_ids and source_ids:
            params["or"] = f"(id.in.({','.join(uuid_ids)}),source_message_id.in.({','.join(source_ids)}))"
        elif uuid_ids:
            params["id"] = f"in.({','.join(uuid_ids)})"
        elif source_ids:
            params["source_message_id"] = f"in.({','.join(source_ids)})"
        else:
            return 0

    rows = await _rest(
        "PATCH",
        "zalo_messages",
        params=params,
        json=payload,
        prefer="return=representation",
    )"""

if old_bulk_delete in content:
    content = content.replace(old_bulk_delete, new_bulk_delete)
    print("Fixed bulk_delete_library_messages")
else:
    print("ERROR: old_bulk_delete pattern not found!")
    for i, line in enumerate(content.split("\n")):
        if "def bulk_delete" in line:
            print(f"  Found at line {i+1}")

# ==========================================
# Write back to VM
# ==========================================
TMP_FILE = "/tmp/supabase_service_fixed2.py"
b64_content = base64.b64encode(content.encode("utf-8")).decode()
cmd = f'python3 -c "import base64; open(\'{TMP_FILE}\', \'wb\').write(base64.b64decode(\'{b64_content}\')); print(len(open(\'{TMP_FILE}\',\'rb\').read()))"'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
print(f"Write temp: {out.strip()}")

cmd2 = f"cp {TMP_FILE} {FILE}"
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
exit_code = stdout.channel.recv_exit_status()
print(f"Copy: exit={exit_code}")

# Syntax check
print("\n=== Syntax check ===")
stdin, stdout, stderr = client.exec_command(f"python3 -m py_compile {FILE} && echo 'Syntax OK'", timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
err_lines = [l for l in stderr.read().decode("utf-8", errors="replace").split("\n") if "Warning" not in l and l.strip()]
print(out.strip() or "OK")
if err_lines:
    print("Errors:", err_lines[:3])

client.close()
print("Done!")
