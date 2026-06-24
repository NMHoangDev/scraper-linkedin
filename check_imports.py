import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check startup logs for errors
print("=== Container startup logs ===")
cmd = "docker logs --tail 80 seeding-backend 2>&1 | grep -i 'error\\|exception\\|traceback\\|failed\\|import' | head -20"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\startup_errors.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check if imports work
print("\n=== Test module imports ===")
cmd = """docker exec seeding-backend python3 -c "
import sys
sys.path.insert(0, '/app')
try:
    from app.modules.all_platform.zalo.api.routes import events
    print('events OK')
except Exception as e:
    print(f'events FAILED: {e}')
try:
    from app.modules.all_platform.zalo.api.routes import listener
    print('listener OK')
except Exception as e:
    print(f'listener FAILED: {e}')
try:
    from app.modules.all_platform.zalo.services import message_events
    print('message_events OK')
except Exception as e:
    print(f'message_events FAILED: {e}')
try:
    from app.modules.all_platform.zalo.services import zca_persistent_listener
    print('zca_persistent_listener OK')
except Exception as e:
    print(f'zca_persistent_listener FAILED: {e}')
" 2>&1"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\import_test.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Check full startup logs
print("\n=== Full startup logs (last 50 lines) ===")
cmd = "docker logs --tail 50 seeding-backend 2>&1"
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\full_startup.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

client.close()
