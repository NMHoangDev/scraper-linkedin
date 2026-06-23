import paramiko

host, port, user, password = "10.30.50.29", 22, "vmadmin", "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=30)

out_file = open("D:/CrawlDataLinkedin/__local_check.txt", "w", encoding="utf-8", errors="replace")

cmds = [
    "curl -s --max-time 5 http://localhost:8000/health 2>&1",
    "curl -s --max-time 5 http://localhost:8000/api/all-platform/fb/sessions -H 'Authorization: Bearer test' 2>&1 | head -c 500",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    print(f"=== {cmd} ===", file=out_file)
    print(out if out else f"(empty, err={err})", file=out_file)

out_file.close()
client.close()
print("Done")
