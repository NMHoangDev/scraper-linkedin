#!/usr/bin/env python3
import paramiko
import sys
import os

host = '10.120.80.45'
port = 22
username = 'seeding'
password = '1'

local_base = 'D:/service_fb_seeding/service'
remote_base = '/opt/service/service'

files = [
    'api/routes.py',
    'config.py',
    'sse/routes.py',
]

print(f"Connecting to {host}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, port=port, username=username, password=password, timeout=30)
sftp = ssh.open_sftp()

for f in files:
    local = os.path.join(local_base, f)
    remote = os.path.join(remote_base, f)
    print(f"Copying {f}...")
    sftp.put(local, remote)

sftp.close()
ssh.close()
print("Done!")
