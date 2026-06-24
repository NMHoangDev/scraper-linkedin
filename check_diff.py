import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check VM filesystem
    stdin, stdout, stderr = client.exec_command(
        "cat /opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py | grep -A10 'async def list_zalo_accounts' 2>&1",
        timeout=30
    )
    print("=== VM filesystem ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check if git HEAD matches
    stdin2, stdout2, stderr2 = client.exec_command(
        "cd /opt/apps/seeding_markeeai/scraper-linkedin && git show HEAD:linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py | grep -A10 'async def list_zalo_accounts' 2>&1",
        timeout=30
    )
    print("\n=== Git HEAD ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Diff filesystem vs git HEAD
    stdin3, stdout3, stderr3 = client.exec_command(
        "cd /opt/apps/seeding_markeeai/scraper-linkedin && diff <(cat linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py) <(git show HEAD:linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py) 2>&1 | head -30",
        timeout=30
    )
    print("\n=== Diff filesystem vs git ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

finally:
    client.close()
