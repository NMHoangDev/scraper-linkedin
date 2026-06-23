import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
sftp = None
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    stdin, stdout, stderr = client.exec_command(
        "docker logs seeding-backend --tail 200 2>&1 > /tmp/full2.txt",
        timeout=30
    )
    stdout.channel.recv_exit_status()
    sftp.get("/tmp/full2.txt", r"D:\CrawlDataLinkedin\full2.txt")

    with open(r"D:\CrawlDataLinkedin\full2.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Count occurrences
    p02_count = content.count('22P02')
    ok_count = content.count('200 OK')
    warning_count = content.count('WARNING')

    print(f"22P02 occurrences: {p02_count}")
    print(f"200 OK occurrences: {ok_count}")
    print(f"WARNING occurrences: {warning_count}")

    # Show lines with warnings or 22P02
    lines = content.split('\n')
    print("\n=== WARNING LINES ===")
    for line in lines:
        if '22P02' in line or ('WARNING' in line and 'zalo' in line.lower()):
            print(line[:250])

    print("\n=== RECENT ACCOUNTS ENDPOINT LOGS ===")
    for line in lines:
        if '/accounts?' in line:
            print(line[:250])

finally:
    if sftp:
        sftp.close()
    client.close()
