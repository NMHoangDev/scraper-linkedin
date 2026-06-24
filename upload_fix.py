import paramiko
import time
import base64

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"
BACKEND_DIR = f"{REPO}/linkedin_group_crawler"

local_path = r"D:\CrawlDataLinkedin\linkedin_group_crawler\app\modules\all_platform\zalo\services\supabase_service.py"

with open(local_path, "rb") as f:
    content = f.read()
b64 = base64.b64encode(content).decode("ascii")
print(f"File: {len(content)} bytes, base64: {len(b64)} chars")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Write to /tmp (user vmadmin has write access)
    chan = client.get_transport().open_session()
    chan.exec_command("python3 -c \"import sys,base64; open('/tmp/supabase_service_fixed.py','wb').write(base64.b64decode(sys.stdin.read()))\"")
    chan.sendall(b64)
    chan.shutdown_write()
    chan.recv_exit_status()
    print("File written to /tmp")

    # Verify size
    stdin0, stdout0, stderr0 = client.exec_command("wc -c /tmp/supabase_service_fixed.py 2>&1", timeout=10)
    print("File size:", stdout0.read().decode("utf-8", errors="replace").strip())

    # Copy into container
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker cp /tmp/supabase_service_fixed.py seeding-backend:/app/app/modules/all_platform/zalo/services/supabase_service.py",
        timeout=30
    )
    ec2 = stdout2.channel.recv_exit_status()
    print("Docker cp exit:", ec2)

    # Restart
    stdin3, stdout3, stderr3 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose restart backend 2>&1",
        timeout=120
    )
    print("Restart:", stdout3.read().decode("utf-8", errors="replace").strip())

    time.sleep(20)

    stdin4, stdout4, stderr4 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose ps backend 2>&1",
        timeout=30
    )
    print("\n=== STATUS ===")
    print(stdout4.read().decode("utf-8", errors="replace"))

    stdin5, stdout5, stderr5 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=20 backend 2>&1",
        timeout=30
    )
    print("\n=== LOGS ===")
    print(stdout5.read().decode("utf-8", errors="replace"))

finally:
    client.close()
