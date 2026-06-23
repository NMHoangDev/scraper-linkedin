import base64
import sys
import time
from pathlib import Path

import paramiko


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO = "/opt/apps/seeding_markeeai/scraper-linkedin"
LOCAL_FILE = Path("remote_zca_persistent_listener.py")
REMOTE_TMP = "/tmp/zca_persistent_listener.realtime_delay_fix.py"
CONTAINER_FILE = "/app/app/modules/all_platform/zalo/services/zca_persistent_listener.py"


def run(client: paramiko.SSHClient, command: str, timeout: int = 60) -> tuple[int, str]:
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    output = stdout.read().decode("utf-8", errors="replace")
    output += stderr.read().decode("utf-8", errors="replace")
    return exit_code, output


content = LOCAL_FILE.read_bytes()
b64 = base64.b64encode(content).decode("ascii")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

try:
    channel = client.get_transport().open_session()
    channel.exec_command(
        f"python3 -c \"import sys,base64; open('{REMOTE_TMP}','wb').write(base64.b64decode(sys.stdin.read()))\""
    )
    channel.sendall(b64)
    channel.shutdown_write()
    write_code = channel.recv_exit_status()
    print(f"write_tmp_exit={write_code} bytes={len(content)}")
    if write_code != 0:
        raise SystemExit(write_code)

    checks = [
        f"python3 -m py_compile {REMOTE_TMP}",
        f"docker exec seeding-backend python3 -m py_compile {CONTAINER_FILE}",
        f"docker exec seeding-backend cp {CONTAINER_FILE} {CONTAINER_FILE}.bak_realtime_delay_$(date +%Y%m%d%H%M%S)",
        f"docker cp {REMOTE_TMP} seeding-backend:{CONTAINER_FILE}",
        f"docker exec seeding-backend python3 -m py_compile {CONTAINER_FILE}",
    ]
    for command in checks:
        code, output = run(client, command, timeout=60)
        print(f"$ {command}\nexit={code}\n{output[-1000:]}")
        if code != 0:
            raise SystemExit(code)

    code, output = run(client, f"cd {REPO} && docker compose restart backend", timeout=120)
    print(f"restart_exit={code}\n{output[-1000:]}")
    if code != 0:
        raise SystemExit(code)

    time.sleep(12)
    for command in [
        f"cd {REPO} && docker compose ps backend",
        "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep",
        "docker logs --since=2m --tail=120 seeding-backend 2>&1",
    ]:
        code, output = run(client, command, timeout=60)
        print(f"$ {command}\nexit={code}\n{output[-4000:]}")
finally:
    client.close()
