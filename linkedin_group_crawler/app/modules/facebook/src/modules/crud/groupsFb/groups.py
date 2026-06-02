from app.modules.facebook.src.core.config.database import supabase
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