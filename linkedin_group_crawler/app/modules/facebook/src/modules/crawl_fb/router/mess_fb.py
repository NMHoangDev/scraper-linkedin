import requests
import json
import time

# Điền Page Access Token của bạn
PAGE_ACCESS_TOKEN = "ĐIỀN_PAGE_ACCESS_TOKEN_CỦA_BẠN_VÀO_ĐÂY"
BASE_URL = "https://graph.facebook.com/v19.0"

def get_conversations():
    """
    Hàm lấy danh sách các ID hội thoại (đoạn chat) của Fanpage
    """
    print("--- ĐANG LẤY DANH SÁCH HỘI THOẠI ---")
    url = f"{BASE_URL}/me/conversations"
    params = {
        "access_token": PAGE_ACCESS_TOKEN,
        "limit": 10  # Lấy trước 10 hội thoại gần nhất (có thể tăng lên tối đa 100)
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    conversation_ids = []
    if "data" in data:
        for conv in data["data"]:
            conversation_ids.append(conv["id"])
            print(f"Đã tìm thấy Hội thoại ID: {conv['id']}")
    else:
        print("Lỗi hoặc không có hội thoại:", data)
        
    return conversation_ids

def get_messages_from_conversation(conversation_id):
    """
    Hàm lấy chi tiết từng bong bóng tin nhắn trong 1 hội thoại
    """
    print(f"\n--- ĐANG LẤY TIN NHẮN TỪ HỘI THOẠI {conversation_id} ---")
    
    # Chỉ định rõ các trường (fields) dữ liệu muốn Meta trả về
    fields = "messages{id,message,created_time,from,to,attachments}"
    url = f"{BASE_URL}/{conversation_id}"
    params = {
        "fields": fields,
        "access_token": PAGE_ACCESS_TOKEN
    }
    
    response = requests.get(url, params=params)
    data = response.json()
    
    if "messages" in data:
        messages_list = data["messages"]["data"]
        
        # Meta trả về tin nhắn mới nhất trước, ta cần đảo ngược lại để hiển thị từ cũ -> mới như UI FB
        messages_list.reverse() 
        
        for msg in messages_list:
            sender = msg.get("from", {}).get("name", "Unknown")
            text = msg.get("message", "[Không có nội dung văn bản / Có thể là Sticker/Ảnh]")
            time_sent = msg.get("created_time", "")
            
            # Nếu có file đính kèm (ảnh, video)
            attachments = msg.get("attachments", {}).get("data", [])
            has_media = "[CÓ ĐÍNH KÈM]" if attachments else ""
            
            print(f"[{time_sent}] {sender}: {text} {has_media}")
            
            # Trong thực tế, bạn sẽ code lệnh INSERT dữ liệu này vào Database (MySQL/MongoDB) ở đây.
    else:
        print("Không có tin nhắn nào hoặc có lỗi:", data)

# === KỊCH BẢN CHẠY CHÍNH ===
if __name__ == "__main__":
    # Bước 1: Lấy danh sách ID các cuộc trò chuyện
    conv_ids = get_conversations()
    
    # Bước 2: Duyệt qua từng ID và kéo chi tiết tin nhắn về
    for c_id in conv_ids:
        get_messages_from_conversation(c_id)
        
        # CỰC KỲ QUAN TRỌNG: Nghỉ 1 giây trước khi gọi tiếp để tránh bị Meta khóa API (Rate Limit)
        time.sleep(1)