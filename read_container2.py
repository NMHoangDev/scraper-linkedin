import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Save to temp file then read
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend sh -c 'sed -n \"100,135p\" /app/app/modules/all_platform/zalo/api/routes/accounts.py' 2>&1",
        timeout=30
    )
    print("=== Lines 100-135 ===")
    print(stdout.read().decode("utf-8", errors="replace"))
    err = stderr.read().decode("utf-8", errors="replace")
    if err.strip(): print("STDERR:", err)

    stdin2, stdout2, stderr2 = client.exec_command(
        "docker exec seeding-backend sh -c 'sed -n \"42,85p\" /app/app/modules/all_platform/zalo/api/routes/accounts.py' 2>&1",
        timeout=30
    )
    print("\n=== Lines 42-85 ===")
    print(stdout2.read().decode("utf-8", errors="replace"))
    err2 = stderr2.read().decode("utf-8", errors="replace")
    if err2.strip(): print("STDERR:", err2)

    # Also check line 116 (where list_zalo_accounts is called)
    stdin3, stdout3, stderr3 = client.exec_command(
        "docker exec seeding-backend sh -c 'sed -n \"110,130p\" /app/app/modules/all_platform/zalo/api/routes/accounts.py' 2>&1",
        timeout=30
    )
    print("\n=== Lines 110-130 ===")
    print(stdout3.read().decode("utf-8", errors="replace"))
    err3 = stderr3.read().decode("utf-8", errors="replace")
    if err3.strip(): print("STDERR:", err3)

finally:
    client.close()
