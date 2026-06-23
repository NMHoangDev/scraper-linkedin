import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check container code has the fix
print("=== Container: update_library_message fix ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend grep -n 'uuid_ids\\|source_ids\\|id_params' /app/app/modules/all_platform/zalo/services/supabase_service.py | head -10",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

print("\n=== Container: bulk_delete fix ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend grep -n 'or.*id.in\\|source_message_id.*in' /app/app/modules/all_platform/zalo/services/supabase_service.py | head -10",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

print("\n=== Container: _UUID_RE ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend grep -n '_UUID_RE' /app/app/modules/all_platform/zalo/services/supabase_service.py",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace"))

# Also check if container git log matches
print("\n=== Container git log ===")
stdin, stdout, stderr = client.exec_command(
    "docker exec seeding-backend sh -c 'cd /app && git log -2 --oneline'",
    timeout=15
)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
