"""Seed dữ liệu khởi tạo cho Danh mục dịch vụ: nhóm "VPS Hosting", 18 dịch vụ
thành phần (SZ-CPU..SZ-SETUP) và 1 gói/combo "SZ-VPS" tổ hợp 6 trong số đó.

Requires migration 065_service_catalog.sql đã chạy (service_catalog_items,
service_catalog_bundle_items).

Idempotent: upsert theo `sku` (group dùng sku riêng để lookup), an toàn chạy lại
nhiều lần.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.supabase_client import get_supabase_client  # noqa: E402

GROUP_SKU = "VPS_HOSTING_GROUP"

# (sku, name, unit, price_vnd, note, spec_quantity_per_unit, spec_unit_label)
COMPONENTS = [
    ("SZ-CPU", "2 CPU (vCPU)", "Core/tháng", 10000, "cấu hình tối thiểu", 2, "CPU (vCPU)"),
    ("SZ-RAM", "2 GB RAM", "GB/tháng", 15000, "cấu hình tối thiểu", 2, "GB RAM"),
    ("SZ-SSD", "1 GB SSD - Lưu trữ dữ liệu bằng ổ thể rắn, tốc độ đọc/ghi nhanh hơn nhiều lần so với ổ cứng HDD truyền thống", "GB/tháng", 2000, "hiện DC không có SSD => để 0", 1, "GB SSD"),
    ("SZ-NVME", "20 GB NVMe", "GB/tháng", 30000, "cấu hình tối thiểu", 20, "GB NVMe"),
    ("SZ-BW", "1 Mbps Băng thông / Network - Dung lượng truyền tải dữ liệu ra vào máy chủ, đảm bảo tốc độ truy cập ổn định kể cả khi lượng truy cập tăng đột biến", "Mbps/tháng", 5000, "", 1, "Mbps"),
    ("SZ-IPPUB", "Địa chỉ IP Public bổ sung - Địa chỉ IP tĩnh riêng, hỗ trợ cấu hình nhiều website/dịch vụ độc lập trên cùng một máy chủ", "IP/tháng", 60000, "", 1, "IP Public"),
    ("SZ-IPV6", "Địa chỉ IPv6 - Hỗ trợ giao thức Internet thế hệ mới, tương thích các hệ thống và nhà mạng hiện đại, dự phòng mở rộng lâu dài", "Gói/tháng", 12000, "dịch vụ này chưa biết => 0", 1, "IPv6"),
    ("SZ-BACKUP", "Backup dữ liệu định kỳ - Tự động sao lưu toàn bộ dữ liệu theo lịch trình cố định, đảm bảo an toàn và khôi phục nhanh chóng khi xảy ra sự cố", "Gói/tháng", 40000, "", 1, "Backup"),
    ("SZ-SNAPSHOT", "Snapshot (Chụp nhanh hệ thống) - Lưu lại trạng thái toàn bộ máy chủ tại một thời điểm, cho phép khôi phục tức thì khi cần thiết", "Gói/tháng", 20000, "dịch vụ này chưa biết => 0", 1, "Snapshot"),
    ("SZ-OSWIN", "Bản quyền Hệ điều hành Windows Server - Cấp phép sử dụng hợp pháp, được nhà sản xuất cập nhật bảo mật thường xuyên", "Gói/tháng", 0, "dịch vụ này chưa biết => 0", 1, "Windows Server"),
    ("SZ-CPANEL", "Control Panel (cPanel/DirectAdmin/Plesk) - Giao diện quản trị trực quan, dễ dùng thao tác quản lý website, email, cơ sở dữ liệu mà không cần dòng lệnh", "Gói/tháng", 0, "dịch vụ này chưa biết => 0", 1, "Control Panel"),
    ("SZ-SSL", "Chứng chỉ SSL - Mã hóa toàn bộ dữ liệu truyền tải giữa máy chủ và người dùng, tăng độ tin cậy, bảo mật và thứ hạng SEO cho website", "Gói/năm", 0, "dịch vụ này chưa biết => 0", 1, "SSL"),
    ("SZ-FW", "Firewall / Anti-DDoS - Tường lửa và hệ thống chống tấn công từ chối dịch vụ, tự động phát hiện và ngăn chặn lưu lượng truy cập độc hại", "Gói/tháng", 0, "dịch vụ này chưa biết => 0", 1, "Firewall"),
    ("SZ-MONITOR", "Giám sát hệ thống (Monitoring 24/7) - Theo dõi liên tục tài nguyên CPU/RAM/Disk/Network và cảnh báo sớm khi phát sinh sự cố bất thường", "Gói/tháng", 20000, "dịch vụ này chưa biết => 0", 1, "Monitoring"),
    ("SZ-SUPPORT", "Hỗ trợ kỹ thuật ưu tiên / Quản trị máy chủ trọn gói - Đội ngũ kỹ thuật hỗ trợ 24/7 qua Ticket/Hotline, thay khách hàng vận hành và xử lý sự cố hệ thống", "Gói/tháng", 500000, "dịch vụ này chưa biết => 0", 1, "Support"),
    ("SZ-EMAIL", "Email doanh nghiệp bổ sung - Hộp thư điện tử theo tên miền riêng của công ty, tăng độ uy tín thương hiệu và hạn chế rơi vào spam", "Email/tháng", 0, "dịch vụ này chưa biết => 0", 1, "Email"),
    ("SZ-DOMAIN", "Tên miền (Domain) - Chi phí đăng ký/duy trì tên miền riêng cho website hoặc hệ thống của doanh nghiệp", "Tên miền/năm", 0, "dịch vụ này chưa biết => 0", 1, "Domain"),
    ("SZ-LB", "Load Balancer - Cân bằng tải lưu lượng truy cập giữa nhiều máy chủ, tăng khả năng chịu tải và độ ổn định cho hệ thống quy mô lớn", "Gói/tháng", 0, "dịch vụ này chưa biết => 0", 1, "Load Balancer"),
    ("SZ-SETUP", "Phí khởi tạo / cài đặt dịch vụ", "Lần", 50000, "", 1, "lần phí khởi tạo"),
]

# (component_sku, quantity)
BUNDLE_COMPONENTS = [
    ("SZ-CPU", 4),
    ("SZ-RAM", 1),
    ("SZ-NVME", 1),
    ("SZ-IPPUB", 1),
    ("SZ-BACKUP", 1),
    ("SZ-SETUP", 1),
]

BUNDLE_SKU = "SZ-VPS"
BUNDLE_PRICE_VND = 235000  # = 40.000 (CPU) + 15.000 (RAM) + 30.000 (NVMe) + 60.000 (IPPub) + 40.000 (Backup) + 50.000 (Setup)


def _find_by_sku(client, sku: str) -> dict | None:
    result = client.table("service_catalog_items").select("*").eq("sku", sku).limit(1).execute()
    return result.data[0] if result.data else None


def _upsert_item(client, payload: dict) -> dict:
    existing = _find_by_sku(client, payload["sku"])
    if existing:
        client.table("service_catalog_items").update(payload).eq("id", existing["id"]).execute()
        print(f"UPDATED: {payload['sku']} -> {existing['id']} ({payload['name']})")
        return {**existing, **payload}
    result = client.table("service_catalog_items").insert(payload).execute()
    row = result.data[0]
    print(f"CREATED: {payload['sku']} -> {row['id']} ({payload['name']})")
    return row


def main() -> int:
    client = get_supabase_client()

    group = _upsert_item(client, {
        "item_type": "group",
        "parent_id": None,
        "sku": GROUP_SKU,
        "name": "VPS Hosting",
        "status": "active",
        "sort_order": 0,
    })

    component_ids_by_sku: dict[str, str] = {}
    for index, (sku, name, unit, price, note, spec_qty, spec_label) in enumerate(COMPONENTS):
        row = _upsert_item(client, {
            "item_type": "component",
            "parent_id": group["id"],
            "sku": sku,
            "name": name,
            "unit": unit,
            "default_unit_price_vnd": price,
            "note": note or None,
            "spec_quantity_per_unit": spec_qty,
            "spec_unit_label": spec_label,
            "status": "active",
            "sort_order": index,
        })
        component_ids_by_sku[sku] = row["id"]

    bundle = _upsert_item(client, {
        "item_type": "bundle",
        "parent_id": group["id"],
        "sku": BUNDLE_SKU,
        "name": "SZ-VPS",
        "unit": "Gói",
        "default_unit_price_vnd": BUNDLE_PRICE_VND,
        "status": "active",
        "sort_order": len(COMPONENTS),
    })

    client.table("service_catalog_bundle_items").delete().eq("bundle_id", bundle["id"]).execute()
    for index, (component_sku, quantity) in enumerate(BUNDLE_COMPONENTS):
        client.table("service_catalog_bundle_items").insert({
            "bundle_id": bundle["id"],
            "component_id": component_ids_by_sku[component_sku],
            "quantity": quantity,
            "sort_order": index,
        }).execute()
    print(f"BUNDLE COMPONENTS SET: {BUNDLE_SKU} -> {len(BUNDLE_COMPONENTS)} thành phần")

    return 0


if __name__ == "__main__":
    sys.exit(main())
