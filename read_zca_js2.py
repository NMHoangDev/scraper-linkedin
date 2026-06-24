import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Read lines 200-350
cmd = "docker exec seeding-backend sed -n '200,350p' /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_js_200.txt", "wb") as f:
    f.write(out)
print(f"Lines 200-350: {len(out)} bytes")

# Read lines 350-500
cmd = "docker exec seeding-backend sed -n '350,500p' /app/scripts/zca_persistent_listener.js"
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\zca_js_350.txt", "wb") as f:
    f.write(out)
print(f"Lines 350-500: {len(out)} bytes")

client.close()
