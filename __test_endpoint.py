"""
Test the full KPI flow: call the backend endpoint directly.
"""
import urllib.request
import urllib.error
import json
import os

os.chdir(r"D:\CrawlDataLinkedin\linkedin_group_crawler")

BACKEND_URL = "https://aba9-14-174-210-31.ngrok-free.app"
API_KEY = "secret_api_key"

def http_post(url, data, headers=None):
    body = json.dumps(data).encode("utf-8")
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

def http_get(url, headers=None):
    h = {}
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

print("=" * 60)
print("1. CHECK: OpenAPI - does /fb/post-kpi/save exist?")
print("=" * 60)
status, body = http_get(f"{BACKEND_URL}/openapi.json")
print(f"  Status: {status}")
if status == 200:
    try:
        d = json.loads(body)
        paths = d.get("paths", {})
        post_kpi_paths = [p for p in paths.keys() if "post-kpi" in p]
        if post_kpi_paths:
            print(f"  [OK] Found post-kpi routes: {post_kpi_paths}")
            for p in post_kpi_paths:
                print(f"    {p}: {list(paths[p].keys())}")
        else:
            print(f"  [MISSING] No post-kpi routes found!")
            print(f"  All paths containing '/fb/':")
            for p in paths.keys():
                if "/fb/" in p:
                    print(f"    {p}")
    except:
        print(f"  Body preview: {body[:500]}")
else:
    print(f"  Error: {body[:200]}")

print()
print("=" * 60)
print("2. CHECK: /fb/post-kpi/save - actual test call")
print("=" * 60)
test_payload = {
    "job_id": "test_check_001",
    "user_id": "test_fb_001",
    "post_url": "https://facebook.com/test",
    "content": "test content",
    "target_type": "profile",
    "platform": "facebook"
}
status, body = http_post(
    f"{BACKEND_URL}/api/all-platform/fb/post-kpi/save",
    test_payload,
    {"X-API-Key": API_KEY}
)
print(f"  Status: {status}")
with open(r"D:\CrawlDataLinkedin\__endpoint_result.txt", "w", encoding="utf-8") as f:
    f.write(f"Status: {status}\n\n")
    f.write(f"Body:\n{body}\n")
print(f"  Response written to __endpoint_result.txt")

print()
print("=" * 60)
print("3. CHECK: /fb/post-kpi/save - test without API key")
print("=" * 60)
status2, body2 = http_post(
    f"{BACKEND_URL}/api/all-platform/fb/post-kpi/save",
    test_payload
)
print(f"  Status (no key): {status2}")
with open(r"D:\CrawlDataLinkedin\__endpoint_result2.txt", "w", encoding="utf-8") as f:
    f.write(f"Status: {status2}\n\n")
    f.write(f"Body:\n{body2}\n")
print(f"  Response written to __endpoint_result2.txt")

print()
print("=" * 60)
print("4. CHECK: /fb/post-kpi/summary")
print("=" * 60)
status3, body3 = http_post(
    f"{BACKEND_URL}/api/all-platform/fb/post-kpi/summary",
    {"email": "test@test.com"},
    {"X-API-Key": API_KEY}
)
print(f"  Status: {status3}")
with open(r"D:\CrawlDataLinkedin\__endpoint_result3.txt", "w", encoding="utf-8") as f:
    f.write(f"Status: {status3}\n\n")
    f.write(f"Body:\n{body3}\n")
print(f"  Response written to __endpoint_result3.txt")

print("\nDone.")
