import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read zca_persistent_listener.py around startup sync
print("=== startup sync in zca_persistent_listener.py ===")
cmd = f"grep -n 'startup_sync\\|STARTUP_SYNC\\|_run\\|sync_cm_messages\\|_STARTUP' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\startup_sync_code.txt", "wb") as f:
    f.write(out)
print(out.decode("utf-8", errors="replace"))

# Read the _run method that does startup sync
print("\n=== _run method lines 340-500 ===")
cmd = f"sed -n '340,500p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\_run_method.txt", "wb") as f:
    f.write(out)
print(f"Saved {len(out)} bytes")

# Read lines around _STARTUP_SYNC constants
print("\n=== STARTUP_SYNC constants ===")
cmd = f"grep -n 'STARTUP_SYNC\\|_STARTUP' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py | head -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\startup_const.txt", "wb") as f:
    f.write(out)
print(out.decode("utf-8", errors="replace"))

client.close()
