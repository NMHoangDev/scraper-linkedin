import paramiko

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
REPO_PATH = "/opt/apps/seeding_markeeai/scraper-linkedin"

# Read conflict files from VM
FILES = [
    f"{REPO_PATH}/linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/accounts.py",
    f"{REPO_PATH}/linkedin_group_crawler/scripts/zca_persistent_listener.js",
    f"{REPO_PATH}/linkedin-crawler-ui/services/zaloCrawlerService.ts",
    f"{REPO_PATH}/linkedin-crawler-ui/hooks/useZaloCrawlerFlow.ts",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    for fpath in FILES:
        print(f"\n\n{'='*60}")
        print(f"FILE: {fpath}")
        print('='*60)
        stdin, stdout, stderr = client.exec_command(f"cat '{fpath}'", timeout=30)
        content = stdout.read().decode("utf-8", errors="replace")
        print(content[:8000])  # First 8000 chars to see conflict markers
finally:
    client.close()
