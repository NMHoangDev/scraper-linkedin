import paramiko
import time

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

    # Check latest events.py fix
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && git log -1 --oneline 2>&1",
        timeout=15
    )
    print("=== VM git HEAD ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check our local HEAD
    import subprocess
    result = subprocess.run(["git", "log", "-1", "--oneline"], capture_output=True, text=True, cwd=r"D:\CrawlDataLinkedin")
    print("\n=== LOCAL git HEAD ===")
    print(result.stdout.strip())

    # Git pull
    stdin2, stdout2, stderr2 = client.exec_command(f"cd {REPO} && git pull origin restyle-form 2>&1", timeout=60)
    print("\n=== Git pull ===")
    print(stdout2.read().decode("utf-8", errors="replace").strip())

    # Build backend
    stdin3, stdout3, stderr3 = client.exec_command(
        f"cd {REPO} && docker compose build backend 2>&1",
        timeout=600
    )
    out3 = stdout3.read().decode("utf-8", errors="replace")
    lines3 = out3.split('\n')
    print("\n=== BUILD BACKEND ===")
    print('\n'.join(lines3[-8:]))
    print("Exit:", stdout3.channel.recv_exit_status())

    # Restart
    stdin4, stdout4, stderr4 = client.exec_command(
        f"cd {REPO} && docker compose up -d --no-deps backend 2>&1",
        timeout=120
    )
    print("\n=== RESTART ===")
    print(stdout4.read().decode("utf-8", errors="replace").strip())

    time.sleep(20)

    # Get logs
    stdin5, stdout5, stderr5 = client.exec_command(
        f"cd {REPO} && docker compose logs --since '30s' backend 2>&1 | sed 's/[^[:ascii:][:space:]]//g' > /tmp/latest_logs.txt",
        timeout=30
    )
    stdout5.channel.recv_exit_status()

    try:
        sftp.get("/tmp/latest_logs.txt", r"D:\CrawlDataLinkedin\latest_logs.txt")
    except FileNotFoundError:
        print("Logs file not found")

    with open(r"D:\CrawlDataLinkedin\latest_logs.txt", "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    print("\n=== RECENT LOGS ===")
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
