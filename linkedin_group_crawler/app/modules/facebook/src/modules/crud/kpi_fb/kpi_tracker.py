from app.modules.facebook.src.core.config.database import supabase
from datetime import date, datetime

TABLE_KPI = "kpi_tracker"

# ==========================================
# 1. READ: Lấy danh sách KPI
# ==========================================
def get_all_kpis():
    query_string = """
        *,
        member_info:app_users!kpi_tracker_id_member_fkey(*)
    """
    
    response = supabase.table("kpi_tracker") \
        .select(query_string) \
        .eq("id_platform", 1) \
        .order("created_at", desc=True) \
        .execute()
    return response.data

def get_kpi_by_id(kpi_id: str):
    query_string = """
        *,
        member_info:app_users!fk_kpi_tracker_member(*)
    """
    response = supabase.table("kpi_tracker") \
        .select(query_string) \
        .eq("id", kpi_id) \
        .execute()
    return response.data

def get_kpis_by_member(member_id: str):
    # Lấy danh sách KPI của một thành viên cụ thể
    query_string = """
        *,
        member_info:app_users!fk_kpi_tracker_member(*)
    """
    response = supabase.table("kpi_tracker") \
        .select(query_string) \
        .eq("id_member", member_id) \
        .execute()
    return response.data

# ==========================================
# 2. CREATE: Tạo mới một bản ghi KPI
# ==========================================
def create_kpi(kpi_data: dict):
    clean_data = {}
    for k, v in kpi_data.items():
        # Xử lý an toàn cho cả kiểu datetime và date
        if isinstance(v, (datetime, date)):
            clean_data[k] = v.isoformat()
        else:
            clean_data[k] = v

    response = supabase.table(TABLE_KPI).insert(clean_data).execute()
    return response.data

# ==========================================
# 3. UPDATE: Cập nhật KPI
# ==========================================
def update_kpi(kpi_id: str, kpi_data: dict):
    clean_data = {}
    for k, v in kpi_data.items():
        if v is not None:
            if isinstance(v, (datetime, date)):
                clean_data[k] = v.isoformat()
            else:
                clean_data[k] = v

    if not clean_data:
        return None # Không có dữ liệu để update

    response = supabase.table(TABLE_KPI).update(clean_data).eq("id", kpi_id).execute()
    return response.data

# ==========================================
# 4. DELETE: Xóa KPI theo ID
# ==========================================
def delete_kpi(kpi_id: str):
    response = supabase.table(TABLE_KPI).delete().eq("id", kpi_id).execute()
    return response.data