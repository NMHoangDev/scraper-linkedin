import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read current Dockerfile
stdin, stdout, stderr = client.exec_command(f"cat {CWD}/linkedin_group_crawler/Dockerfile", timeout=15)
content = stdout.read()

with open(r"D:\CrawlDataLinkedin\dockerfile_vm.txt", "wb") as f:
    f.write(content)

print(f"Read {len(content)} bytes")

client.close()
