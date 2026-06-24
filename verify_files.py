import paramiko
import sys
import hashlib

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

FB_FILES = [
    "linkedin-crawler-ui/app/(all-platform)/all-platform/inbox/page.tsx",
    "linkedin-crawler-ui/components/facebook-crawler/modules/facebook-crawl/components/login.tsx",
    "linkedin-crawler-ui/components/facebook-crawler/modules/facebook-crawl/components/select-preset-groups-modal.tsx",
    "linkedin_group_crawler/app/modules/all_platform/routers/fb.py",
    "linkedin_group_crawler/app/modules/all_platform/routers/crawl_facebook.py",
    "linkedin_group_crawler/app/modules/facebook/src/modules/crawl_fb/schemas/crawl_schema.py",
    "linkedin_group_crawler/app/modules/facebook/src/storages/sessions/default_account_cookie.json",
]

ZALO_FILES = [
    "linkedin_group_crawler/package.json",
    "linkedin_group_crawler/scripts/zca_persistent_listener.js",
    "linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/crawler.py",
    "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

print("=== FACEBOOK FILES (should be OURS - unchanged) ===")
for f in FB_FILES:
    stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log --oneline -1 HEAD -- \"{f}\" 2>/dev/null", timeout=10)
    log = stdout.read().decode().strip()
    stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git show HEAD:\"{f}\" 2>/dev/null | head -3", timeout=10)
    preview = stdout.read().decode("utf-8", errors="replace").strip()
    print(f"  {f}")
    print(f"    commit: {log}")
    print(f"    head 3 lines: {preview[:120]}")
    print()

print("\n=== ZALO FILES (should be THEIRS - updated) ===")
for f in ZALO_FILES:
    stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git log --oneline -1 HEAD -- \"{f}\" 2>/dev/null", timeout=10)
    log = stdout.read().decode().strip()
    stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git show HEAD:\"{f}\" 2>/dev/null | head -3", timeout=10)
    preview = stdout.read().decode("utf-8", errors="replace").strip()
    print(f"  {f}")
    print(f"    commit: {log}")
    print(f"    head 3 lines: {preview[:120]}")
    print()

client.close()
