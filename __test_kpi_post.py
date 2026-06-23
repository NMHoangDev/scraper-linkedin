"""
Test script để kiểm tra KPI Post FB flow.

Cách dùng:
1. Đảm bảo backend đang chạy (port 8001 hoặc 8002)
2. Chạy script này: python test_kpi_post.py

Script sẽ:
1. Test POST /fb/post-kpi/save - Lưu 1 KPI post
2. Test POST /fb/post-kpi/summary - Lấy tổng hợp
3. Test POST /fb/post-kpi/list - Lấy danh sách
"""

import requests
import json
from datetime import datetime

# Cấu hình
BACKEND_URL = "http://localhost:8001"  # Đổi port nếu cần
API_KEY = "0ZuQJygUBevRMOfMswmNzruoY+gKh38y7Zukww+XFM"  # API key từ user

HEADERS = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
}


def test_save_kpi():
    """Test lưu KPI post."""
    print("\n" + "=" * 60)
    print("TEST 1: Save KPI Post")
    print("=" * 60)

    # Dữ liệu test - cần có user_id đã được link trong fb_inbox_accounts
    # user_id ở đây là format của seeder service (VD: "fb_10001")
    payload = {
        "job_id": f"test_job_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "user_id": "fb_test_user",  # Thay bằng user_id thật
        "post_url": "https://www.facebook.com/test/post/123456",
        "content": "Test bài viết KPI - nội dung test",
        "target_type": "profile",
        "target_id": "1000123456",
        "platform": "facebook",
        "posted_at": datetime.now().isoformat(),
    }

    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")

    try:
        resp = requests.post(
            f"{BACKEND_URL}/fb/post-kpi/save",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        print(f"\nStatus: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
        return resp.json()
    except requests.exceptions.ConnectionError as e:
        print(f"\nLỖI: Không thể kết nối backend tại {BACKEND_URL}")
        print(f"Chi tiết: {e}")
        print("\nĐảm bảo backend đang chạy!")
        return None
    except Exception as e:
        print(f"\nLỖI: {e}")
        return None


def test_get_summary(email: str):
    """Test lấy tổng hợp KPI."""
    print("\n" + "=" * 60)
    print("TEST 2: Get KPI Summary")
    print("=" * 60)

    payload = {
        "email": email,
        "start_date": "2026-06-16",  # Monday tuần này
        "end_date": "2026-06-22",      # Sunday tuần này
    }

    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")

    try:
        resp = requests.post(
            f"{BACKEND_URL}/fb/post-kpi/summary",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        print(f"\nStatus: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
        return resp.json()
    except Exception as e:
        print(f"\nLỖI: {e}")
        return None


def test_get_list(email: str):
    """Test lấy danh sách KPI."""
    print("\n" + "=" * 60)
    print("TEST 3: Get KPI List")
    print("=" * 60)

    payload = {
        "email": email,
        "start_date": "2026-06-16",
        "end_date": "2026-06-22",
        "target_type": None,  # Lọc theo loại: "profile", "group", "page" hoặc None
        "limit": 10,
    }

    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")

    try:
        resp = requests.post(
            f"{BACKEND_URL}/fb/post-kpi/list",
            json=payload,
            headers=HEADERS,
            timeout=10
        )
        print(f"\nStatus: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
        return resp.json()
    except Exception as e:
        print(f"\nLỖI: {e}")
        return None


def test_service_to_backend():
    """Test service gọi backend - giả lập job_result."""
    print("\n" + "=" * 60)
    print("TEST 4: Service -> Backend (giả lập job_result)")
    print("=" * 60)

    # Đây là cách service gọi backend khi nhận kết quả từ extension
    # POST /job_result -> _save_fb_post_kpi()

    # Payload giống như extension gửi về service
    job_result = {
        "job_id": f"test_job_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "user_id": "fb_test_user",
        "status": "success",
        "result": {
            "post_url": "https://www.facebook.com/test/post/789012",
        }
    }

    # Service sẽ gọi backend với payload đã format
    kpi_payload = {
        "job_id": job_result["job_id"],
        "user_id": job_result["user_id"],
        "post_url": job_result["result"].get("post_url"),
        "content": "Test từ service call",
        "target_type": "profile",
        "target_id": None,
        "platform": "facebook",
        "posted_at": datetime.now().isoformat(),
    }

    print(f"Service gọi backend với KPI payload:")
    print(json.dumps(kpi_payload, indent=2, ensure_ascii=False))

    try:
        resp = requests.post(
            f"{BACKEND_URL}/fb/post-kpi/save",
            json=kpi_payload,
            headers=HEADERS,
            timeout=10
        )
        print(f"\nStatus: {resp.status_code}")
        print(f"Response: {json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
        return resp.json()
    except Exception as e:
        print(f"\nLỖI: {e}")
        return None


if __name__ == "__main__":
    print("=" * 60)
    print("KPI POST FB - TEST SCRIPT")
    print("=" * 60)
    print(f"Backend URL: {BACKEND_URL}")

    # Test 1: Lưu KPI
    test_save_kpi()

    # Test 2: Lấy summary (thay email bằng email thật)
    # test_get_summary("member@example.com")

    # Test 3: Lấy list (thay email bằng email thật)
    # test_get_list("member@example.com")

    # Test 4: Service -> Backend
    test_service_to_backend()

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60)
