import subprocess
import os

CRAWL = r"D:\CrawlDataLinkedin"
os.chdir(CRAWL)

# Git add all changes
print("=== Git add all ===")
result = subprocess.run(
    ["git", "add",
     "linkedin_group_crawler/scripts/zca_persistent_listener.js",
     "linkedin_group_crawler/app/modules/all_platform/zalo/services/zca_persistent_listener.py"
    ],
    capture_output=True, text=True, errors="replace"
)
print(result.stdout or "Added")
if result.stderr:
    print(result.stderr[:200])

# Git status
result = subprocess.run(["git", "status", "--short"], capture_output=True, text=True)
print(f"\nStatus:\n{result.stdout[:500]}")

# Git commit
print("\n=== Git commit ===")
result = subprocess.run([
    "git", "commit", "-m",
    """fix(zalo): ZCA listener crash loop, zombie processes, and WebSocket flood

ZCA listener had 3 critical issues causing the realtime flow to fail:

1. Zombie process leak: Node processes crashed immediately after start due to
   "Separator is found" errors from Zalo flooding the WebSocket with massive
   message bursts when requestOldMessages() was called on "connected" event.
   Old processes were not cleaned up, leaking 46 zombies.

2. Crash loop: Python restarted Node processes without draining the stdout buffer,
   causing cascading "Separator is found" errors from stale buffered data.
   No max crash limit meant infinite restart loops.

3. Root cause fix: Disabled requestOldMessages() call in Node listener's
   "connected" handler. Python startup sync (_sync_recent_groups_after_connect)
   already handles old message loading with proper rate-limiting.

Changes:
- Python: drain stdout buffer on crash, increase backoff to [5,15,45,120,300]s,
  add max 10 consecutive crash limit, smart crash counter reset after 60s.
- Node.js: disable requestOldMessages on connected/interval (handled by Python)."""
], capture_output=True, text=True, errors="replace"
)
print(result.stdout or "Committed")
if result.stderr:
    print(result.stderr[:300])

# Git log
result = subprocess.run(["git", "log", "--oneline", "-5"], capture_output=True, text=True)
print(f"\nGit log:\n{result.stdout}")

# Summary
print("\n=== Summary ===")
print("Commits this session:")
print("1. 05141c0 fix(zalo): disable requestOldMessages on connected event")
print("2. NEW:    fix(zalo): ZCA listener crash loop, zombie processes, WebSocket flood")
print("\nNOTE: Git push requires SSH/GH CLI auth. Run manually:")
print("  git push origin restyle-form")
