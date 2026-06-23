import subprocess
import os

REPO = r"D:\CrawlDataLinkedin"

msg = """Merge frontend stability fixes from feature/zalo-restyle-form-v2

- AUTH_POLL_INTERVAL_MS: 10000 -> 2000 (faster Zalo auth polling)
- AUTH_SUBMIT_TIMEOUT_MS: 20000 -> 12000 (shorter auth timeout)
- AppAuthContext: remove localStorage caching, simplify refresh logic
- useZaloCrawlerFlow: simplify account loading, remove ownerId params
- types/zalo-api: add role field to ZaloLibraryMessage
"""

# Stage
subprocess.run(["git", "-C", REPO, "add",
    "linkedin-crawler-ui/hooks/useZaloCrawlerFlow.ts",
    "linkedin-crawler-ui/services/all-platform.service.ts",
    "linkedin-crawler-ui/contexts/AppAuthContext.tsx",
    "linkedin-crawler-ui/types/zalo-api.ts",
], check=True)

# Commit
result = subprocess.run(
    ["git", "-C", REPO, "commit", "-m", msg],
    capture_output=True, text=True
)
print("STDOUT:", result.stdout)
print("STDERR:", result.stderr)
print("RC:", result.returncode)

# Push
if result.returncode == 0:
    result2 = subprocess.run(
        ["git", "-C", REPO, "push", "origin", "restyle-form"],
        capture_output=True, text=True, timeout=60
    )
    print("\nPUSH STDOUT:", result2.stdout)
    print("PUSH STDERR:", result2.stderr)
    print("PUSH RC:", result2.returncode)
