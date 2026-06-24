import paramiko
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL = r"D:\CrawlDataLinkedin\realtime_explore"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

files_to_read = {
    "listener.py": f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/listener.py",
    "events.py": f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/events.py",
    "message_events.py": f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/message_events.py",
    "zca_persistent_listener.py": f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py",
    "zca_api_bridge.py": f"cat {CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_api_bridge.py",
}

for name, cmd in files_to_read.items():
    stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
    out = stdout.read()
    path = os.path.join(LOCAL, name)
    with open(path, "wb") as f:
        f.write(out)
    print(f"Read {name}: {len(out)} bytes")

client.close()
