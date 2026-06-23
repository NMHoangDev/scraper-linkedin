import paramiko
import sys
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
LOCAL_SCRIPT = r"D:\CrawlDataLinkedin\resolve_conflicts.sh"
REMOTE_SCRIPT = "/tmp/resolve_conflicts.sh"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

sftp = client.open_sftp()
sftp.put(LOCAL_SCRIPT, REMOTE_SCRIPT)
sftp.close()
print("Script uploaded.")

stdin, stdout, stderr = client.exec_command(f"bash {REMOTE_SCRIPT}", timeout=180)
exit_code = stdout.channel.recv_exit_status()
combined = stdout.read().decode("utf-8", errors="replace")
combined += stderr.read().decode("utf-8", errors="replace")
print(combined)

if exit_code != 0:
    print(f"[exit code: {exit_code}]", file=sys.stderr)

client.close()
