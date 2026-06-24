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

    # Save logs to file on remote, then download
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && docker compose logs --tail=30 backend 2>&1 | sed 's/[^[:ascii:]]//g' > /tmp/backend_logs.txt",
        timeout=30
    )
    stdout.channel.recv_exit_status()

    # Download
    sftp.get("/tmp/backend_logs.txt", r"D:\CrawlDataLinkedin\backend_logs.txt")

    # Read and display
    with open(r"D:\CrawlDataLinkedin\backend_logs.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    print("=== BACKEND LOGS ===")
    print(content)

    # Also check for key markers
    if "22P02" in content:
        print("\n!!! WARNING STILL PRESENT !!!")
    elif "Application startup complete" in content:
        print("\n!!! BACKEND OK - NO WARNINGS !!!")
    else:
        print("\n!!! STATUS UNCLEAR !!!")

    # Check frontend logs
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && docker compose logs --tail=10 frontend 2>&1 | sed 's/[^[:ascii:]]//g' > /tmp/frontend_logs.txt",
        timeout=30
    )
    stdout2.channel.recv_exit_status()
    sftp.get("/tmp/frontend_logs.txt", r"D:\CrawlDataLinkedin\frontend_logs.txt")

    with open(r"D:\CrawlDataLinkedin\frontend_logs.txt", "r", encoding="utf-8", errors="replace") as f2:
        content2 = f2.read()
    print("\n=== FRONTEND LOGS ===")
    print(content2)

finally:
    if sftp:
        sftp.close()
    client.close()
