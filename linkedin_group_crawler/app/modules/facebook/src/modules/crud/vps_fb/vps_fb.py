from app.modules.facebook.src.core.config.database import supabase
from datetime import date, datetime
from app.modules.facebook.src.core.config.env import Config 
TABLE_VPS = "Vps_fb"
# ==========================================
# 1. READ: Lấy danh sách VPS
# ==========================================
def get_all_vps():
    response = supabase.table(TABLE_VPS).select("*").order("created_at", desc=True).execute()
    return response.data
def get_vps_by_id(vps_id: str):
    response = supabase.table(TABLE_VPS).select("*").eq("id", vps_id).execute()
    return response.data
# ==========================================
# 2. CREATE: Tạo mới một bản ghi VPS
# ==========================================
def create_vps(vps_data: dict):
    clean_data = {}
    for k, v in vps_data.items():
        # Xử lý an toàn cho cả kiểu datetime và date
        if isinstance(v, (datetime, date)):
            clean_data[k] = v.isoformat()
        else:
            clean_data[k] = v
    clean_data["status"] = "True" if vps_data.get("status", True) else "False"
    clean_data["update_at"] = datetime.utcnow().isoformat()
    clean_data["created_at"] = datetime.utcnow().isoformat()
    response = supabase.table(TABLE_VPS).insert(clean_data).execute()
    return response.data
# ==========================================
# 3. UPDATE: Cập nhật thông tin VPS
# ==========================================
def update_vps(vps_id: str, update_data: dict):
    clean_data = {}
    for k, v in update_data.items():
        # Xử lý an toàn cho cả kiểu datetime và date
        if isinstance(v, (datetime, date)):
            clean_data[k] = v.isoformat()
        else:
            clean_data[k] = v
    if "status" in update_data:
        clean_data["status"] = "True" if update_data["status"] else "False"
    clean_data["update_at"] = datetime.utcnow().isoformat()
    response = supabase.table(TABLE_VPS).update(clean_data).eq("id", vps_id).execute()
    return response.data
def get_http_main_vps_result():
    response = supabase.table(TABLE_VPS).select("*").eq("id", Config.ID_VPS).execute()
    http = response.data[0]["http"] if response.data else None
    if http:
        return f"{http}/facebook/api/v1/webhook/crawl-result"
    return None

def get_cookie_vps_default():

    response = supabase.table(TABLE_VPS).select("*").eq("id", Config.ID_VPS).execute()
    cookie=response.data[0]["cookie"] if response.data else None
    return cookie
    
def get_active_vps():
    response = supabase.table(TABLE_VPS).select("*").eq("status", "True").execute()
    data=[]
    for item in response.data:
        data_item={}
        data_item["http"] = f"{item['http']}/facebook/api/v1/internal/crawl-batch"
        data_item["id_intent"]=item["id_intent"]
        data_item["name"]=item["name"]
        data.append(data_item)
    return data
    