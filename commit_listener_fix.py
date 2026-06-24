import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Git add + commit
print("=== Git commit ===")
cmd = f"""cd {CWD} && git add linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py && git commit -m 'fix: ZCA listener crash loop and zombie process leak

- Drain stdout buffer on Node process crash to prevent cascading
  "Separator is found" errors from stale buffer data.
- Increase restart backoff from [3,8,20,45,90] to [5,15,45,120,300]s.
- Add max 10 consecutive crash limit per user — stops infinite
  crash loops that leak zombie Node processes.
- Smart crash counter reset: only reset restart_attempt after
  60s of stable connected state (not on first connect).'"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out[:1000])
if err and "fatal" in err.lower():
    print("STDERR:", err[:500])

print("\n=== Git log ===")
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log -4 --oneline", timeout=10)
print(stdout.read().decode("utf-8", errors="replace").strip())

client.close()
