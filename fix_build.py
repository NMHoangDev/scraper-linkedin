import subprocess, os

REPO = r"D:\CrawlDataLinkedin"

# Restore favicon.ico from restyle-form (before my changes)
subprocess.run(["git", "-C", REPO, "checkout", "--",
    "linkedin-crawler-ui/app/favicon.ico"], check=False)
print("Restored favicon.ico")

# Rebuild
print("\n=== REBUILDING ===")
result = subprocess.run(
    ["npm", "run", "build"],
    capture_output=True, text=True, timeout=300,
    cwd=REPO + "\\linkedin-crawler-ui"
)
print("STDOUT (last 50 lines):")
lines = result.stdout.strip().split('\n')
for l in lines[-50:]:
    print(l)
print("\nSTDERR (last 20 lines):")
lines2 = result.stderr.strip().split('\n')
for l in lines2[-20:]:
    print(l)
print(f"\nRC: {result.returncode}")
