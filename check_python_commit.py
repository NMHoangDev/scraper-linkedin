import subprocess
import os

CRAWL = r"D:\CrawlDataLinkedin"
os.chdir(CRAWL)

# The Python fix (zca_persistent_listener.py) was already committed on VM
# Check if local has the Python changes
result = subprocess.run(
    ["git", "log", "--oneline", "--", "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"],
    capture_output=True, text=True
)
print(f"Local Python file commits:\n{result.stdout}")

# Check if Python changes are in working tree locally
result = subprocess.run(
    ["git", "status", "--short", "--", "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"],
    capture_output=True, text=True
)
print(f"Python file status: '{result.stdout.strip()}'")

# If nothing staged/unstaged, the Python fix is in the git history from VM commit
# The VM committed it as 29f0589
# We need to cherry-pick or pull that
print("\n=== Checking if we have the Python fix commit ===")
result = subprocess.run(["git", "log", "--oneline", "-1"], capture_output=True, text=True)
print(f"Latest local commit: {result.stdout.strip()}")

# The local repo might be behind the VM. Check remote
result = subprocess.run(["git", "fetch", "--all"], capture_output=True, text=True, errors="replace")
print(f"Fetch: {result.stdout[:200]}{result.stderr[:200]}")

# Check VM commit exists locally
result = subprocess.run(
    ["git", "log", "--oneline", "-1", "29f0589"],
    capture_output=True, text=True, errors="replace"
)
print(f"VM commit 29f0589 exists locally: {bool(result.stdout.strip())}")
