from app.modules.facebook.src.core.config.database import supabase
from datetime import date

TABLE_SEEDING_KPI = "seeding_content_kpi"

# ==========================================
# 1. READ: Lấy danh sách nội dung seeding
# ==========================================
def get_all_seeding_kpis():
    response = supabase.table(TABLE_SEEDING_KPI).select("*").order("current_day", desc=True).execute()
    return response.data

def get_seeding_kpi_by_id(kpi_id: str):
    response = supabase.table(TABLE_SEEDING_KPI).select("*").eq("id", kpi_id).execute()
    return response.data

def get_seeding_kpis_by_member(member_id: str):
    # Lấy tất cả link seeding của một thành viên cụ thể
    response = supabase.table(TABLE_SEEDING_KPI).select("*").eq("id_member", member_id).order("current_day", desc=True).execute()
    return response.data

# ==========================================
# 2. CREATE: Lưu nội dung seeding mới
# ==========================================
def create_seeding_kpi(kpi_data: dict):
    clean_data = {}
    for k, v in kpi_data.items():
        # Xử lý kiểu date sang chuỗi cho Supabase
        if isinstance(v, date):
            clean_data[k] = v.isoformat()
        else:
            clean_data[k] = v

    response = supabase.table(TABLE_SEEDING_KPI).insert(clean_data).execute()
    return response.data

# ==========================================
# 3. UPDATE: Cập nhật nội dung seeding (vd: Đổi trạng thái verify thành 'yes')
# ==========================================
def update_seeding_kpi(kpi_id: str, kpi_data: dict):
    clean_data = {}
    for k, v in kpi_data.items():
        if v is not None:
            if isinstance(v, date):
                clean_data[k] = v.isoformat()
            else:
                clean_data[k] = v

    if not clean_data:
        return None

    response = supabase.table(TABLE_SEEDING_KPI).update(clean_data).eq("id", kpi_id).execute()
    return response.data

# ==========================================
# 4. DELETE: Xóa bản ghi
# ==========================================
def delete_seeding_kpi(kpi_id: str):
    response = supabase.table(TABLE_SEEDING_KPI).delete().eq("id", kpi_id).execute()
    return response.data