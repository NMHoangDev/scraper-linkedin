import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Find fetch_messages_by_ids function
print("=== fetch_messages_by_ids in supabase_service.py ===")
stdin, stdout, stderr = client.exec_command(
    f"grep -n 'fetch_messages_by_ids\\|def fetch_messages' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Read the function
stdin, stdout, stderr = client.exec_command(
    f"sed -n '1840,1920p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py",
    timeout=15
)
content = stdout.read()
with open(r"D:\CrawlDataLinkedin\fetch_messages.txt", "wb") as f:
    f.write(content)
print(f"Read {len(content)} bytes")

client.close()
