"""
Deploy script: push inbox endpoints to remote seeding service.
Service IP: 10.120.80.45
User: seeding / 1
"""
import os
import sys
import paramiko
import io
from pathlib import Path

HOST = "10.120.80.45"
PORT = 22
USER = "seeding"
PASS = "1"

# Files to deploy (relative to service/)
REMOTE_BASE = "/home/seeding/service"
FILES = [
    ("service/api/routes.py", "api/routes.py"),
    ("service/sse/routes.py", "sse/routes.py"),
    ("service/inbox/worker.py", "inbox/worker.py"),
    ("service/config.py", "config.py"),
    ("service/main.py", "main.py"),
]

def deploy():
    print(f"Connecting to {HOST}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASS)
    print("Connected!")

    local_base = Path(__file__).parent.resolve() / "service_fb_seeding" / "service"

    for local_rel, remote_rel in FILES:
        local_path = local_base / local_rel
        remote_path = f"{REMOTE_BASE}/{remote_rel}"

        print(f"\n--- Deploying {local_rel} -> {remote_path} ---")
        content = local_path.read_text(encoding="utf-8")

        # Write to remote via cat
        # Escape single quotes in password for bash
        escaped = content.replace("'", "'\"'\"'")

        # Use python3 on remote to write the file (more reliable than scp)
        cmd = f"python3 -c \"import sys; open('{remote_path}', 'w', encoding='utf-8').write(sys.stdin.read())\""
        # Write content via stdin - need to do this differently with paramiko
        stdin_write = io.StringIO(content)

        # Use SFTP for reliable upload
        sftp = client.open_sftp()
        sftp.putfo(stdin_write, remote_path)
        sftp.close()
        print(f"  Uploaded: {local_path.stat().st_size} bytes")

        # Check remote file
        stdin, stdout, stderr = client.exec_command(f"wc -l {remote_path}")
        lines = stdout.read().decode().strip()
        print(f"  Remote lines: {lines}")

    # Restart the service
    print("\n--- Restarting service ---")
    stdin, stdout, stderr = client.exec_command("cd /home/seeding && pm2 restart all 2>&1 || supervisorctl restart seeding 2>&1 || (pkill -f 'uvicorn' || true) && sleep 1 && nohup python3 -m uvicorn service.main:app --host 0.0.0.0 --port 8000 --workers 1 > service.log 2>&1 &")
    stdout_chunks = []
    while True:
        chunk = stdout.read(1024).decode()
        if not chunk:
            break
        stdout_chunks.append(chunk)
    stderr_chunks = []
    while True:
        chunk = stderr.read(1024).decode()
        if not chunk:
            break
        stderr_chunks.append(chunk)

    out = "".join(stdout_chunks)
    err = "".join(stderr_chunks)
    print(f"  Restart output: {out}")
    if err:
        print(f"  Restart errors: {err}")

    # Wait a moment then check health
    import time
    time.sleep(3)
    stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/health")
    health = stdout.read().decode().strip()
    print(f"  Health: {health}")

    client.close()
    print("\nDone!")

if __name__ == "__main__":
    try:
        import paramiko
    except ImportError:
        print("pip install paramiko")
        sys.exit(1)
    deploy()
