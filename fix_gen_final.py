import paramiko
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

FILE3 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py"
stdin, stdout, stderr = client.exec_command(f"cat {FILE3}", timeout=30)
content3 = stdout.read().decode("utf-8", errors="replace")

# Find and replace the entire event_gen function
# The current one has _wait_auth_expired_for_accounts but never consumes it
# We need to replace it with the proper asyncio.wait approach

# First, find the exact boundaries of the event_gen function
gen_start_marker = '    async def event_gen():'
gen_start_idx = content3.find(gen_start_marker)
if gen_start_idx < 0:
    print("ERROR: event_gen not found!")
    client.close()
    exit(1)

# Find the end of event_gen - it ends at "    response = StreamingResponse"
resp_idx = content3.find("    response = StreamingResponse", gen_start_idx)
if resp_idx < 0:
    print("ERROR: StreamingResponse not found!")
    client.close()
    exit(1)

print(f"event_gen: {gen_start_idx}-{resp_idx}")

new_event_gen = '''    async def event_gen():
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

            # Merge auth_expired events and zalo-message events via asyncio.wait
            auth_gen = _auth_expired_watcher(account_ids)
            auth_task = asyncio.create_task(auth_gen.__anext__())

            msg_gen = subscribe_zalo_events(
                account_ids,
                role=caller_role,
                email=caller_email,
                caller_id=caller_id,
            )
            msg_iter = asyncio.create_task(msg_gen.__anext__())

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
                        # One stream ended — close the other and stop
                        try:
                            auth_gen.aclose()
                        except Exception:
                            pass
                        try:
                            msg_gen.aclose()
                        except Exception:
                            pass
                        for t in pending:
                            t.cancel()
                        return

                    # Auth-expired event from ZCA listener
                    if task is auth_task and event is not None:
                        yield event
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
            yield f"event: error\\ndata: {json.dumps({'detail': str(exc)})}\\n\\n"

'''

# Replace the old event_gen with the new one
content3 = content3[:gen_start_idx] + new_event_gen + content3[resp_idx:]
print("Replaced event_gen function")

# Write back
TMP3 = "/tmp/events_fixed3.py"
b64 = base64.b64encode(content3.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP3}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP3} {FILE3}")
print("Written to VM")

# Syntax check
print("\n=== Syntax check ===")
stdin, stdout, stderr = client.exec_command(f"python3 -m py_compile {FILE3} && echo 'Syntax OK'", timeout=30)
err = stderr.read().decode("utf-8", errors="replace")
out = stdout.read().decode("utf-8", errors="replace").strip()
print(out or "OK")
warns = [l for l in err.split("\n") if "Warning" not in l and l.strip()]
if warns:
    print("Errors:", warns[:3])

# Verify key parts
stdin, stdout, stderr = client.exec_command(f"grep -n 'asyncio.wait\\|FIRST_COMPLETED\\|aclose\\|auth_gen\\|msg_gen' {FILE3} | head -15", timeout=15)
out = stdout.read()
print(f"\nKey patterns: {out.decode('utf-8', errors='replace').strip()}")

client.close()
print("\nDone!")
