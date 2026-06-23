import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check the actual code on VM
    stdin, stdout, stderr = client.exec_command(
        f"cat {BACKEND_DIR}/app/modules/all_platform/zalo/api/routes/accounts.py | sed 's/[^[:ascii:]]//g' | head -130 | tail -40",
        timeout=30
    )
    print("=== VM accounts.py lines 90-130 ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check git commit of the deployed file
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && git log -1 --oneline -- linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/accounts.py",
        timeout=30
    )
    print("\n=== VM accounts.py git commit ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Check if there's another place calling list_zalo_accounts with owner_id
    stdin3, stdout3, stderr3 = client.exec_command(
        f"grep -rn 'list_zalo_accounts' {BACKEND_DIR}/app/modules/all_platform/zalo/ 2>&1 | sed 's/[^[:ascii:]]//g'",
        timeout=30
    )
    print("\n=== All list_zalo_accounts calls ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

finally:
    client.close()
