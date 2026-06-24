import paramiko
import time
import subprocess
import sys

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

    # Step 1: Git pull on VM
    print("=== GIT PULL ON VM ===")
    chan = client.exec_command(f"cd {REPO} && git fetch origin restyle-form && git reset --hard origin/restyle-form 2>&1", timeout=60)
    out = chan[1].read().decode("utf-8", errors="replace")
    print(out.strip() if out.strip() else "Done")

    # Step 2: Check git head
    chan2 = client.exec_command(f"cd {REPO} && git log -1 --format='%h %s' HEAD 2>&1", timeout=15)
    print(f"\nVM HEAD: {chan2[1].read().decode('utf-8', errors='replace').strip()}")

    # Check local head
    result = subprocess.run(["git", "log", "-1", "--format=%H %h %s"], capture_output=True, text=True, cwd=r"D:\CrawlDataLinkedin")
    print(f"Local HEAD: {result.stdout.strip()}")

    # Step 3: Rebuild frontend
    print("\n=== REBUILDING FRONTEND ===")
    chan3 = client.exec_command(f"cd {REPO} && docker compose build --no-cache frontend 2>&1", timeout=900)
    out3 = chan3[1].read().decode("utf-8", errors="replace")
    err3 = chan3[2].read().decode("utf-8", errors="replace")
    combined = (out3 + err3).split('\n')
    print('\n'.join(combined[-15:]))
    exit_code = chan3[1].channel.recv_exit_status()
    print(f"Exit: {exit_code}")

    if exit_code != 0:
        print("BUILD FAILED!")
        sys.exit(1)

    # Step 4: Restart container
    print("\n=== RESTARTING ===")
    chan4 = client.exec_command(f"cd {REPO} && docker compose up -d --no-deps frontend 2>&1", timeout=120)
    print(chan4[1].read().decode("utf-8", errors="replace").strip())

    print("\nWaiting 20s for container to start...")
    time.sleep(20)

    # Step 5: Verify
    print("=== VERIFY ===")
    chan5 = client.exec_command("docker inspect seeding-frontend --format '{{.State.Status}}' 2>&1", timeout=15)
    chan6 = client.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ 2>&1", timeout=10)
    chan7 = client.exec_command("docker inspect scraper-linkedin-frontend:latest --format '{{.Id}}' 2>&1", timeout=15)

    status = chan5[1].read().decode("utf-8", errors="replace").strip()
    http_code = chan6[1].read().decode("utf-8", errors="replace").strip()
    image_id = chan7[1].read().decode("utf-8", errors="replace").strip()

    print(f"Container: {status}")
    print(f"HTTP: {http_code}")
    print(f"Image: {image_id}")
    print(f"\nDone! Image is {image_id}")

finally:
    if sftp:
        sftp.close()
    client.close()
