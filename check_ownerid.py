import subprocess

REPO = r"D:\CrawlDataLinkedin"
REMOTE = "origin/feature/zalo-restyle-form-v2"

# Check if zalo-v2 has ZaloAccountManagerPanel.tsx with ownerId removed
files_to_check = [
    "linkedin-crawler-ui/components/all-platform/zalo/dashboard/ZaloAccountManagerPanel.tsx",
    "linkedin-crawler-ui/components/all-platform/zalo/dashboard/ZaloChatView.tsx",
]

for path in files_to_check:
    result = subprocess.run(
        ["git", "-C", REPO, "show", f"{REMOTE}:{path}"],
        capture_output=True, timeout=30
    )
    if result.returncode != 0:
        print(f"NOT IN zalo-v2: {path}")
    else:
        content = result.stdout.decode("utf-8", errors="replace")
        has_ownerId = "flow.ownerId" in content or "flow?.ownerId" in content
        print(f"\nIN zalo-v2: {path}")
        print(f"  Has flow.ownerId: {has_ownerId}")
        print(f"  Size: {len(content)} bytes")
        if has_ownerId:
            # Find lines with ownerId
            for i, line in enumerate(content.split('\n')):
                if 'ownerId' in line:
                    print(f"  Line {i+1}: {line.strip()[:100]}")
