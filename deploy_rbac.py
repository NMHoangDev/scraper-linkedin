import paramiko
import time
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO_PATH = "/opt/apps/seeding_markeeai/scraper-linkedin"
BACKEND_DIR = f"{REPO_PATH}/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Abort any pending operations
    stdin, stdout, stderr = client.exec_command(f"cd {REPO_PATH} && git cherry-pick --abort 2>&1 || true", timeout=30)
    stdin.read_all_output() if hasattr(stdin, 'read_all_output') else None

    # Pull latest
    cmds = [
        f"cd {REPO_PATH} && git pull origin restyle-form 2>&1",
        f"cd {REPO_PATH} && git log -1 --oneline 2>&1",
    ]
    for cmd in cmds:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        print(f"CMD: {cmd}")
        print(stdout.read().decode("utf-8", errors="replace"))
        print("Exit:", stdout.channel.recv_exit_status())

    print("\n=== BUILDING ===")
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose build backend 2>&1",
        timeout=600
    )
    out = stdout.read().decode("utf-8", errors="replace")
    lines = out.split('\n')
    print('\n'.join(lines[-30:]))
    ec = stdout.channel.recv_exit_status()
    print(f"\nBuild exit: {ec}")
    if ec != 0:
        err = stderr.read().decode("utf-8", errors="replace")
        print("STDERR:", err[-2000:])
        sys.exit(1)

    print("\n=== RESTARTING ===")
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose up -d --no-deps backend 2>&1",
        timeout=120
    )
    print(stdout.read().decode("utf-8", errors="replace"))
    print("Exit:", stdout.channel.recv_exit_status())

    print("\nWaiting 20s for backend to start...")
    time.sleep(20)

    print("\n=== STATUS ===")
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose ps backend 2>&1",
        timeout=30
    )
    print(stdout.read().decode("utf-8", errors="replace"))

    print("\n=== LOGS ===")
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=25 backend 2>&1",
        timeout=30
    )
    print(stdout.read().decode("utf-8", errors="replace"))

finally:
    client.close()
