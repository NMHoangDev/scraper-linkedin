import paramiko
import sys
import os

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CMD = sys.argv[1] if len(sys.argv) > 1 else "echo connected"
OUT_FILE = sys.argv[2] if len(sys.argv) > 2 else None

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    stdin, stdout, stderr = client.exec_command(CMD, timeout=120)
    exit_code = stdout.channel.recv_exit_status()

    combined = stdout.read().decode("utf-8", errors="replace")
    combined += stderr.read().decode("utf-8", errors="replace")

    if OUT_FILE:
        with open(OUT_FILE, "w", encoding="utf-8") as f:
            f.write(combined)
        print(f"Output written to {OUT_FILE}")
    else:
        # Try to print with UTF-8
        try:
            print(combined)
        except UnicodeEncodeError:
            # Fallback: write to temp file
            tmp = os.path.join(os.environ.get("TEMP", "/tmp"), "ssh_output.txt")
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(combined)
            print(f"[output too large/encoding issue - wrote to {tmp}]")
            print(combined.encode("utf-8", errors="replace").decode("utf-8", errors="replace"))

    if exit_code != 0:
        print(f"[exit code: {exit_code}]", file=sys.stderr)
        sys.exit(exit_code)
finally:
    client.close()
