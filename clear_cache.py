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

    # Clear Python bytecode cache
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend find /app -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null; echo done",
        timeout=30
    )
    print("Cache cleared:", stdout.read().decode("utf-8", errors="replace").strip())

    # Restart
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose restart backend 2>&1",
        timeout=120
    )
    print("Restart:", stdout2.read().decode("utf-8", errors="replace").strip())

    time.sleep(20)

    # Check logs
    stdin3, stdout3, stderr3 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=20 backend 2>&1",
        timeout=30
    )
    logs = stdout3.read().decode("utf-8", errors="replace")
    print("\n=== RECENT LOGS ===")
    print(logs)

    # Check for the warning
    if "22P02" in logs:
        print("\n!!! WARNING STILL PRESENT - investigating further !!!")
    elif "Application startup complete" in logs:
        print("\n!!! BACKEND STARTED SUCCESSFULLY !!!")
    else:
        print("\n!!! STATUS UNCLEAR !!!")

finally:
    client.close()
