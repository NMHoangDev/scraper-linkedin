import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Get all zalo_messages files
stdin, stdout, stderr = client.exec_command(
    f"cd {CWD} && grep -rln 'zalo_messages' --include='*.py' linkedin_group_crawler/app/modules/all_platform/zalo/ | grep -v __pycache__",
    timeout=30
)
files = [f.strip() for f in stdout.read().decode("utf-8", errors="replace").strip().split("\n") if f.strip()]
for f in files:
    print(f)

# Check broadcast sender - it may query messages too
print("\n=== zca_broadcast_sender.py ===")
stdin, stdout, stderr = client.exec_command(
    f"grep -n 'zalo_messages\\|message_id\\|uuid\\|fetch_messages' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_broadcast_sender.py",
    timeout=15
)
stdout_bytes = stdout.read()
with open(r"D:\CrawlDataLinkedin\zca_broadcast.txt", "wb") as wf:
    wf.write(stdout_bytes)
print(f"Read {len(stdout_bytes)} bytes")

# Check conversations.py for zalo_messages usage
print("\n=== conversations.py zalo_messages usage ===")
stdin, stdout, stderr = client.exec_command(
    f"grep -n 'zalo_messages\\|message_id\\|uuid\\|fetch_messages' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/conversations.py",
    timeout=15
)
stdout_bytes = stdout.read()
with open(r"D:\CrawlDataLinkedin\conversations.txt", "wb") as wf:
    wf.write(stdout_bytes)
print(f"Read {len(stdout_bytes)} bytes")

# Also check _rest calls directly on zalo_messages
print("\n=== Direct _rest calls with zalo_messages ===")
stdin, stdout, stderr = client.exec_command(
    f"grep -n '_rest.*zalo_messages\\|zalo_messages.*_rest' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py",
    timeout=15
)
stdout_bytes = stdout.read()
with open(r"D:\CrawlDataLinkedin\rest_calls.txt", "wb") as wf:
    wf.write(stdout_bytes)
print(f"Read {len(stdout_bytes)} bytes")

client.close()
