import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Try without sed filter
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend grep -rn 'list_zalo_accounts' /app/app/ 2>/dev/null | iconv -f utf-8 -t ascii//TRANSLIT | head -30",
        timeout=30
    )
    print("All calls:")
    print(stdout.read().decode("utf-8", errors="replace"))
    print("Exit:", stdout.channel.recv_exit_status())

    # Check the accounts.py in the container more carefully
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker exec seeding-backend grep -n 'list_zalo_accounts\\|_resolve_accounts' /app/app/modules/all_platform/zalo/api/routes/accounts.py 2>/dev/null | iconv -f utf-8 -t ascii//TRANSLIT",
        timeout=30
    )
    print("\naccounts.py:")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Also check if the warning is coming from events.py (which uses the same function)
    stdin3, stdout3, stderr3 = client.exec_command(
        "docker exec seeding-backend grep -n 'list_zalo_accounts\\|resolve_accounts' /app/app/modules/all_platform/zalo/api/routes/events.py 2>/dev/null | iconv -f utf-8 -t ascii//TRANSLIT",
        timeout=30
    )
    print("\nevents.py:")
    print(stdout3.read().decode("utf-8", errors="replace"))

finally:
    client.close()
