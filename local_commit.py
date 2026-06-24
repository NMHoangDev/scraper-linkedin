import subprocess
import os

CRAWL = r"D:\CrawlDataLinkedin"
os.chdir(CRAWL)

# Copy the fixed JS to local repo
LOCAL_JS = r"D:\CrawlDataLinkedin\realtime_explore\zca_fixed_local.js"
DEST_LOCAL = os.path.join(CRAWL, "linkedin_group_crawler", "scripts", "zca_persistent_listener.js")

print("=== Copy fixed JS to local repo ===")
with open(LOCAL_JS, "r", encoding="utf-8") as src:
    content = src.read()
with open(DEST_LOCAL, "w", encoding="utf-8") as dst:
    dst.write(content)
print(f"Copied to {DEST_LOCAL}")

# Git status
result = subprocess.run(["git", "status", "--short", "linkedin_group_crawler/scripts/zca_persistent_listener.js"], capture_output=True, text=True)
print(f"Git status: {result.stdout.strip()}")

# Git add
print("\n=== Git add ===")
result = subprocess.run(["git", "add", "linkedin_group_crawler/scripts/zca_persistent_listener.js"], capture_output=True, text=True, errors="replace")
print(result.stdout or "Added")
print(result.stderr or "")

# Git commit
print("\n=== Git commit ===")
result = subprocess.run([
    "git", "commit", "-m",
    """fix(zalo): disable requestOldMessages on connected event

The requestOldMessages call on ZCA WebSocket "connected" event caused
Zalo to flood the socket with massive message bursts, triggering
"Separator is found" crashes and an infinite restart loop with 46 zombie
Node processes.

Python startup sync (_sync_recent_groups_after_connect) already handles
old message loading with proper rate-limiting, so this call is redundant
and harmful."""
], capture_output=True, text=True, errors="replace")
print(result.stdout or "Committed")
if result.stderr:
    print(result.stderr[:200])

# Git log
result = subprocess.run(["git", "log", "-5", "--oneline"], capture_output=True, text=True)
print(f"\nGit log:\n{result.stdout}")
