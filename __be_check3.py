import httpx
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# The KPI_BACKEND_URL from the .env
KPI_BACKEND = "https://aba9-14-174-210-31.ngrok-free.app"
headers = {"X-API-Key": "secret_api_key"}

# Check if backend is alive
r_health = httpx.get(f"{KPI_BACKEND}/health", timeout=10)
print(f"Health: {r_health.status_code} {r_health.text[:200]}")

# Check OpenAPI for fb_post_kpi routes
r_oas = httpx.get(f"{KPI_BACKEND}/openapi.json", timeout=10)
print(f"OpenAPI status: {r_oas.status_code}")
import json
try:
    oas = r_oas.json()
    paths = [p for p in oas.get("paths", {}).keys() if "kpi" in p.lower() or "fb" in p.lower()]
    print(f"Paths with kpi/fb: {sorted(paths)}")
except Exception as e:
    print(f"OpenAPI parse failed: {e}")

# Test the fb_post_kpi/save endpoint
test_payload = {
    "job_id": "test-job-001",
    "user_id": "fb_61590643803233",
    "post_url": "https://www.facebook.com/61590643803233/posts/test123",
    "content": "Test post",
    "target_type": "profile",
    "platform": "facebook",
    "posted_at": "2026-06-23T10:00:00+00:00"
}
r_save = httpx.post(f"{KPI_BACKEND}/api/all-platform/fb/post-kpi/save", json=test_payload, headers=headers, timeout=15)
print(f"\nPOST /api/all-platform/fb/post-kpi/save:")
print(f"Status: {r_save.status_code}")
try:
    safe_text = r_save.text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    print(f"Response: {safe_text[:1000]}")
except Exception as e:
    print(f"Response decode error: {e}")
    print(f"Response raw bytes: {r_save.content[:500]}")

# Test without API key
r_save2 = httpx.post(f"{KPI_BACKEND}/api/all-platform/fb/post-kpi/save", json=test_payload, timeout=15)
print(f"\nPOST without X-API-Key:")
print(f"Status: {r_save2.status_code}")
try:
    safe_text2 = r_save2.text.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
    print(f"Response: {safe_text2[:500]}")
except Exception as e:
    print(f"Response decode error: {e}")
