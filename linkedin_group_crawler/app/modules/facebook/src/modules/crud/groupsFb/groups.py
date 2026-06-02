from app.modules.facebook.src.core.config.database import supabase
from datetime import datetime
from typing import List, Dict, Any
# Thay "facebook_groups" bằng tên bảng chính xác của bạn trên Supabase
TABLE_NAME = "facebook_groups" 

# ==========================================
# 1. READ: Lấy danh sách (Có thể thêm phân trang, filter sau)
# ==========================================
def get_all_groupsFB():
    # Sắp xếp theo ngày crawl gần nhất giảm dần
    response = supabase.table(TABLE_NAME).select("*").order("last_crawl", desc=True).execute()
    print(f"DEBUG: Response từ Supabase khi lấy groups: {response}")
    return response.data

def get_group_by_idFB(group_id: str):
    response = supabase.table(TABLE_NAME).select("*").eq("id", group_id).execute()
    return response.data

# ==========================================
# 2. CREATE: Tạo mới một group
# ==========================================
def create_groupFB(group_data: dict):
    # group_data đã được validate bằng Pydantic GroupCreate ở Router
    response = supabase.table(TABLE_NAME).insert(group_data).execute()
    return response.data

# ==========================================
# 3. UPDATE: Cập nhật thông tin group
# ==========================================
def update_groupFB(group_id: str, group_data: dict):
    # Lọc bỏ các key mang giá trị None (để không ghi đè dữ liệu cũ bằng null)
    # Convert datetime sang ISO format (chuỗi) nếu có trường last_crawl để Supabase hiểu
    clean_data = {}
    for k, v in group_data.items():
        if v is not None:
            # Nếu value là datetime (vd trường last_crawl), cần parse ra string ISO 8601
            from datetime import datetime
            if isinstance(v, datetime):
                clean_data[k] = v.isoformat()
            else:
                clean_data[k] = v

    if not clean_data:
        return None # Không có gì để update

    response = supabase.table(TABLE_NAME).update(clean_data).eq("id", group_id).execute()
    return response.data

# ==========================================
# 4. DELETE: Xóa group theo ID (uuid)
# ==========================================
def delete_groupFB(group_id: str):
    response = supabase.table(TABLE_NAME).delete().eq("id", group_id).execute()
    return response.data

def update_groups_per_crawl(data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Cập nhật danh sách group:
    - Lấy health_score lớn nhất giữa DB và data truyền vào.
    - posts_per_week = posts_per_week (DB) + 1.
    - Cập nhật last_crawl.
    """
    if not data_list:
        return []

    # 1. Trích xuất tập hợp IDs để query (loại bỏ các item không có id)
    group_ids = [item.get("id") for item in data_list if item.get("id")]
    if not group_ids:
        return []

    # 2. Query 1 lần lấy toàn bộ dữ liệu hiện tại của các group này từ Database
    try:
        db_response = supabase.table(TABLE_NAME) \
            .select("id, health_score, posts_per_week") \
            .in_("id", group_ids) \
            .execute()
        
        # Chuyển list response thành dictionary {id: data} để tra cứu O(1)
        db_records = {row["id"]: row for row in db_response.data}
    except Exception as e:
        print(f"[Error] Lỗi khi fetch existing groups: {e}")
        return []

    updated_results = []

    # 3. Duyệt qua data truyền vào, áp dụng logic và gọi hàm update
    for item in data_list:
        group_id = item.get("id")
        
        # Bỏ qua nếu ID không tồn tại trong DB trả về
        if not group_id or group_id not in db_records:
            continue

        db_group = db_records[group_id]

        # --- XỬ LÝ LOGIC ---
        # 3.1. So sánh health_score (fallback về 0 nếu giá trị trong DB hoặc payload là None)
        current_health = db_group.get("health_score") or 0
        input_health = item.get("health_score") or 0
        new_health_score = max(current_health, input_health)

        # 3.2. Cộng dồn posts_per_week
        current_posts_per_week = db_group.get("posts_per_week") or 0
        new_posts_per_week = current_posts_per_week + 1

        # 3.3. Xây dựng payload để update
        update_payload = {
            "health_score": new_health_score,
            "posts_per_week": new_posts_per_week,
        }

        # 3.4. Xử lý last_crawl (chuyển datetime sang ISO string)
        last_crawl = item.get("last_crawl")
        if last_crawl:
            if isinstance(last_crawl, datetime):
                update_payload["last_crawl"] = last_crawl.isoformat()
            else:
                update_payload["last_crawl"] = last_crawl

        # 4. Thực thi Update cho từng group
        try:
            res = supabase.table(TABLE_NAME) \
                .update(update_payload) \
                .eq("id", group_id) \
                .execute()
            
            if res.data:
                updated_results.extend(res.data)
        except Exception as e:
            print(f"[Error] Cập nhật thất bại cho group {group_id}: {e}")

    return updated_results

def reset_all_posts_per_week() -> List[Dict[str, Any]]:
    """
    Cập nhật toàn bộ giá trị của cột posts_per_week về 0 cho tất cả các bản ghi trong bảng.
    """
    try:
        # Thực hiện update mà không kèm theo điều kiện lọc .eq() hay .in()
        response = supabase.table(TABLE_NAME) \
            .update({"posts_per_week": 0,"last_crawl": None,"health_score": 0}) \
            .execute()
        
        print(f"[Success] Đã reset posts_per_week về 0 cho {len(response.data)} bản ghi.")
        return response.data
        
    except Exception as e:
        print(f"[Error] Lỗi khi reset posts_per_week: {e}")
        return []