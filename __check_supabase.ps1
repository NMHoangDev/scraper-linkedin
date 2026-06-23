$headers = @{
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d3BvZ3ZmaWNhZG5ndGZyY2NpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA2NDY1OCwiZXhwIjoyMDk1NjQwNjU4fQ.HaAidKEi4nSyeZh3rSW8wBkoUNb9aoKC9wDBWBA1XLc'
}

Write-Host "=== fb_inbox_accounts ===" -ForegroundColor Cyan
$r1 = Invoke-WebRequest -Uri 'https://rtwpogvficadngtfrcci.supabase.co/rest/v1/fb_inbox_accounts?select=*&limit=50' -Headers $headers -Method GET
Write-Host "Status:" $r1.StatusCode
$d1 = ($r1.Content | ConvertFrom-Json)
Write-Host "Total records:" $d1.Count
foreach ($row in $d1) {
    Write-Host "---"
    $row | ConvertTo-Json -Depth 5
}

Write-Host "`n=== fb_post_kpi ===" -ForegroundColor Cyan
$r2 = Invoke-WebRequest -Uri 'https://rtwpogvficadngtfrcci.supabase.co/rest/v1/fb_post_kpi?select=*&limit=50' -Headers $headers -Method GET
Write-Host "Status:" $r2.StatusCode
$d2 = ($r2.Content | ConvertFrom-Json)
Write-Host "Total records:" $d2.Count
foreach ($row in $d2) {
    Write-Host "---"
    $row | ConvertTo-Json -Depth 5
}

Write-Host "`n=== app_users (sample 5) ===" -ForegroundColor Cyan
$r3 = Invoke-WebRequest -Uri 'https://rtwpogvficadngtfrcci.supabase.co/rest/v1/app_users?select=id,email,role&limit=5' -Headers $headers -Method GET
Write-Host "Status:" $r3.StatusCode
$d3 = ($r3.Content | ConvertFrom-Json)
Write-Host "Total records shown:" $d3.Count
foreach ($row in $d3) {
    Write-Host "---"
    $row | ConvertTo-Json -Depth 3
}

Write-Host "`n=== Check if fb_inbox_accounts has any rows with user_id LIKE 'fb_%' ===" -ForegroundColor Cyan
$r4 = Invoke-WebRequest -Uri "https://rtwpogvficadngtfrcci.supabase.co/rest/v1/fb_inbox_accounts?user_id=ilike.fb_*&select=*" -Headers $headers -Method GET
Write-Host "Status:" $r4.StatusCode "Count:" @(([array]($r4.Content | ConvertFrom-Json)).Count)

Write-Host "`n=== Check all columns of fb_inbox_accounts ===" -ForegroundColor Cyan
$r5 = Invoke-WebRequest -Uri 'https://rtwpogvficadngtfrcci.supabase.co/rest/v1/fb_inbox_accounts?select=*&limit=1' -Headers $headers -Method GET
Write-Host "Status:" $r5.StatusCode
if ($r5.StatusCode -eq 200) {
    $sample = ($r5.Content | ConvertFrom-Json) | Select-Object -First 1
    if ($sample) {
        Write-Host "Columns:" ($sample.PSObject.Properties.Name -join ", ")
    } else {
        Write-Host "No records in fb_inbox_accounts"
    }
}
