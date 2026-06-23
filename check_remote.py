import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check what's on remote that we don't have
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && git fetch origin 2>&1 && git log --oneline origin/restyle-form -5 2>&1",
        timeout=30
    )
    print("Remote restyle-form:")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check our local commits
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && git log --oneline -5 2>&1",
        timeout=30
    )
    print("\nLocal commits:")
    print(stdout2.read().decode("utf-8", errors="replace"))

finally:
    client.close()
