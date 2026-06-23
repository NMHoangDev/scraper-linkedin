import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read the ZCA persistent listener script
print("=== zca_persistent_listener.js ===")
cmd = f"wc -l {CWD}/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
print(stdout.read().decode().strip())

cmd = f"cat {CWD}/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_persistent_listener.js", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
