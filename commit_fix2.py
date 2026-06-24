import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Commit properly - file is already modified, just needs add and commit
print("=== Git commit ===")
cmd = f"""cd {CWD} && git add linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py && git commit -m 'fix: UUID validation in update_library_message and bulk_delete_library_messages

UUID numeric IDs like 7954496956010 were passed directly as PostgreSQL
id=eq. values, causing 400 errors. Now uses the same UUID/source
separation logic as fetch_messages_by_ids.'"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:2000])
if err:
    print("STDERR:", err[:500])

print("\n=== Git log ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log -3 --oneline", timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
