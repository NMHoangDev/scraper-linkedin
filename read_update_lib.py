import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read lines 1910-1950 (around the two id= params)
cmd = f"sed -n '1910,1950p' {FILE}"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\update_lib_msg.txt", "wb") as f:
    f.write(out)
print(f"Read section 1: {len(out)} bytes")

# Read function definitions around these lines
cmd2 = f"grep -n 'def \\|async def ' {FILE} | awk -F: '$1 >= 1890 && $1 <= 1970'"
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
out2 = stdout.read()
with open(r"D:\CrawlDataLinkedin\funcs_near_1910.txt", "wb") as f:
    f.write(out2)
print(f"Read funcs near 1910: {len(out2)} bytes")

client.close()
