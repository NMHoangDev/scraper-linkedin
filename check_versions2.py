import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Check local git log to see what commit the frontend is on
    stdin, stdout, stderr = client.exec_command(
        f"cd {REPO} && git log --oneline -5 2>&1",
        timeout=15
    )
    print("=== LOCAL GIT LOG ===")
    print(stdout.read().decode("utf-8", errors="replace"))

    # Check if frontend code was rebuilt after our changes
    stdin2, stdout2, stderr2 = client.exec_command(
        f"cd {REPO} && git log --oneline --all --decorate | head -10 2>&1",
        timeout=15
    )
    print("\n=== ALL BRANCHES ===")
    print(stdout2.read().decode("utf-8", errors="replace"))

    # Check frontend image build time vs last commit
    stdin3, stdout3, stderr3 = client.exec_command(
        f"cd {REPO} && git log -1 --format='%ci' 2>&1",
        timeout=15
    )
    print("\n=== LAST LOCAL COMMIT TIME ===")
    print(stdout3.read().decode("utf-8", errors="replace"))

    # Check events.py line 100 - the member case
    stdin4, stdout4, stderr4 = client.exec_command(
        "docker exec seeding-backend sed -n '95,105p' /app/app/modules/all_platform/zalo/api/routes/events.py 2>&1",
        timeout=15
    )
    print("\n=== events.py lines 95-105 ===")
    print(stdout4.read().decode("utf-8", errors="replace"))

    # Check which frontend JS file is served
    stdin5, stdout5, stderr5 = client.exec_command(
        "docker exec seeding-frontend ls -la /usr/share/nginx/html/static/js/*.js 2>/dev/null | head -5 || echo 'nginx not running'",
        timeout=15
    )
    print("\n=== Frontend JS files ===")
    print(stdout5.read().decode("utf-8", errors="replace"))

    # Check frontend code in container
    stdin6, stdout6, stderr6 = client.exec_command(
        "docker exec seeding-frontend grep -n 'getZaloAccounts' /usr/share/nginx/html/static/js/*.js 2>/dev/null | head -3 || echo 'not found'",
        timeout=15
    )
    print("\n=== Frontend has getZaloAccounts ===")
    print(stdout6.read().decode("utf-8", errors="replace"))

finally:
    client.close()
