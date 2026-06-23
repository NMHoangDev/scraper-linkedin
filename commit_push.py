import subprocess, os, sys

REPO = r"D:\CrawlDataLinkedin"

# Stage all frontend changes
print("=== STAGING ===")
subprocess.run(["git", "-C", REPO, "add", "linkedin-crawler-ui/"], check=True)

# Check what will be committed
result = subprocess.run(["git", "-C", REPO, "status", "--short", "--", "linkedin-crawler-ui/"],
    capture_output=True, text=True)
changed = [l for l in result.stdout.strip().split("\n") if l]
print(f"Files to commit: {len(changed)}")
for l in changed[:10]:
    print(f"  {l}")
if len(changed) > 10:
    print(f"  ... and {len(changed)-10} more")

# Commit
msg = """Merge UI from feature/zalo-restyle-form-v2: zalo inbox stability, simplified auth, UI refinements

Cherry-picks all frontend-only changes from zalo-restyle-form-v2 into restyle-form:
- Zalo inbox UI improvements (chat view, account manager, conversation list)
- Simplified auth flow (faster polling, no localStorage cache)
- Auth context cleanup
- All-platform UI refinements
- Fixed build after merge"""

print("\n=== COMMITTING ===")
result = subprocess.run(
    ["git", "-C", REPO, "commit", "-m", msg],
    capture_output=True, text=True
)
print("STDOUT:", result.stdout.strip())
print("RC:", result.returncode)
if result.returncode != 0:
    print("STDERR:", result.stderr.strip())
    sys.exit(1)

# Push
print("\n=== PUSHING ===")
result2 = subprocess.run(
    ["git", "-C", REPO, "push", "origin", "restyle-form"],
    capture_output=True, text=True, timeout=60
)
print("STDOUT:", result2.stdout.strip())
print("STDERR:", result2.stderr.strip())
print("RC:", result2.returncode)
if result2.returncode != 0:
    sys.exit(1)

print("\nDONE! Commit pushed.")
