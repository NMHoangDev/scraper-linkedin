import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd, timeout=15):
    try:
        chan = client.exec_command(cmd, timeout=timeout)
        return chan[1].read().decode("utf-8", errors="replace").strip()
    except Exception as e:
        return f"ERROR: {e}"

# 1. Listener status
print("=== Listener status NOW ===")
r = run("curl -s -H 'X-User-ID: zl_2c470749' -H 'X-API-Key: secret_api_key' 'http://localhost:8080/api/all-platform/zalo/listener/status'")
print(r)

# 2. Check sync/backfill/crawl logs - look for "sync" or "backfill" or "crawl" stopped
print("\n=== Sync / backfill / crawl logs (last 30min) ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -iE 'sync|backfill|crawl|cancel|abort|disconnect|stop' | head -30")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 3. Check rate limiter status
print("\n=== Rate limiter (429 errors?) ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -iE '429|rate.?limit|cooldown' | head -20")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 4. Check errors
print("\n=== Errors (last 30min) ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -iE 'error|exception|crashed|fatal|traceback' | head -20")
print(r.encode('ascii', errors='replace').decode('ascii')[:3000])

# 5. Recent connections
print("\n=== Recent SSE connections ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -E 'GET /api/all-platform/zalo/events/stream' | head -10")
print(r.encode('ascii', errors='replace').decode('ascii')[:1500])

# 6. Save listener messages count
print("\n=== Save listener messages ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -E 'Saved Zalo listener messages' | head -10")
print(r.encode('ascii', errors='replace').decode('ascii')[:2000])

# 7. Check restart_attempt - did it crash and restart
print("\n=== Listener crash/restart events ===")
r = run("docker logs seeding-backend --since 30m 2>&1 | grep -iE 'crashed|restart_attempt|attempt [0-9]|listener_exited|Restarting ZCA' | head -10")
print(r.encode('ascii', errors='replace').decode('ascii')[:1500])

# 8. Node process check
print("\n=== Node process still alive? ===")
r = run("docker exec seeding-backend sh -c 'ps aux 2>&1 | grep -E \"node.*zca\" | grep -v grep'")
print(r or "No node process - LISTENER DEAD")

client.close()