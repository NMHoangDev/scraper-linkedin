import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO_PATH = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check git log for the function
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO_PATH} && git log --all --oneline -20 2>&1",
        timeout=30
    )
    print("Recent git log (all):")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check if the function was ever in git
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO_PATH} && git log --all -p -- zca_api_bridge.py 2>&1 | grep 'def get_zca_user_history' | head -5",
        timeout=30
    )
    print("\nFunction ever in git history?")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check what's in the origin/main or other branches
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO_PATH} && git branch -r 2>&1",
        timeout=30
    )
    print("\nRemote branches:")
    print(stdout.read().decode("utf-8", errors="replace"))

finally:
    client.close()
