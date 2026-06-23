import subprocess
import os

REPO = r"D:\CrawlDataLinkedin"
REMOTE = "origin/feature/zalo-restyle-form-v2"

files = [
    ("linkedin-crawler-ui/hooks/useZaloCrawlerFlow.ts",    r"D:\CrawlDataLinkedin\linkedin-crawler-ui\hooks\useZaloCrawlerFlow.ts"),
    ("linkedin-crawler-ui/services/all-platform.service.ts", r"D:\CrawlDataLinkedin\linkedin-crawler-ui\services\all-platform.service.ts"),
    ("linkedin-crawler-ui/contexts/AppAuthContext.tsx",     r"D:\CrawlDataLinkedin\linkedin-crawler-ui\contexts\AppAuthContext.tsx"),
    ("linkedin-crawler-ui/types/zalo-api.ts",               r"D:\CrawlDataLinkedin\linkedin-crawler-ui\types\zalo-api.ts"),
]

for git_path, dst in files:
    result = subprocess.run(
        ["git", "-C", REPO, "show", f"{REMOTE}:{git_path}"],
        capture_output=True, timeout=30
    )
    if result.returncode != 0:
        print(f"FAIL: {git_path}")
        print(result.stderr.decode("utf-8", errors="replace"))
        continue

    content = result.stdout.decode("utf-8", errors="replace")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "w", encoding="utf-8") as f:
        f.write(content)

    first_line = content.split("\n")[0] if content else "(empty)"
    print(f"OK: {git_path} -> {os.path.getsize(dst)} bytes | first line: {first_line[:60]}")

# Verify git diff
result = subprocess.run(
    ["git", "-C", REPO, "diff", "--stat", "--", "linkedin-crawler-ui/hooks/", "linkedin-crawler-ui/services/", "linkedin-crawler-ui/contexts/", "linkedin-crawler-ui/types/"],
    capture_output=True, text=True
)
print(f"\nGit diff stat:\n{result.stdout}")
