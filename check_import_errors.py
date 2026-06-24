import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Check if there are import errors when loading events.py via the router
print("=== Test events router loading ===")
cmd = """docker exec seeding-backend python3 -c "
import sys
sys.path.insert(0, '/app')
try:
    from app.modules.all_platform.zalo.api.routes.events import router as events_router
    print('events router OK')
    print('events router prefix:', events_router.prefix)
    print('events router routes:', [r.path for r in events_router.routes if hasattr(r, 'path')])
except Exception as e:
    import traceback
    traceback.print_exc()
    print('FAILED:', e)
" 2>&1"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\events_load_test.txt", "wb") as f:
    f.write(out)
print(f"Read {len(out)} bytes")

# Test loading all router together
print("\n=== Test all_platform_router loading ===")
cmd = """docker exec seeding-backend python3 -c "
import sys
sys.path.insert(0, '/app')
try:
    from app.modules.all_platform.router import all_platform_router
    print('all_platform_router OK')
    print('all_platform_router prefix:', getattr(all_platform_router, 'prefix', 'no prefix'))
    # Check for events routes
    for r in all_platform_router.routes:
        if hasattr(r, 'path') and 'event' in r.path.lower():
            print('Found event route:', r.path)
    # Count routes
    count = sum(1 for r in all_platform_router.routes if hasattr(r, 'path'))
    print('Total sub-routes:', count)
except Exception as e:
    import traceback
    traceback.print_exc()
    print('FAILED:', e)
" 2>&1"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
out2 = stdout.read()
with open(r"D:\CrawlDataLinkedin\realtime_explore\router_load_test.txt", "wb") as f:
    f.write(out2)
print(f"Read {len(out2)} bytes")

client.close()
