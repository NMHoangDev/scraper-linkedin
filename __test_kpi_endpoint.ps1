$body = '{"email":"duongmai.13022005@gmail.com","start_date":"","end_date":""}'
$headers = @{
    'Content-Type' = 'application/json'
    'X-API-Key' = 'secret_api_key'
}
$uri = 'http://localhost:8000/api/all-platform/fb/post-kpi/summary'
try {
    $r = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -TimeoutSec 15
    Write-Host "Status: $($r.StatusCode)"
    Write-Host "Content: $($r.Content)"
} catch {
    $resp = $_.Exception.Response
    Write-Host "Error Status: $($resp.StatusCode)"
    $reader = [System.IO.StreamReader]::new($resp.GetResponseStream())
    $errBody = $reader.ReadToEnd()
    $reader.Close()
    Write-Host "Error Body: $errBody"
}
