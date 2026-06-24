import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read _run_once in the VM file (not container - they're same)
print("=== zca_persistent_listener.py _run_once (lines 750-810) ===")
cmd = f"sed -n '750,810p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\zca_run_once.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Also read the stderr reader and proc stdout reading
print("\n=== _read_stderr function ===")
cmd = f"sed -n '789,800p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\zca_read_stderr.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Read the full _run_once function to see how stdout is read
print("\n=== _run_once full (lines 700-800) ===")
cmd = f"sed -n '700,800p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\zca_run_once_full.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
