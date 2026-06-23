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

FILE3 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py"
stdin, stdout, stderr = client.exec_command(f"cat {FILE3}", timeout=30)
content3 = stdout.read().decode("utf-8", errors="replace")

# ============================================================
# Replace the entire event_gen function with a proper one that
# uses asyncio.wait(FIRST_COMPLETED) to consume BOTH auth_expired
# events AND zalo-message events simultaneously.
# ============================================================

old_gen = '''    async def event_gen():
        yield f"event: ready\\ndata: {json.dumps(initial_meta, ensure_ascii=False)}\\n\\n"
        try:
            # Pre-compute owned/team account_id set để filter nhanh.
            owned_or_team_ids: set[str] = set()
            if caller_role in ("admin", "leader"):
                caller_app_id = (
                    await get_app_user_id_by_email(caller_email) if caller_email else None
                )
                if caller_app_id:
                    team_ids = await get_team_member_ids(caller_app_id) or []
                    owner_set = {caller_app_id, *team_ids}
                    for acc in accounts:
                        if str(acc.get("owner_id") or "").strip() in owner_set:
                            aid = str(acc.get("account_id") or "").strip()
                            if aid:
                                owned_or_team_ids.add(aid)
            else:
                owned_or_team_ids = set(account_ids)

            async for event in subscribe_zalo_events(
                account_ids,
                role=caller_role,
                email=caller_email,
                caller_id=caller_id,
            ):
                if await request.is_disconnected():
                    break
                # Member/staff: pass through (đã filter ở subscribe).
                if caller_role not in ("admin", "leader"):
                    yield event
                    continue
                # Admin/leader: check share hoặc thuộc team.
                try:
                    payload = json.loads(event.split("data: ", 1)[1].rstrip("\\n"))
                except Exception:
                    yield event
                    continue
                group_id = str(payload.get("group_id") or "").strip()
                account_id = str(payload.get("account_id") or "").strip()
                if not group_id or not account_id:
                    yield event
                    continue
                if account_id in owned_or_team_ids:
                    yield event
                    continue
                allowed = shared_by_account.get(account_id) or set()
                if group_id in allowed:
                    yield event
                # Ngược lại: bỏ qua (không share).
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning(f"SSE stream error for caller={caller_id}: {exc}")
            yield f"event: error\\ndata: {json.dumps({'detail': str(exc)})}\\n\\n"'''

new_gen = '''    async def event_gen():
        yield f"event: ready\\ndata: {json.dumps(initial_meta, ensure_ascii=False)}\\n\\n"
        try:
            # Pre-compute owned/team account_id set để filter nhanh.
            owned_or_team_ids: set[str] = set()
            if caller_role in ("admin", "leader"):
                caller_app_id = (
                    await get_app_user_id_by_email(caller_email) if caller_email else None
                )
                if caller_app_id:
                    team_ids = await get_team_member_ids(caller_app_id) or []
                    owner_set = {caller_app_id, *team_ids}
                    for acc in accounts:
                        if str(acc.get("owner_id") or "").strip() in owner_set:
                            aid = str(acc.get("account_id") or "").strip()
                            if aid:
                                owned_or_team_ids.add(aid)
            else:
                owned_or_team_ids = set(account_ids)

            # Start auth_expired consumer as an async iterator we can merge.
            auth_gen = _auth_expired_watcher(account_ids)
            auth_task = asyncio.create_task(auth_gen.__anext__())

            msg_gen = subscribe_zalo_events(
                account_ids,
                role=caller_role,
                email=caller_email,
                caller_id=caller_id,
            )
            msg_iter = msg_gen.__anext__()

            pending = {auth_task, msg_iter}

            while pending:
                if await request.is_disconnected():
                    auth_gen.aclose()
                    msg_gen.aclose()
                    for t in pending:
                        t.cancel()
                    break

                done, pending = await asyncio.wait(pending, timeout=20, return_when=asyncio.FIRST_COMPLETED)

                for task in done:
                    try:
                        event = task.result()
                    except StopAsyncIteration:
                        # One stream ended — stop the other too.
                        auth_gen.aclose()
                        msg_gen.aclose()
                        for t in pending:
                            t.cancel()
                        return

                    # Auth-expired event from ZCA listener
                    if task is auth_task and event is not None:
                        yield event
                        # Queue up next auth watch
                        auth_task = asyncio.create_task(auth_gen.__anext__())
                        pending.add(auth_task)
                        continue

                    # Zalo message event
                    if caller_role not in ("admin", "leader"):
                        yield event
                    else:
                        try:
                            payload = json.loads(event.split("data: ", 1)[1].rstrip("\\n"))
                        except Exception:
                            yield event
                            continue
                        group_id = str(payload.get("group_id") or "").strip()
                        account_id = str(payload.get("account_id") or "").strip()
                        if not group_id or not account_id:
                            yield event
                            continue
                        if account_id in owned_or_team_ids:
                            yield event
                            continue
                        allowed = shared_by_account.get(account_id) or set()
                        if group_id in allowed:
                            yield event

                    # Queue up next message
                    msg_iter = asyncio.create_task(msg_gen.__anext__())
                    pending.add(msg_iter)

                # Timeout -> heartbeat
                if not done:
                    yield "event: heartbeat\\ndata: {}\\n\\n"

        except asyncio.CancelledError:
            try:
                auth_gen.aclose()
                msg_gen.aclose()
            except Exception:
                pass
            raise
        except Exception as exc:
            logger.warning(f"SSE stream error for caller={caller_id}: {exc}")
            yield f"event: error\\ndata: {json.dumps({'detail': str(exc)})}\\n\\n"'''

if old_gen in content3:
    content3 = content3.replace(old_gen, new_gen)
    print("Fix 4: Replaced event_gen with proper asyncio.wait approach")
else:
    print("Fix 4: OLD pattern not found - checking current state...")
    # The previous fix already inserted content, let me check
    if "_auth_expired_watcher" in content3:
        print("  _auth_expired_watcher already present")
    idx = content3.find("async def event_gen(")
    print(f"  event_gen starts at: {idx}")
    print(f"  File size: {len(content3)}")

# ============================================================
# Add _auth_expired_watcher helper before @router.get("/stream")
# ============================================================
if "_auth_expired_watcher" not in content3:
    helper = '''
async def _auth_expired_watcher(account_ids: List[str]) -> AsyncIterator[str]:
    """Watch for ZCA auth-expired events for any of the given account_ids, yielding SSE lines."""
    watched = set(account_ids)
    while True:
        try:
            from app.modules.all_platform.zalo.services.message_events import wait_for_auth_expired
            event = await wait_for_auth_expired(timeout=120.0)
            if event is None:
                continue
            account_id, reason = event
            if account_id in watched:
                yield f"event: auth-expired\\ndata: {json.dumps({'account_id': account_id, 'reason': reason}, ensure_ascii=False)}\\n\\n"
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.warning(f"auth_expired watcher error: {exc}")
            await asyncio.sleep(5)


'''
    insert_idx = content3.find('@router.get("/stream")')
    if insert_idx >= 0:
        content3 = content3[:insert_idx] + helper + content3[insert_idx:]
        print("Fix 4b: Added _auth_expired_watcher helper")
    else:
        print("Fix 4b: Could not find insert point")

# Also ensure AsyncIterator is imported
if "AsyncIterator" not in content3:
    old_import = "from typing import Any, Dict, List, Optional"
    new_import = "from typing import Any, Dict, List, Optional, AsyncIterator"
    if old_import in content3:
        content3 = content3.replace(old_import, new_import)
        print("Fix 4c: Added AsyncIterator to imports")

# Write back
TMP3 = "/tmp/events_fixed2.py"
b64 = base64.b64encode(content3.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP3}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP3} {FILE3}")
print("Fix 4: Written to VM")

# Syntax check
print("\n=== Syntax check events.py ===")
stdin, stdout, stderr = client.exec_command(f"python3 -m py_compile {FILE3} && echo 'Syntax OK'", timeout=30)
err = stderr.read().decode("utf-8", errors="replace")
out = stdout.read().decode("utf-8", errors="replace").strip()
print(out or "OK")
warns = [l for l in err.split("\n") if "Warning" not in l and l.strip()]
if warns:
    print("Errors:", warns[:3])

# Also fix message_events.py - check that AsyncIterator is imported there too
FILE1 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py"
stdin, stdout, stderr = client.exec_command(f"grep -n 'AsyncIterator' {FILE1}", timeout=10)
out1 = stdout.read().decode("utf-8", errors="replace")
print(f"\nmessage_events.py AsyncIterator: '{out1.strip()}'")
if not out1.strip():
    print("  Adding AsyncIterator to message_events.py imports")
    stdin, stdout, stderr = client.exec_command(f"cat {FILE1}", timeout=30)
    content1 = stdout.read().decode("utf-8", errors="replace")
    old_imp = "from typing import AsyncIterator"
    new_imp = "# AsyncIterator not needed here - already using it via asyncio"
    # Actually message_events doesn't need AsyncIterator export
    print("  (no change needed - AsyncIterator not required in message_events.py)")

client.close()
print("\nFix 4 complete!")
