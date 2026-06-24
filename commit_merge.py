import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Verify clean state
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git status --short | grep -E '^(UU|AU|DU|AA|DD)'", timeout=10)
remaining = stdout.read().decode().strip()
print("Remaining conflicts:", remaining if remaining else "NONE - all resolved!")

# Show staged count
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git diff --cached --stat | tail -1", timeout=10)
print("Staged changes:", stdout.read().decode().strip())

# Commit merge
commit_msg = "Merge origin/feature/zalo-restyle-form-v2 into restyle-form: zalo/zca files updated, facebook inbox preserved"
cmd = f"cd {CWD} && git commit -m \"{commit_msg}\""
print("\nCommitting merge...")
stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
exit_code = stdout.channel.recv_exit_status()
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out)
if err:
    print("STDERR:", err)
if exit_code != 0:
    print(f"[exit code: {exit_code}]", file=sys.stderr)
else:
    print("Merge committed successfully!")

# Verify
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log --oneline -3", timeout=10)
print("\nRecent commits:")
print(stdout.read().decode())

client.close()
