Set-Location D:\InvoiceFlowManager
$envFile = Get-Content .env.local
foreach ($line in $envFile) {
  if ($line -match '^(SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL)=(.+)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
  }
}
node list_groups.mjs