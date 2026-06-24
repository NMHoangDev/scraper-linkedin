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

    # Save backend logs without sed (just download raw)
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && docker compose logs --tail=30 backend 2>&1 > /tmp/backend_logs_raw.txt",
        timeout=30
    )
    stdout.channel.recv_exit_status()
    try:
        sftp.get("/tmp/backend_logs_raw.txt", r"D:\CrawlDataLinkedin\b_logs.txt")
    except FileNotFoundError:
        print("Backend logs file not found")

    with open(r"D:\CrawlDataLinkedin\b_logs.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # Filter for relevant lines
    lines = content.split('\n')
    for line in lines:
        if any(k in line for k in ['22P02', 'Application startup', 'ERROR', 'WARNING zalo', 'accounts', 'list_zalo', 'HEALTH']):
            print(line[:200])

    if "22P02" in content:
        print("\n!!! WARNING STILL PRESENT !!!")
    elif "Application startup complete" in content:
        print("\n!!! BACKEND OK - NO WARNINGS !!!")
    else:
        print("\n!!! STATUS UNCLEAR - showing raw content !!!")
        for line in lines[-10:]:
            print(line[:200])

finally:
    if sftp:
        sftp.close()
    client.close()
