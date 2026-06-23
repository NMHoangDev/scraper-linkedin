import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Get the actual request URL showing the issue
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=200 backend 2>&1 | grep 'accounts?'",
        timeout=30
    )
    print("=== Account List Requests ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Also check Supabase schema for zalo_accounts to understand id_member type
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=300 backend 2>&1 | grep -E 'id_member|owner_id|uuid' | tail -30",
        timeout=30
    )
    print("\n=== id_member related ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

finally:
    client.close()
