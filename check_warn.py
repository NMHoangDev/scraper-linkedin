import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
sftp = None
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    sftp = client.open_sftp()

    # Check all calls to list_zalo_accounts in container
    stdin, stdout, stderr = client.exec_command(
        "docker exec seeding-backend grep -rn 'list_zalo_accounts' /app/app/ 2>/dev/null | sed 's/[^[:ascii:]]//g'",
        timeout=30
    )
    print("=== All list_zalo_accounts callers in container ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check the actual warning - get more context
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && docker compose logs --since '2m' backend 2>&1 > /tmp/b_latest.txt",
        timeout=30
    )
    stdout2.channel.recv_exit_status()
    try:
        sftp.get("/tmp/b_latest.txt", r"D:\CrawlDataLinkedin\b_latest.txt")
    except:
        pass

    with open(r"D:\CrawlDataLinkedin\b_latest.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    print("\n=== Recent backend logs ===")
    lines = content.split('\n')
    for line in lines:
        if line.strip():
            print(line[:250])

finally:
    if sftp:
        sftp.close()
    client.close()
