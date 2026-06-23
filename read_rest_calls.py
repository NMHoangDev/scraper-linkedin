import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Get context around each _rest zalo_messages call - write to file
cmd = f"sed -n '837,1215p' {FILE}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\rest_section1.txt", "wb") as f:
    f.write(out)
print(f"Read section 1: {len(out)} bytes")

# Get line 1550-1580
cmd = f"sed -n '1550,1585p' {FILE}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\rest_section2.txt", "wb") as f:
    f.write(out)
print(f"Read section 2: {len(out)} bytes")

# Get line 1845-1895 (fetch_messages_by_ids)
cmd = f"sed -n '1845,1895p' {FILE}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\rest_section3.txt", "wb") as f:
    f.write(out)
print(f"Read section 3: {len(out)} bytes")

client.close()
