import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read from container
print("=== zca_persistent_listener.js from container ===")
cmd = "docker exec seeding-backend cat /app/scripts/zca_persistent_listener.js | head -200"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_listener_js.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes, {out.decode('utf-8','replace').count(chr(10))} lines")

# Count lines total
cmd2 = "docker exec seeding-backend wc -l /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd2, timeout=15)
out2 = stdout.read()
print(f"Total lines: {out2.decode().strip()}")

client.close()
