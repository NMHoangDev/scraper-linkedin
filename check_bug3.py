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

    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && docker compose logs --tail=50 backend 2>&1 > /tmp/b_logs2.txt",
        timeout=30
    )
    stdout.channel.recv_exit_status()
    try:
        sftp.get("/tmp/b_logs2.txt", r"D:\CrawlDataLinkedin\b_logs2.txt")
    except:
        pass

    with open(r"D:\CrawlDataLinkedin\b_logs2.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    lines = content.split('\n')
    for line in lines:
        if any(k in line for k in ['22P02', 'WARNING', 'accounts', 'accounts?', 'id_member', 'owner_id']):
            print(line[:250])

finally:
    if sftp:
        sftp.close()
    client.close()
