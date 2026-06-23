import paramiko
import time

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # 1. Check git HEAD
    stdin, stdout, stderr = client.exec_command(f"cd {REPO} && git log -1 --oneline 2>&1", timeout=15)
    print("=== GIT HEAD ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # 2. Check docker image build time
    stdin2, stdout2, stderr2 = client.exec_command(
        "docker inspect scraper-linkedin-backend:latest --format '{{.Created}}' 2>&1",
        timeout=15
    )
    print("\n=== IMAGE CREATED ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # 3. Check container start time
    stdin3, stdout3, stderr3 = client.exec_command(
        "docker inspect seeding-backend --format '{{.State.StartedAt}}' 2>&1",
        timeout=15
    )
    print("\n=== CONTAINER STARTED ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

    # 4. Check recent logs (last 5 min) for the warning
    stdin4, stdout4, stderr4 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --since '5m' backend 2>&1 | grep -E '22P02|list_zalo_accounts|accounts?'",
        timeout=30
    )
    print("\n=== RECENT WARNINGS (5m) ===")
    print(stdout4.read().decode("utf-8", errors="replace"))

    # 5. Check if events.py is calling list_zalo_accounts directly
    stdin5, stdout5, stderr5 = client.exec_command(
        "docker exec seeding-backend grep -n 'list_zalo_accounts' /app/app/modules/all_platform/zalo/api/routes/events.py 2>&1",
        timeout=15
    )
    print("\n=== events.py calls ===")
    print(stdout5.read().decode("utf-8", errors="replace"))

    # 6. Check container full logs for the warning context
    stdin6, stdout6, stderr6 = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=50 backend 2>&1 | grep -B2 -A2 '22P02'",
        timeout=30
    )
    print("\n=== WARNING CONTEXT ===")
    print(stdout6.read().decode("utf-8", errors="replace"))

    # 7. Check frontend build
    stdin7, stdout7, stderr7 = client.exec_command(
        "docker inspect scraper-linkedin-frontend:latest --format '{{.Created}}' 2>&1",
        timeout=15
    )
    print("\n=== FRONTEND IMAGE CREATED ===")
    print(stdout7.read().decode("utf-8", errors="replace"))

finally:
    client.close()
