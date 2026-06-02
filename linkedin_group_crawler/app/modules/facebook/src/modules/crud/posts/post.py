from app.modules.facebook.src.core.config.database import supabase
from datetime import datetime
from typing import List
from app.modules.facebook.src.modules.crud.categories.categories import get_all_categoriesFB
# Thay "facebook_posts" bằng tên bảng chính xác của bạn trên Supabase
TABLE_NAME = "facebook_posts" 

# ==========================================
# 1. READ: Lấy danh sách (Có thể thêm phân trang, filter sau)
# ==========================================
def get_all_postsFB():
    # Sắp xếp theo ngày tạo gần nhất giảm dần (hoặc bạn có thể đổi thành post_time)
    response = (
        supabase.table("facebook_posts")
        .select("*, facebook_groups(*)")
        .order("created_at", desc=True)
        .execute()
    )
   
    
    return response.data

def get_post_by_idFB(post_id: str):
    response = supabase.table(TABLE_NAME).select("*").eq("id", post_id).execute()
    return response.data

# ==========================================
# 2. CREATE: Tạo mới một post
# ==========================================
def create_postFB(post_data: dict):
    # Format các trường datetime sang chuỗi ISO 8601 trước khi insert để tránh lỗi kiểu dữ liệu
    # (Vì Pydantic ở Router có thể truyền xuống đối tượng datetime)
    

    response = supabase.table(TABLE_NAME).insert(post_data).execute()
    return response.data
# ==========================================
# 2. CREATE: Tạo mới nhiều post cùng lúc (dùng cho batch insert sau khi cào xong 1 loạt)
# ==========================================
def create_multiple_postsFB(posts_data: List[dict]):
    # Format các trường datetime sang chuỗi ISO 8601 trước khi insert để tránh lỗi kiểu dữ liệu
    print(f"DEBUG: Dữ liệu trước khi insert vào Supabase: {posts_data}")
    for post in posts_data:
        for date_field in ["created_at", "updated_at"]:
            if date_field in post and isinstance(post[date_field], datetime):
                post[date_field] = post[date_field].isoformat()

    response = supabase.table(TABLE_NAME).insert(posts_data).execute()
    print(f"DEBUG: Response từ Supabase sau khi insert posts: {response}")
    return response.data