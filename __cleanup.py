import os
files = [
    "D:/CrawlDataLinkedin/__tmp_scp.py",
    "D:/CrawlDataLinkedin/__deploy_scp.py",
    "D:/CrawlDataLinkedin/__check_vm.py",
    "D:/CrawlDataLinkedin/__check_vm2.py",
    "D:/CrawlDataLinkedin/__restart_sudo.py",
    "D:/CrawlDataLinkedin/__check_sudo.py",
    "D:/CrawlDataLinkedin/__deploy_vm.py",
    "D:/CrawlDataLinkedin/__check_deploy.py",
    "D:/CrawlDataLinkedin/__check_deploy2.py",
    "D:/CrawlDataLinkedin/__vm_info.txt",
    "D:/CrawlDataLinkedin/__restart_test.py",
    "D:/CrawlDataLinkedin/__check_perms.py",
    "D:/CrawlDataLinkedin/__pty_deploy.py",
    "D:/CrawlDataLinkedin/__check_service.py",
    "D:/CrawlDataLinkedin/__diag.py",
    "D:/CrawlDataLinkedin/__final_test.py",
    "D:/CrawlDataLinkedin/__endpoint_test.py",
    "D:/CrawlDataLinkedin/__endpoint_test.txt",
    "D:/CrawlDataLinkedin/__deploy_lgc.py",
]
for f in files:
    try:
        os.remove(f)
        print(f"Deleted: {f}")
    except FileNotFoundError:
        pass
    except Exception as e:
        print(f"Error deleting {f}: {e}")
print("Done")
