import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read lines 1845-1870
stdin, stdout, stderr = client.exec_command(f"sed -n '1845,1870p' {FILE}", timeout=15)
content = stdout.read()
with open(r"D:\CrawlDataLinkedin\uuid_section.txt", "wb") as f:
    f.write(content)
print(f"Read {len(content)} bytes")

client.close()
