import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Read specific lines from container
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend sed -n '100,135p' /app/app/modules/all_platform/zalo/api/routes/accounts.py 2>/dev/null",
        timeout=30
    )
    content = stdout.read().decode("utf-8", errors="replace")
    print("=== Container accounts.py lines 100-135 ===")
    print(content)

    # Also read the _resolve_accounts_for_role function
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker exec seeding-backend sed -n '42,85p' /app/app/modules/all_platform/zalo/api/routes/accounts.py 2>/dev/null",
        timeout=30
    )
    content2 = stdout2.read().decode("utf-8", errors="replace")
    print("\n=== Container _resolve_accounts_for_role lines 42-85 ===")
    print(content2)

finally:
    client.close()
