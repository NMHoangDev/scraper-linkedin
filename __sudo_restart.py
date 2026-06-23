import paramiko
import time
import sys

host, port, user, password = "10.120.80.45", 22, "seeding", "1"
local_path = "D:/service_fb_seeding/service/api/routes.py"
remote_tmp = "/tmp/routes_new.py"
remote_final = "/opt/service/api/routes.py"
api_key = "0ZuQJygUBevRMOfMswmNttMGIzet8Y-w"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

# Upload first
sftp = client.open_sftp()
sftp.put(local_path, remote_tmp)
sftp.close()
print("Uploaded routes.py")

# Verify
stdin, stdout, stderr = client.exec_command(f"wc -l {remote_tmp}")
print(f"Lines: {stdout.read().decode('utf-8', errors='replace').strip()}")

# Use invoke_shell for interactive sudo
transport = client.get_transport()
channel = transport.open_session()
channel.set_combine_stderr(True)
channel.get_pty(width=80, height=24)
channel.invoke_shell()

def send_cmd(ch, cmd, wait=1):
    ch.send(cmd + "\n")
    time.sleep(wait)
    out = ch.recv(65536).decode("utf-8", errors="replace")
    return out

# 1. Sudo shell
out = send_cmd(channel, password, wait=2)
print(f"Sudo attempt: {repr(out[-200:])}")

# 2. Copy file with sudo
out = send_cmd(channel, f"sudo cp {remote_tmp} {remote_final}", wait=3)
print(f"Copy: {repr(out[-300:])}")

# 3. Verify file changed
out = send_cmd(channel, f"grep -c 'get_session_owner' {remote_final}", wait=2)
print(f"Verify count: {out.strip()}")

# 4. Restart service
out = send_cmd(channel, "sudo systemctl restart fbservice", wait=4)
print(f"Restart: {repr(out[-300:])}")

# 5. Health check
time.sleep(2)
stdin2, stdout2, stderr2 = client.exec_command(f"curl -s http://127.0.0.1:8000/health")
health = stdout2.read().decode("utf-8", errors="replace").strip()
print(f"Health: {health}")

# 6. Test new endpoint
stdin3, stdout3, stderr3 = client.exec_command(
    f"curl -s -H 'X-API-Key: {api_key}' http://127.0.0.1:8000/session/owner/test123 2>&1"
)
result = stdout3.read().decode("utf-8", errors="replace").strip()
print(f"New endpoint: {result}")

# 7. Service status
stdin4, stdout4, stderr4 = client.exec_command("sudo systemctl status fbservice 2>&1 | head -10")
status = stdout4.read().decode("utf-8", errors="replace").strip()
print(f"Status:\n{status}")

channel.close()
client.close()
print("\nAll done!")
