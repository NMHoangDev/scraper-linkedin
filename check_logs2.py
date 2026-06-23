import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Count ZCA node processes
print("=== Node ZCA processes ===")
cmd = "docker exec seeding-backend ps aux | grep 'zca_persistent_listener' | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Total ZCA node processes: {count}")

# Show all
print("\n=== All ZCA processes ===")
cmd = "docker exec seeding-backend ps aux | grep 'zca_persistent_listener' | grep -v grep"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

# Check backend logs for listener restarts (grep for process start/exit)
print("\n=== Listener restart pattern ===")
cmd = "docker logs --tail 2000 seeding-backend 2>&1 | grep -E 'Starting ZCA listener|ZCA listener stdout closed|ZCA listener crashed|restarting|restart_attempt|listener_exited|_run_once|_run_supervised' | grep -v 'HTTP Request' | tail -40"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\listener_restarts.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Check the zca persistent listener stdout pattern
print("\n=== ZCA stdout events (last 50 lines) ===")
cmd = "docker logs --tail 5000 seeding-backend 2>&1 | grep 'ZCA listener stdout' | grep -v 'HTTP Request' | tail -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_stdout.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Check what the ZCA node stdout says
print("\n=== ZCA node event patterns ===")
cmd = 'docker logs --tail 5000 seeding-backend 2>&1 | grep "event\":" | grep -v "HTTP Request" | tail -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_events.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Check the crawl_24h_job - is it blocking the event loop?
print("\n=== Crawl 24h job activity ===")
cmd = "docker logs --tail 2000 seeding-backend 2>&1 | grep -i 'crawl.*24\\|crawl_24\\|scheduler\\|job\\|cron\\|periodic' | grep -v 'HTTP Request' | tail -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\crawl24h.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Check if the ZCA script has "old_messages_requested" which causes restart loops
print("\n=== Old messages requested events ===")
cmd = 'docker logs --tail 5000 seeding-backend 2>&1 | grep "old_messages_requested\\|old_messages\\|event\":\"message\\|event\":\"connected\\|event\":\"disconnect" | grep -v "HTTP Request" | tail -20'
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\old_messages.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

client.close()
print("Done!")
