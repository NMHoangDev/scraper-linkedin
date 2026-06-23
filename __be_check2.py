import paramiko

host, port, user, password = "10.30.50.29", 22, "vmadmin", "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__be_check.txt", "w", encoding="utf-8", errors="replace")

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err

# Check what process is listening on port 8000 - is it local or forwarded?
cmds = [
    # Check if localhost:8000 on VM is the backend
    'curl -s --max-time 5 http://127.0.0.1:8000/api/all-platform/fb/sessions -H "Authorization: Bearer test" 2>&1 | head -c 200',
    # What is the current git branch and does it have session/owner?
    f'cd {CWD} && git branch --show-current && grep -c "session/owner" app/modules/all_platform/routers/fb.py 2>&1',
    # Check the git remote
    f'cd {CWD} && git remote -v 2>&1',
    # Last commit
    f'cd {CWD} && git log --oneline -3 2>&1',
]

for cmd in cmds:
    out, err = run(cmd)
    print(f"=== {cmd[:80]} ===", file=out_file)
    print(out[:500] if out else f"(empty)", file=out_file)
    if err:
        print(f"[err] {err[:200]}", file=out_file)

out_file.close()
client.close()
print("Done")
