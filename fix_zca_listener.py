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

# Read current zca_persistent_listener.py
print("=== Read current zca_persistent_listener.py ===")
cmd = f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
content = stdout.read().decode("utf-8", errors="replace")
print(f"File size: {len(content)} bytes")

# ============================================================
# FIX 1: In _run_once - drain any remaining stdout on crash
# This prevents buffered data from corrupting the next run
# ============================================================

# The key fix: when the Node process dies, drain its stdout buffer
# before the next restart. This prevents "Separator is found" cascading crashes.
old_run_once_end = '''            await proc.wait()
        finally:
            stderr_task.cancel()
            try:
                await stderr_task
            except asyncio.CancelledError:
                pass
            state.connected = False
            state.pid = None
            state.proc = None'''

new_run_once_end = '''            # Drain any remaining buffered stdout so stale data doesn't
            # corrupt the next listener start.
            try:
                import errno
                while True:
                    try:
                        chunk = await asyncio.wait_for(proc.stdout.read(n=8192), timeout=0.5)
                        if not chunk:
                            break
                    except asyncio.TimeoutError:
                        break
                    except OSError as e:
                        if e.errno in (errno.EPIPE, errno.ENOTCONN, errno.EBADF):
                            break
                        raise
            except Exception:
                pass
            await proc.wait()
        finally:
            stderr_task.cancel()
            try:
                await stderr_task
            except asyncio.CancelledError:
                pass
            except Exception:
                pass
            state.connected = False
            state.pid = None
            state.proc = None'''

if old_run_once_end in content:
    content = content.replace(old_run_once_end, new_run_once_end)
    print("Fix 1: Added stdout drain on crash")
else:
    print("Fix 1: Pattern not found - checking...")
    # Try to find the section
    idx = content.find("await proc.wait()")
    print(f"  proc.wait() at: {idx}")

# ============================================================
# FIX 2: Increase backoff for rapid crashes
# ============================================================
old_backoffs = "_RESTART_BACKOFFS = [3, 8, 20, 45, 90]"
new_backoffs = "_RESTART_BACKOFFS = [5, 15, 45, 120, 300]"
if old_backoffs in content:
    content = content.replace(old_backoffs, new_backoffs)
    print("Fix 2: Increased restart backoffs")
else:
    print("Fix 2: Pattern not found")

# ============================================================
# FIX 3: Add max_consecutive_crashes limit
# ============================================================
# Find _run_supervised function and add crash counter
old_run_supervised = """            state.restart_attempt += 1
            delay = _RESTART_BACKOFFS[min(state.restart_attempt - 1, len(_RESTART_BACKOFFS) - 1)]
            logger.warning(f"Restarting ZCA listener for user={state.user_id} in {delay}s")"""

new_run_supervised = """            state.restart_attempt += 1
            
            # Safety: if crashed more than 10 times in a row, stop entirely.
            # This prevents resource leaks from cascading crashes (e.g. ZCA buffer overflow).
            if state.restart_attempt > 10:
                logger.error(
                    f"ZCA listener for user={state.user_id} crashed {state.restart_attempt} times "
                    f"in a row (last error: {state.last_error}) — STOPPING. "
                    f"Manual restart via /api/zalo/listener/restart required."
                )
                state.desired = False
                return
            
            delay = _RESTART_BACKOFFS[min(state.restart_attempt - 1, len(_RESTART_BACKOFFS) - 1)]
            logger.warning(
                f"Restarting ZCA listener for user={state.user_id} in {delay}s "
                f"(attempt {state.restart_attempt})"
            )"""

if old_run_supervised in content:
    content = content.replace(old_run_supervised, new_run_supervised)
    print("Fix 3: Added max crash limit")
else:
    print("Fix 3: Pattern not found")

# ============================================================
# FIX 4: Reset crash counter on successful long run
# After 60s of being connected, reset restart_attempt
# Add to _handle_event when "connected" fires
# ============================================================
old_connected = '''        if event_name == "connected":
            state.connected = True
            state.restart_attempt = 0
            state.last_error = None'''

new_connected = '''        if event_name == "connected":
            state.connected = True
            # Only reset crash counter if we've been running stably for 60s
            # This prevents premature reset from crashing immediately after startup
            if state.last_event_at:
                try:
                    last_ts = datetime.fromisoformat(state.last_event_at.replace("Z", "+00:00"))
                    age_s = (datetime.now(timezone.utc) - last_ts).total_seconds()
                    if age_s > 60:
                        state.restart_attempt = 0
                except Exception:
                    # Fallback: reset on first successful connect after any startup
                    if state.restart_attempt > 0:
                        state.restart_attempt = 0
            state.last_error = None'''

if old_connected in content:
    content = content.replace(old_connected, new_connected)
    print("Fix 4: Added smart crash counter reset")
else:
    print("Fix 4: Pattern not found, checking for simpler pattern...")
    # Try simpler
    simple_old = "state.restart_attempt = 0\n            state.last_error = None"
    simple_idx = content.find("state.restart_attempt = 0\n            state.last_error = None")
    if simple_idx >= 0:
        print(f"  Found at index {simple_idx}")
    else:
        # Check for event_name == "connected"
        idx = content.find('if event_name == "connected":')
        print(f"  event_name == connected at: {idx}")

# Write to VM
TMP = "/tmp/zca_persistent_listener_fixed.py"
b64 = base64.b64encode(content.encode("utf-8")).decode()
client.exec_command(f'python3 -c "import base64; open(\'{TMP}\', \'wb\').write(base64.b64decode(\'{b64}\'))"')
client.exec_command(f"cp {TMP} {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py")
print("Written to VM")

# Syntax check
print("\n=== Syntax check ===")
cmd = f"python3 -m py_compile {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py && echo 'Syntax OK'"
stdin2, stdout2, stderr2 = client.exec_command(cmd, timeout=30)
err = stderr2.read().decode("utf-8", errors="replace")
out = stdout2.read().decode("utf-8", errors="replace").strip()
warns = [l for l in err.split("\n") if "Warning" not in l and l.strip()]
print(out or "OK")
if warns:
    print("Errors:", warns[:3])

client.close()
print("\nDone!")
