import paramiko
import time
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"
BACKEND_DIR = f"{REPO}/linkedin_group_crawler"

# Get the correct supabase_service.py from the local repo
local_path = r"D:\CrawlDataLinkedin\linkedin_group_crawler\app\modules\all_platform\zalo\services\supabase_service.py"

with open(local_path, "rb") as f:
    content = f.read()
b64 = base64.b64encode(content).decode("ascii")
print(f"File: {len(content)} bytes, base64: {len(b64)} chars")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # First check if there's a pre-existing container with the file
    stdin0, stdout0, stderr0 = client.exec_command(
        "docker exec seeding-backend wc -c /app/app/modules/all_platform/zalo/services/supabase_service.py 2>&1",
        timeout=30
    )
    print("Container file size:", stdout0.read().decode("utf-8", errors="replace").strip())

    # The current container has the broken (0 byte) file. We need to restore from git.
    # Use git show on VM to get the original file
    stdin1, stdout1, stderr1 = client.exec_command(
        f"cd {REPO} && git show HEAD:linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py | wc -c",
        timeout=30
    )
    print("Git show file size:", stdout1.read().decode("utf-8", errors="replace").strip())

    # Extract the file from git and copy to container
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && git show HEAD:linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py > /tmp/supabase_service_orig.py 2>&1",
        timeout=30
    )
    print("Git show exit:", stdout2.channel.recv_exit_status())

    # Check size
    stdin3, stdout3, stderr3 = client.exec_command("wc -c /tmp/supabase_service_orig.py 2>&1", timeout=10)
    print("Extracted file size:", stdout3.read().decode("utf-8", errors="replace").strip())

    # Copy to container
    stdin4, stdout4, stderr4 = client.exec_command(
        "docker cp /tmp/supabase_service_orig.py seeding-backend:/app/app/modules/all_platform/zalo/services/supabase_service.py 2>&1",
        timeout=30
    )
    print("Docker cp exit:", stdout4.channel.recv_exit_status())

    # Restart
    stdin5, stdout5, stderr5 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose restart backend 2>&1",
        timeout=120
    )
    print("Restart:", stdout5.read().decode("utf-8", errors="replace").strip())

    time.sleep(20)

    stdin6, stdout6, stderr6 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose ps backend 2>&1",
        timeout=30
    )
    print("\n=== STATUS ===")
    print(stdout6.read().decode("utf-8", errors="replace"))

    stdin7, stdout7, stderr7 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=20 backend 2>&1",
        timeout=30
    )
    print("\n=== LOGS ===")
    print(stdout7.read().decode("utf-8", errors="replace"))

finally:
    client.close()
