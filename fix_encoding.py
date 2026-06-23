import subprocess
import os

files = {
    r"D:\CrawlDataLinkedin\zalo_useZaloCrawlerFlow.ts": r"D:\CrawlDataLinkedin\linkedin-crawler-ui\hooks\useZaloCrawlerFlow.ts",
    r"D:\CrawlDataLinkedin\zalo_all-platform.service.ts": r"D:\CrawlDataLinkedin\linkedin-crawler-ui\services\all-platform.service.ts",
    r"D:\CrawlDataLinkedin\zalo_AppAuthContext.tsx": r"D:\CrawlDataLinkedin\linkedin-crawler-ui\contexts\AppAuthContext.tsx",
    r"D:\CrawlDataLinkedin\zalo_zalo-api.ts": r"D:\CrawlDataLinkedin\linkedin-crawler-ui\types\zalo-api.ts",
}

for src, dst in files.items():
    # Read as UTF-16, write as UTF-8
    with open(src, "r", encoding="utf-16", errors="replace") as f:
        content = f.read()

    # Remove BOM
    if content.startswith("\ufeff"):
        content = content[1:]

    with open(dst, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Converted: {dst}")

# Cleanup temp files
for src in files:
    try:
        os.remove(src)
        print(f"Removed temp: {src}")
    except:
        pass

# Verify
for src, dst in files.items():
    if os.path.exists(dst):
        with open(dst, "r", encoding="utf-8") as f:
            first_line = f.readline()
        print(f"\n{dst} - first line: {first_line[:80]}")

# Show git diff
result = subprocess.run(
    ["git", "diff", "--stat", "--", "linkedin-crawler-ui/"],
    capture_output=True, text=True, cwd=r"D:\CrawlDataLinkedin"
)
print(f"\nGit diff stat:\n{result.stdout}")
