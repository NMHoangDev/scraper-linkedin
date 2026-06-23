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

    # Check container status
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && docker compose ps 2>&1",
        timeout=15
    )
    print("=== CONTAINER STATUS ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check container health
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker inspect seeding-backend --format '{{.State.Status}} {{.State.Health.Status}} {{.State.StartedAt}}' 2>&1",
        timeout=15
    )
    print("\n=== BACKEND HEALTH ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Try to get logs directly from container
    stdin3, stdout3, stderr3 = client.exec_command(
        "docker logs seeding-backend --tail 50 2>&1 | sed 's/[^[:ascii:][:space:]]//g' > /tmp/docker_logs.txt",
        timeout=30
    )
    stdout3.channel.recv_exit_status()

    try:
        sftp.get("/tmp/docker_logs.txt", r"D:\CrawlDataLinkedin\docker_logs.txt")
    except FileNotFoundError:
        print("Docker logs not found")

    try:
        with open(r"D:\CrawlDataLinkedin\docker_logs.txt", "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        print("\n=== DOCKER LOGS ===")
        lines = content.split('\n')
        for line in lines:
            if line.strip():
                print(line[:200])
        if "22P02" in content:
            print("\n!!! WARNING STILL PRESENT !!!")
        elif "Application startup complete" in content:
            print("\n!!! BACKEND OK - NO WARNINGS !!!")
    except Exception as e:
        print(f"Could not read docker logs: {e}")

finally:
    if sftp:
        sftp.close()
    client.close()
