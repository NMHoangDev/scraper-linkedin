import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
BACKEND_DIR = "/opt/apps/seeding_markeeai/scraper-linkedin/linkedin_group_crawler"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)

    # Get recent logs showing list accounts and create accounts
    stdin, stdout, stderr = client.exec_command(
        f"cd {BACKEND_DIR} && docker compose logs --tail=100 backend 2>&1",
        timeout=30
    )
    logs = stdout.read().decode("utf-8", errors="replace")
    
    # Filter for relevant lines
    lines = logs.split('\n')
    for line in lines:
        if any(k in line.lower() for k in ['account', 'id_member', 'list_zalo', 'role', 'resolve']):
            print(line)

finally:
    client.close()
