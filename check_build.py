import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check frontend image
print("=== Frontend image ===")
stdin, stdout, stderr = client.exec_command("docker images scraper-linkedin-frontend:latest --format '{{.ID}} {{.CreatedAt}}' 2>&1", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

# Check backend image
print("=== Backend image ===")
stdin, stdout, stderr = client.exec_command("docker images scraper-linkedin-backend:latest --format '{{.ID}} {{.CreatedAt}}' 2>&1", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

# Check container status
print("\n=== Container status ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && docker compose ps 2>&1", timeout=30)
print(stdout.read().decode("utf-8", errors="replace"))

# Health check
print("\n=== Health check ===")
stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health 2>&1", timeout=15)
print(stdout.read().decode("utf-8", errors="replace"))

client.close()
