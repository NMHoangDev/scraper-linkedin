from app.modules.facebook.src.core.config.database import supabase
# Thay "facebook_groups" bằng tên bảng chính xác của bạn trên Supabase
TABLE_NAME = "default_account_fb" 
# ==========================================
# 1. READ: Lấy danh sách (Có thể thêm phân trang, filter sau
# ==========================================
def get_all_default_accountFB():
    # Sắp xếp theo ngày crawl gần nhất giảm dần
    response = supabase.table(TABLE_NAME).select("*").execute()
    print(f"DEBUG: Response từ Supabase khi lấy default_account: {response}")
    return response.data
