import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Kill all zombie ZCA node processes
print("=== Kill zombie ZCA node processes ===")
cmd = "docker exec seeding-backend pkill -f zca_persistent_listener.js 2>&1; echo 'Kill exit:' $?"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read().decode("utf-8", errors="replace")
print(out)

import time
time.sleep(3)

# Verify
print("\n=== Remaining ZCA processes ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep | wc -l"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
count = int(stdout.read().decode().strip())
print(f"Remaining: {count}")

print("\n=== Remaining process list ===")
cmd = "docker exec seeding-backend ps aux | grep zca_persistent_listener | grep -v grep"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
print(out.decode("utf-8", errors="replace"))

client.close()
print("\nZombie processes killed!")
