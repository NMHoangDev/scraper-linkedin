import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check the actual code in the built image
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend grep -A5 'async def list_zalo_accounts' /app/app/modules/all_platform/zalo/services/supabase_service.py 2>/dev/null | head -20",
        timeout=30
    )
    content = stdout.read().decode("utf-8", errors="replace")
    print("=== Image list_zalo_accounts ===")
    print(content)

    # Also check git HEAD on VM
    stdin2, stdout2, stderr2 = client.exec_command(
        "cd /opt/apps/seeding_markeeai/scraper-linkedin && git log -1 --oneline 2>&1",
        timeout=30
    )
    print("\n=== VM git HEAD ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Check if there's a .pyc cache issue
    stdin3, stdout3, stderr3 = client.exec_command(
        "docker exec seeding-backend find /app -name '*.pyc' -path '*supabase_service*' 2>/dev/null | head -5",
        timeout=30
    )
    print("\n=== .pyc cache files ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

finally:
    client.close()
