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

    # Save logs to file without sed - just bytes
    stdin, stdout, stderr = client.exec_command(
        "docker logs seeding-backend --tail 50 > /tmp/docker_logs_raw.txt 2>&1",
        timeout=30
    )
    stdout.channel.recv_exit_status()

    try:
        sftp.get("/tmp/docker_logs_raw.txt", r"D:\CrawlDataLinkedin\docker_raw.txt")
    except FileNotFoundError:
        print("Docker logs not found")

    # Try reading with errors=replace
    try:
        with open(r"D:\CrawlDataLinkedin\docker_raw.txt", "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        print("=== DOCKER RAW LOGS ===")
        print(content[:3000])
    except Exception as e:
        print(f"Read error: {e}")
        # Try binary
        with open(r"D:\CrawlDataLinkedin\docker_raw.txt", "rb") as f:
            data = f.read()
        print(f"File size: {len(data)}")
        print(data[:500])

finally:
    if sftp:
        sftp.close()
    client.close()
