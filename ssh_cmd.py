import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CMD = sys.argv[1] if len(sys.argv) > 1 else "echo connected"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    stdin, stdout, stderr = client.exec_command(CMD, timeout=60)
    exit_code = stdout.channel.recv_exit_status()

    combined = stdout.read().decode("utf-8", errors="replace")
    combined += stderr.read().decode("utf-8", errors="replace")
    # Write to stdout with UTF-8 encoding
    import sys
    writer = __import__('io').StringIO()
    writer.write(combined)
    sys.stdout.reconfigure(encoding='utf-8')
    print(combined)

    if exit_code != 0:
        print(f"[exit code: {exit_code}]", file=sys.stderr)
        sys.exit(exit_code)
finally:
    client.close()
