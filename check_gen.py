import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

FILE3 = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py"

# Read the event_gen area
stdin, stdout, stderr = client.exec_command(f"sed -n '188,280p' {FILE3}", timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\event_gen_now.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check if asyncio.wait is in the file now
stdin, stdout, stderr = client.exec_command(f"grep -n 'asyncio.wait\\|_auth_expired_watcher\\|FIRST_COMPLETED\\|auth_task\\|msg_iter\\|aclose' {FILE3}", timeout=15)
out2 = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\asyncio_integration.txt", "wb") as f:
    f.write(out2)
print(f"Read asyncio integration: {len(out2)} bytes")

# Check _wait_auth_expired_for_accounts
stdin, stdout, stderr = client.exec_command(f"grep -n '_wait_auth_expired\\|_auth_expired_watcher' {FILE3}", timeout=15)
out3 = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\helpers.txt", "wb") as f:
    f.write(out3)
print(f"Read helpers: {len(out3)} bytes")

client.close()
