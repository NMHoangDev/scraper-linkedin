import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"
BACKEND_DIR = f"{REPO}/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check disk space
    stdin, stdout, stderr = client.exec_command("df -h 2>&1", timeout=15)
    print("Disk usage:")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Try to free space - remove docker images not in use
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker system prune -af --volumes 2>&1 | tail -5",
        timeout=120
    )
    print("\nDocker prune:")
    print(stdout2.read().decode("utf-8", errors="replace"))
    err2 = stderr2.read().decode("utf-8", errors="replace")
    if err2.strip(): print("STDERR:", err2)

    # Check space again
    stdin3, stdout3, stderr3 = client.exec_command("df -h /home /tmp 2>&1", timeout=15)
    print("\nAfter prune:")
    print(stdout3.read().decode("utf-8", errors="replace"))

    # Try git pull now
    stdin4, stdout4, stderr4 = client.exec_command(
        f"cd {REPO} && git pull origin restyle-form 2>&1",
        timeout=120
    )
    print("\nGit pull:")
    print(stdout4.read().decode("utf-8", errors="replace"))

finally:
    client.close()
