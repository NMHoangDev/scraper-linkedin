import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# 1. Check VM file has the fix
print("=== VM file: _UUID_RE usage ===")
stdin, stdout, stderr = client.exec_command(f"grep -n '_UUID_RE\\|UUID_RE' {FILE}", timeout=10)
print(stdout.read().decode("utf-8", errors="replace"))

# 2. Check the actual running container has the fix
print("\n=== Container file: _UUID_RE usage ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend cat /app/app/modules/all_platform/zalo/services/supabase_service.py | grep -n '_UUID_RE\\|UUID_RE'",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# 3. Check git log - did the commit include the fix?
print("\n=== Git log on VM ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log -3 --oneline", timeout=10)
print(stdout.read().decode("utf-8", errors="replace"))

# 4. Check if uuid.UUID(mid) still exists in VM file
print("\n=== uuid.UUID(mid) still in VM file? ===")
stdin, stdout, stderr = client.exec_command(f"grep -n 'uuid.UUID(mid)' {FILE}", timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip() or "(not found - good)")

# 5. Check the container file for uuid.UUID(mid)
print("\n=== uuid.UUID(mid) still in container? ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend grep -n 'uuid.UUID(mid)' /app/app/modules/all_platform/zalo/services/supabase_service.py",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace").strip() or "(not found - good)")

client.close()
