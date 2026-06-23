import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO_PATH = "/opt/apps/seeding_markeeai/scraper-linkedin"
BACKEND_DIR = f"{REPO_PATH}/linkedin_group_crawler"

# First check if git pull works and if backend container exists
CMDS = [
    f"cd {REPO_PATH} && git pull origin restyle-form 2>&1",
    f"cd {BACKEND_DIR} && docker compose ps 2>&1",
    f"cd {BACKEND_DIR} && docker compose ps backend 2>&1",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    for cmd in CMDS:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        print(f"CMD: {cmd}")
        print(stdout.read().decode("utf-8", errors="replace"))
        err = stderr.read().decode("utf-8", errors="replace")
        if err:
            print("STDERR:", err)
        print(f"Exit: {stdout.channel.recv_exit_status()}\n")
finally:
    client.close()
