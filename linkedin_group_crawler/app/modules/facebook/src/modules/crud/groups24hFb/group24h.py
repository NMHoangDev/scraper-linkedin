import datetime

from app.modules.facebook.src.core.config.database import supabase
# Thay "facebook_groups" bằng tên bảng chính xác của bạn trên Supabase
TABLE_NAME = "facebook_groups" 

# ==========================================
# 1. READ: Lấy danh sách (Có thể thêm phân trang, filter sau)
# ==========================================
def get_all_groupsFB_24h():
    # Sắp xếp theo ngày crawl gần nhất giảm dần
    current_date = datetime.now().strftime("%Y-%m-%d")
    response = (
        supabase.table(TABLE_NAME)
        .select("*")
        .eq("chay_24h", "TRUE")
        .not_is_null("end_time_24h")         # Bỏ qua nếu end_time_24h là NULL
        .gt("end_time_24h", current_date)    # Điều kiện: end_time_24h > ngày hiện tại
        .order("last_crawl", desc=True)
        .execute()
    )
    print(f"DEBUG: Response từ Supabase khi lấy groups: {response}")
    return response.data


