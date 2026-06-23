import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check status
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose ps backend 2>&1",
        timeout=30
    )
    status = stdout.read().decode("utf-8", errors="replace")
    print("STATUS:", status)

    # Check logs
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=20 backend 2>&1",
        timeout=30
    )
    logs = stdout2.read().decode("utf-8", errors="replace")
    print("LOGS:", logs)

    # Check for errors
    if "Traceback" in logs:
        print("\n!!! BACKEND HAS ERRORS !!!")
    elif "Application startup complete" in logs:
        print("\n!!! BACKEND STARTED SUCCESSFULLY !!!")
    else:
        print("\n!!! STATUS UNCLEAR !!!")

finally:
    client.close()
