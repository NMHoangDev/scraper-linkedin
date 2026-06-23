import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"
FILE = f"{CWD}/linkedin_group_crawler/app/modules/all_platform/zalo/services/supabase_service.py"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

# Syntax check - use absolute path
print("=== Python syntax check ===")
stdin, stdout, stderr = client.exec_command(
    f"python3 -m py_compile {FILE} && echo 'Syntax OK'",
    timeout=30
)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out.strip() or "(no output)")
# Filter warnings
err_lines = [l for l in err.split("\n") if "Warning" not in l and l.strip()]
print("Errors:", err_lines[:5] if err_lines else "None")

# Quick functional test - verify _UUID_RE is correct
print("\n=== UUID_RE functional test ===")
cmd = """python3 -c "
import re
_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\$', re.IGNORECASE)
test_cases = [
    ('7954496956010', False),   # numeric - should NOT match (was the bug)
    ('abc123', False),          # short - should NOT match
    ('a665a459-2042-478a-a3f1-4e7e0014b', False),  # no dashes - should NOT match
    ('a665a459-2042-478a-a3f1-4e7e0014b12d', False),  # 36 chars no dashes - should NOT match
    ('a665a459-2042-478a-a3f1-4e7e0014b12', False),  # 34 chars - should NOT match
    ('550e8400-e29b-41d4-a716-446655440000', True),  # valid UUID
    ('a665a4592042478aa3f14e7e0014b12d', False),  # no dashes
    ('manual-1234567890', False),  # source id style
]
all_ok = True
for val, expected in test_cases:
    result = bool(_UUID_RE.match(val))
    status = 'OK' if result == expected else 'FAIL'
    if status == 'FAIL':
        all_ok = False
    print(f'  {status}: {val!r} => {result} (expected {expected})')
print('ALL PASS' if all_ok else 'SOME FAILED')
"
"""
stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
out = stdout.read().decode("utf-8", errors="replace")
err = stderr.read().decode("utf-8", errors="replace")
print(out)
if err:
    print("STDERR:", err[:300])

client.close()
