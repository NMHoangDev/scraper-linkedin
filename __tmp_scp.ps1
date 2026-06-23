$ErrorActionPreference = "Stop"
$pass = "1" | ConvertTo-SecureString -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("seeding", $pass)
$sshCmd = "scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null D:/service_fb_seeding/service/api/routes.py seeding@10.120.80.45:/tmp/routes.py.new"
echo "Running: $sshCmd"
& cmd /c $sshCmd
