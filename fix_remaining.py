import paramiko
import sys

HOST = "10.30.50.29"
USER = "vmadmin"
PASS = "Poptech@123!"
CWD = "/opt/apps/seeding_markeeai/scraper-linkedin"

commands = [
    # Zalo routes - THEIRS
    "git checkout --theirs 'linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/crawler.py' && git add 'linkedin_group_crawler/app/modules/all_platform/zalo/api/routes/crawler.py'",
    # UI files with parens - THEIRS
    "git checkout --theirs 'linkedin-crawler-ui/app/(all-platform)/all-platform/admin/dashboard/page.tsx' && git add 'linkedin-crawler-ui/app/(all-platform)/all-platform/admin/dashboard/page.tsx'",
    # UI files with parens - OURS (inbox facebook)
    "git checkout --ours 'linkedin-crawler-ui/app/(all-platform)/all-platform/inbox/page.tsx' && git add 'linkedin-crawler-ui/app/(all-platform)/all-platform/inbox/page.tsx'",
    # UI files with parens - THEIRS
    "git checkout --theirs 'linkedin-crawler-ui/app/(all-platform-chat)/layout.tsx' && git add 'linkedin-crawler-ui/app/(all-platform-chat)/layout.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/app/(all-platform-chat)/zalo-chat/page.tsx' && git add 'linkedin-crawler-ui/app/(all-platform-chat)/zalo-chat/page.tsx'",
    # Other UI - THEIRS
    "git checkout --theirs 'linkedin-crawler-ui/app/globals.css' && git add 'linkedin-crawler-ui/app/globals.css'",
    "git checkout --theirs 'linkedin-crawler-ui/components/all-platform/category-management.tsx' && git add 'linkedin-crawler-ui/components/all-platform/category-management.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/components/all-platform/components/seeding-modal.tsx' && git add 'linkedin-crawler-ui/components/all-platform/components/seeding-modal.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/components/all-platform/layout/AllPlatformShell.tsx' && git add 'linkedin-crawler-ui/components/all-platform/layout/AllPlatformShell.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/components/features/auth/ForbiddenPage.tsx' && git add 'linkedin-crawler-ui/components/features/auth/ForbiddenPage.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/components/features/dashboard/CategoryManagementContent.tsx' && git add 'linkedin-crawler-ui/components/features/dashboard/CategoryManagementContent.tsx'",
    "git checkout --theirs 'linkedin-crawler-ui/components/ui/MaterialIcon.tsx' && git add 'linkedin-crawler-ui/components/ui/MaterialIcon.tsx'",
    # OURS
    "git checkout --ours 'linkedin-crawler-ui/public/markee-extension.zip' && git add 'linkedin-crawler-ui/public/markee-extension.zip'",
    "git checkout --theirs 'linkedin-crawler-ui/services/all-platform.service.ts' && git add 'linkedin-crawler-ui/services/all-platform.service.ts'",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)

for cmd in commands:
    full = f"cd {CWD} && {cmd}"
    stdin, stdout, stderr = client.exec_command(full, timeout=30)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.strip())
    if err.strip():
        print("ERR:", err.strip(), file=sys.stderr)

# Check remaining
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git status --short | grep -E '^(UU|AU|DU|AA|DD)' | wc -l", timeout=10)
print("\nRemaining conflicts:", stdout.read().decode().strip())
stdin, stdout, stderr = client.exec_command(f"cd {CWD} && git status --short | grep -E '^(UU|AU|DU|AA|DD)'", timeout=10)
print(stdout.read().decode())

client.close()
