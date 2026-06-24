import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# grep for startup sync
cmd = f"grep -n 'startup_sync\\|STARTUP_SYNC\\|_STARTUP\\|_run\\|sync_cm_messages' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py | head -30"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\startup_sync_grep.txt", "wb") as f:
    f.write(out)
print("grep saved")

# _run method lines 340-500
cmd = f"sed -n '340,500p' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\_run_method.txt", "wb") as f:
    f.write(out)
print("_run method saved")

# STARTUP constants
cmd = f"grep -n 'STARTUP_SYNC' {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py | head -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(f"{LOCAL}\\startup_const.txt", "wb") as f:
    f.write(out)
print("consts saved")

client.close()
