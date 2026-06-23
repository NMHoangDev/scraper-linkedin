import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Get full accounts.py from container
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend cat /app/app/modules/all_platform/zalo/api/routes/accounts.py 2>/dev/null",
        timeout=30
    )
    content = stdout.read().decode("utf-8", errors="replace")
    print(f"Container accounts.py ({len(content)} bytes):")
    # Find _resolve_accounts_for_role and list_accounts
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if 'resolve_accounts' in line or 'list_zalo_accounts' in line:
            start = max(0, i-2)
            end = min(len(lines), i+3)
            print(f"\n--- Line {i+1} ---")
            for j in range(start, end):
                print(f"{j+1}: {lines[j]}")
    
    # Check what the request looks like - check docker logs for the raw request
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --since '2026-06-19 14:55' --tail=100 backend 2>&1 | grep 'accounts?'",
        timeout=30
    )
    print("\n=== Account API requests ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

finally:
    client.close()
