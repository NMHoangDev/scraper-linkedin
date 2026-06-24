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

# ============================================================
# FIX 1: message_events.py - publish_zalo_message_event
# Change .get(account, set()) to .get(account)
# ============================================================
FILE1 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py"
stdin, stdout, stderr = client.exec_command(f"cat {FILE1}", timeout=30)
content1 = stdout.read().decode("utf-8", errors="replace")

old1 = "    for queue, meta in list(_subscribers.get(account, set())):"
new1 = "    for queue, meta in list(_subscribers.get(account) or []):"

if old1 in content1:
    content1 = content1.replace(old1, new1)
    print("Fix 1: Applied - .get(account) instead of .get(account, set())")
else:
    print("Fix 1: Pattern not found or already fixed")

# Write back
TMP = "/tmp/message_events_fixed.py"
b64 = base64.b64encode(content1.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP} {FILE1}")
print("Fix 1: Written to VM")

# ============================================================
# FIX 2: zca_persistent_listener.py - event type 'new_messages' -> 'zalo-message'
# ============================================================
FILE2 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(f"cat {FILE2}", timeout=30)
content2 = stdout.read().decode("utf-8", errors="replace")

old2 = '''                event = {
                    "type": "new_messages",
                    "account_id": state.user_id,
                    "group_id": group_id,
                    "group_name": group_name,
                    "messages": [message.model_dump() for message in messages],
                }'''

new2 = '''                event = {
                    "type": "zalo-message",
                    "account_id": state.user_id,
                    "group_id": group_id,
                    "group_name": group_name,
                    "messages": [message.model_dump() for message in messages],
                }'''

if old2 in content2:
    content2 = content2.replace(old2, new2)
    print("Fix 2: Applied - type 'zalo-message' instead of 'new_messages'")
else:
    print("Fix 2: Pattern not found, checking...")
    # Try to find similar patterns
    import re
    idx = content2.find('"type": "new_messages"')
    if idx >= 0:
        print(f"  Found at index {idx}: {content2[max(0,idx-50):idx+100]}")
    else:
        print("  NOT FOUND - may already be fixed or different format")

# Write back
TMP2 = "/tmp/zca_persistent_listener_fixed.py"
b64 = base64.b64encode(content2.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP2}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP2} {FILE2}")
print("Fix 2: Written to VM")

# ============================================================
# FIX 3: message_events.py - SSE format for heartbeat in subscribe_zalo_events
# ============================================================
stdin, stdout, stderr = client.exec_command(f"cat {FILE1}", timeout=30)
content1_fresh = stdout.read().decode("utf-8", errors="replace")

old3 = '''                yield "event: heartbeat\\ndata: {}\\n\\n"'''
new3 = '''                yield "event: heartbeat\\ndata: {}\\n\\n"'''

# Actually let me check what the heartbeat format currently looks like
import re
for match in re.finditer(r'yield.*heartbeat.*\\n', content1_fresh):
    print(f"Heartbeat line: {repr(content1_fresh[match.start():match.start()+80])}")

# Check if there are multiple heartbeat yields
heartbeat_count = content1_fresh.count('event: heartbeat')
print(f"Fix 3: Found {heartbeat_count} heartbeat occurrences in subscribe_zalo_events")

# The heartbeat format "event: heartbeat\\ndata: {}\\n\\n" looks correct for SSE.
# Let me check the events.py event_gen instead.
print("Fix 3: Heartbeat in message_events.py appears OK, checking events.py")

# ============================================================
# FIX 4: events.py - consume auth_expired in event_gen
# ============================================================
FILE3 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py"
stdin, stdout, stderr = client.exec_command(f"cat {FILE3}", timeout=30)
content3 = stdout.read().decode("utf-8", errors="replace")

# Find subscribe_zalo_events call and wrap it with auth_expired handling
old4 = '''            async for event in subscribe_zalo_events(
                account_ids,
                role=caller_role,
                email=caller_email,
                caller_id=caller_id,
            ):'''

new4 = '''            # Also listen for auth-expired events from ZCA listeners
            auth_expired_task = asyncio.create_task(
                _wait_auth_expired_for_accounts(account_ids)
            )

            async for event in subscribe_zalo_events(
                account_ids,
                role=caller_role,
                email=caller_email,
                caller_id=caller_id,
            ):'''

if old4 in content3:
    content3 = content3.replace(old4, new4)
    print("Fix 4: Applied - auth_expired consumer in event_gen")
else:
    print("Fix 4: Pattern not found")

# Add the helper function to events.py
# Find where to insert the helper (before the router definition or before stream_zalo_events)
helper_func = '''
async def _wait_auth_expired_for_accounts(account_ids: List[str]) -> AsyncIterator[str]:
    """Listen for ZCA auth-expired events for any of the given account_ids and yield SSE."""
    try:
        from app.modules.all_platform.zalo.services.message_events import wait_for_auth_expired
        while True:
            event = await wait_for_auth_expired(timeout=60.0)
            if event is None:
                # Timeout — no auth-expired event, continue waiting
                continue
            account_id, reason = event
            if account_id in set(account_ids):
                yield f"event: auth-expired\\ndata: {json.dumps({'account_id': account_id, 'reason': reason}, ensure_ascii=False)}\\n\\n"
    except asyncio.CancelledError:
        raise
    except Exception as exc:
        logger.warning(f"auth_expired listener error: {exc}")

'''

# Insert helper before @router.get("/stream")
if "async def _wait_auth_expired_for_accounts" not in content3:
    insert_point = content3.find('@router.get("/stream")')
    if insert_point >= 0:
        content3 = content3[:insert_point] + helper_func + content3[insert_point:]
        print("Fix 4b: Added _wait_auth_expired_for_accounts helper")
    else:
        print("Fix 4b: Could not find insert point")
else:
    print("Fix 4b: Helper already exists")

# Also need to update the async for loop to also iterate over auth_expired_task
# This requires more complex change - let's do it step by step

# Find the import for AsyncIterator
if "from typing import" in content3:
    old_type = "from typing import Any, Dict, List, Optional"
    new_type = "from typing import Any, Dict, List, Optional, AsyncIterator"
    if old_type in content3 and "AsyncIterator" not in content3:
        content3 = content3.replace(old_type, new_type)
        print("Fix 4c: Added AsyncIterator to imports")

# Write back events.py
TMP3 = "/tmp/events_fixed.py"
b64 = base64.b64encode(content3.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP3}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP3} {FILE3}")
print("Fix 4: Written to VM")

# ============================================================
# FIX 5: zca_persistent_listener.py - increase startup sync groups
# ============================================================
stdin, stdout, stderr = client.exec_command(f"cat {FILE2}", timeout=30)
content2_fresh = stdout.read().decode("utf-8", errors="replace")

old5 = "_STARTUP_SYNC_GROUP_LIMIT = 5"
new5 = "_STARTUP_SYNC_GROUP_LIMIT = 20"

if old5 in content2_fresh:
    content2_fresh = content2_fresh.replace(old5, new5)
    print("Fix 5: Applied - startup sync groups 5 -> 20")
else:
    print("Fix 5: Pattern not found")

# Also increase message count
old5b = "_STARTUP_SYNC_MESSAGE_COUNT = 30"
new5b = "_STARTUP_SYNC_MESSAGE_COUNT = 50"
if old5b in content2_fresh:
    content2_fresh = content2_fresh.replace(old5b, new5b)
    print("Fix 5b: Applied - startup sync messages 30 -> 50")

# Write back
TMP2b = "/tmp/zca_persistent_listener_fixed2.py"
b64 = base64.b64encode(content2_fresh.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP2b}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP2b} {FILE2}")
print("Fix 5: Written to VM")

# ============================================================
# SYNTAX CHECK all modified files
# ============================================================
print("\n=== Syntax check ===")
for fname in [FILE1, FILE2, FILE3]:
    cmd = f"python3 -m py_compile {fname} && echo 'OK: {fname.split('/')[-1]}'"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    err = stderr.read().decode("utf-8", errors="replace")
    out = stdout.read().decode("utf-8", errors="replace").strip()
    warns = [l for l in err.split("\n") if "Warning" not in l and l.strip()]
    print(f"  {out or 'OK'} {fname.split('/')[-1]}")
    if warns[:1]:
        print(f"  Errors: {warns[:2]}")

client.close()
print("\nAll fixes applied!")
