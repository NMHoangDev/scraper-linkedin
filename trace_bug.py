import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Grep all list_zalo_accounts calls in container
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend grep -rn 'list_zalo_accounts\\|list_zalo_users' /app/app/ 2>&1 | sed 's/[^[:ascii:]]//g'",
        timeout=30
    )
    print("=== All list_zalo_accounts calls ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check events.py resolve_accounts_for_caller
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker exec seeding-backend grep -n 'resolve_accounts_for_caller\\|list_zalo_accounts' /app/app/modules/all_platform/zalo/api/routes/events.py 2>&1 | sed 's/[^[:ascii:]]//g'",
        timeout=30
    )
    print("\n=== events.py calls ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

finally:
    client.close()
