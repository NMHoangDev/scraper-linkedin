import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check frontend docker-compose config
    stdin, stdout, stderr = client.exec_command(
        f"cat {REPO}/linkedin_group_crawler/docker-compose.yml 2>&1 | grep -A10 'frontend:'",
        timeout=15
    )
    print("=== Frontend docker-compose ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check frontend Dockerfile
    stdin2, stdout2, stderr2 = client.exec_command(
        f"ls -la {REPO}/linkedin-crawler-ui/ 2>&1",
        timeout=15
    )
    print("\n=== Frontend directory ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Check git log for frontend changes
    stdin3, stdout3, stderr3 = client.exec_command(
        f"cd {REPO} && git log --oneline --all -- linkedin-crawler-ui/ | head -5 2>&1",
        timeout=15
    )
    print("\n=== Frontend git history ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

    # Check if frontend was rebuilt after our changes
    stdin4, stdout4, stderr4 = client.exec_command(
        "docker images scraper-linkedin-frontend --format '{{.ID}} {{.Created}}' 2>&1",
        timeout=15
    )
    print("\n=== Frontend images ===")
    print(stdout4.read().decode("utf-8", errors="replace"))

finally:
    client.close()
