import subprocess
import os

CRAWL = r"D:\CrawlDataLinkedin"
os.chdir(CRAWL)

# 1. Pull remote changes
print("=== Git pull ===")
result = subprocess.run(
    ["git", "pull", "origin", "restyle-form"],
    capture_output=True, text=True, errors="replace"
)
print(result.stdout[:500])
if result.stderr:
    print(f"stderr: {result.stderr[:500]}")

# 2. Check if Python fix is now in
print("\n=== Check Python fix ===")
result = subprocess.run(
    ["git", "log", "--oneline", "-5", "--", "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"],
    capture_output=True, text=True
)
print(result.stdout)

# 3. The Python fix (29f0589) was committed on VM but not in the remote
# We need to manually apply the Python fix locally since the commit doesn't exist in remote
# The Python file locally already has the fix (from merge) but let me check
print("\n=== Check if Python file has fixes ===")
result = subprocess.run(
    ["git", "diff", "--", "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"],
    capture_output=True, text=True, errors="replace"
)
print(f"Diff lines: {len(result.stdout.splitlines())}")
if result.stdout.strip():
    print("HAS uncommitted changes")
else:
    print("No uncommitted changes")

# 4. Check the working tree - find the VM committed version
# Since VM has the fix but remote doesn't, let's check if the file was already updated
result = subprocess.run(
    ["git", "status", "--short"],
    capture_output=True, text=True
)
print(f"\nOverall status:\n{result.stdout[:500]}")

# 5. Check what's in the Python file - look for our fix keywords
PY_FILE = os.path.join(CRAWL, "linkedin_group_crawler", "app", "modules", "all_platform", "zalo", "services", "zca_persistent_listener.py")
with open(PY_FILE, "r", encoding="utf-8") as f:
    content = f.read()

print("\n=== Python file fix check ===")
print(f"Drain any remaining: {'YES' if 'Drain any remaining' in content else 'NO'}")
print(f"max crash limit (> 10): {'YES' if 'restart_attempt > 10' in content else 'NO'}")
print(f"RESTART_BACKOFFS [5, 15: {'YES' if '_RESTART_BACKOFFS = [5, 15' in content else 'NO'}")
