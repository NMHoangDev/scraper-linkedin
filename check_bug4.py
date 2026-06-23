import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Pipe through sed to remove non-ASCII characters to avoid encoding issues
    stdin, stdout, stderr = client.exec_command(
        f"grep -n 'list_zalo_accounts\\|rule_owner\\|rule_member\\|_resolve' {BACKEND_DIR}/app/modules/all_platform/zalo/api/routes/accounts.py 2>&1 | sed 's/[^[:ascii:]]//g'",
        timeout=30
    )
    print("=== VM accounts.py relevant lines ===")
    print(stdout.read().decode("utf-8", errors="replace"))
    print("Exit:", stdout.channel.recv_exit_status())

    # Check the log for actual request  
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=100 backend 2>&1 | grep 'accounts?' | sed 's/[^[:ascii:]].*//g'",
        timeout=30
    )
    print("\n=== Account list requests ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Check if the warning is in list_zalo_accounts when both owner_id and id_member are set
    stdin3, stdout3, stderr3 = client.exec_command(
        f"grep -n '22P02\\|owner_id.*eq\\|id_member.*eq\\|invalid' {BACKEND_DIR}/app/modules/all_platform/zalo/services/supabase_service.py 2>&1 | sed 's/[^[:ascii:]].*//g'",
        timeout=30
    )
    print("\n=== Supabase service relevant lines ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

finally:
    client.close()
