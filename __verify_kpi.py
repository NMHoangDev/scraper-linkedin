import httpx
import json

# Test 1: Direct call to service_fb_seeding (VM) - verify the endpoint exists
print("=== 1. service_fb_seeding /inbox/messages/count ===")
try:
    resp = httpx.get(
        "https://auto-fb.zenithglobal.dev/inbox/messages/count",
        params={"owner": "test@example.com", "start": "2026-06-22", "end": "2026-06-22"},
        headers={"X-API-Key": "0ZuQJygUBevRMOfMswmNttMGIzet8Y-w"},
        timeout=15.0
    )
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text[:500]}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: Local backend KPI endpoint (Windows)
print("\n=== 2. KPI fb-inbox-progress (Windows local backend) ===")
try:
    resp = httpx.post(
        "http://localhost:8000/api/all-platform/kpi/fb-inbox-progress",
        json={"email": "test@example.com", "start_date": "2026-06-22", "end_date": "2026-06-22"},
        headers={"Content-Type": "application/json"},
        timeout=20.0
    )
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text[:800]}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: Local backend health + config check
print("\n=== 3. Backend config check ===")
try:
    resp = httpx.get("http://localhost:8000/health", timeout=5.0)
    print(f"Health: {resp.text[:200]}")
except Exception as e:
    print(f"Error: {e}")

print("\nDone")
