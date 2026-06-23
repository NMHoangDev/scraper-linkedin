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

    # Save full logs to file on remote
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && docker compose logs backend 2>&1 | sed 's/[^[:ascii:][:space:]]//g' > /tmp/full_logs.txt",
        timeout=30
    )
    stdout.channel.recv_exit_status()

    # Get the last 100 lines specifically
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && docker compose logs --tail=100 backend 2>&1 | sed 's/[^[:ascii:][:space:]]//g' > /tmp/tail100.txt",
        timeout=30
    )
    stdout2.channel.recv_exit_status()

    try:
        sftp.get("/tmp/tail100.txt", r"D:\CrawlDataLinkedin\tail100.txt")
    except FileNotFoundError:
        print("Tail100 not found")

    with open(r"D:\CrawlDataLinkedin\tail100.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    print("=== TAIL 100 LOGS ===")
    lines = content.split('\n')
    for line in lines:
        if line.strip():
            print(line[:200])

    if "22P02" in content:
        print("\n!!! WARNING STILL PRESENT !!!")
    elif "Application startup complete" in content:
        print("\n!!! BACKEND OK - NO WARNINGS !!!")
    else:
        print("\n!!! STATUS UNCLEAR !!!")

finally:
    if sftp:
        sftp.close()
    client.close()
