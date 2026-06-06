import asyncio

from typing import List, Dict, Tuple
from datetime import datetime

import uuid
from fastapi.concurrency import run_in_threadpool
from requests import delete
# Giả định import theo cấu trúc project của bạn
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_service import GroupManagementSheetService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_groups_24h import TargetGroupSheet24HService
from app.modules.facebook.src.modules.gg_sheet.services.google_sheets_intent_service import IntentSheetService
from app.modules.facebook.src.modules.gg_sheet.services.user_score_sheet_service import UserScoreSheetService
from app.modules.facebook.src.modules.gg_sheet.services.history_sheet_service import HistorySheetService
from app.modules.facebook.src.modules.gg_sheet.services.comment_sheet_service import CommentSheetService
from app.modules.facebook.src.modules.crud.groupsFb.groups import get_all_groupsFB, create_groupFB, update_groupFB, delete_groupFB
from app.modules.facebook.src.modules.crud.categories.categories import get_all_categoriesFB
from app.modules.facebook.src.modules.crud.kpi_fb.kpi_tracker import get_all_kpis
def format_time_and_status(last_crawl_str: str) -> Tuple[str, str]:
    """
    Tính toán khoảng cách thời gian từ lúc cào đến hiện tại.
    Trả về: (Relative_Time_String, Status)
    """
    if not last_crawl_str or last_crawl_str.strip() == "":
        return "Chưa cào", "DEAD"

    try:
        # Giả định dữ liệu trên Sheet lưu theo định dạng: YYYY-MM-DD HH:MM:SS
        crawl_time = datetime.strptime(last_crawl_str, "%Y-%m-%d %H:%M:%S")
        now = datetime.now()
        diff = now - crawl_time
        
        total_seconds = diff.total_seconds()

        # 1. Logic phân loại Status
        if total_seconds < 24 * 3600:
            status = "ACTIVE"
        elif total_seconds <= 3 * 24 * 3600:
            status = "IDLE"
        else:
            status = "DEAD"

        # 2. Logic chuyển đổi thời gian sang dạng chuỗi tương đối
        if total_seconds < 60:
            relative_time = "Vừa xong"
        elif total_seconds < 3600:
            minutes = int(total_seconds // 60)
            relative_time = f"{minutes} phút trước"
        elif total_seconds < 24 * 3600:
            hours = int(total_seconds // 3600)
            relative_time = f"{hours} giờ trước"
        else:
            days = int(diff.days)
            relative_time = f"{days} ngày trước"

        return relative_time, status

    except ValueError:
        # Xử lý ngoại lệ nếu format ngày tháng trên Sheet bị sai
        return last_crawl_str, "DEAD"
class SheetManagementService:
    def __init__(self):
        self.group_sheet = GroupManagementSheetService()
        self.group_24h_sheet = TargetGroupSheet24HService()
        self.intent_sheet = IntentSheetService()
        self.user_score_sheet = UserScoreSheetService()
        self.history_sheet = HistorySheetService()
        self.comment_sheet = CommentSheetService()
    # ==========================================
    # LOGIC XỬ LÝ GROUP (TỔNG & 24H)
    # ==========================================
    async def get_all_groups(self) -> List[dict]:
        """Lấy toàn bộ dữ liệu Group từ supabase và bóc tách Status/Thời gian."""
        try:
            # 1. Lấy dữ liệu từ cả 2 bảng (Dùng to_thread để không block luồng FastAPI)
            raw_groups = await asyncio.to_thread(get_all_groupsFB)
            categories_dict = await asyncio.to_thread(get_all_categoriesFB)

            # 2. Tối ưu O(1): Biến List thành Dictionary để tra cứu siêu nhanh
            intent_map = {item["id"]: item for item in categories_dict.get("intents", [])}
            industry_map = {item["id"]: item for item in categories_dict.get("industries", [])}
            tier_map = {item["id"]: item for item in categories_dict.get("tiers", [])}
            team_map = {item["id"]: item for item in categories_dict.get("teams", [])}

            # 3. Duyệt qua từng group và mapping dữ liệu
            for group in raw_groups:
                # --- Xử lý thời gian ---
                last_crawl_raw = group.get("last_crawl")
                
                relative_time, status = format_time_and_status(last_crawl_raw)
                group["last_crawl"] = relative_time
                group["status"] = status
                group["date_crawl"] = last_crawl_raw
                

                # --- MAPPING DỮ LIỆU TỪ CATEGORIES ---
                
                # Lấy intent
                id_intent = group.get("id_intent")
                if id_intent and id_intent in intent_map:
                 
                    group["intent"] = intent_map[id_intent]["value"]

                else:
                    group["intent"] = None

                # Lấy industry
                id_industry = group.get("id_industry")
                if id_industry and id_industry in industry_map:
                    
                    group["industry"] = industry_map[id_industry]["value"]
                else:
                    
                    group["industry"] = None
                    
                # Lấy tier
                id_tier = group.get("id_tier")
                if id_tier and id_tier in tier_map:
                    group["tier"] = tier_map[id_tier]["value"]
                else:
                    group["tier"] = None

                # Lấy team
                id_team = group.get("id_team")
                if id_team and id_team in team_map:
                    group["team"] = team_map[id_team]["value"]
                    
                else:
                    group["team"] = None
                id_icp = group.get("id_icp")
                if id_icp and id_icp in team_map:
                    group["icp"] = team_map[id_icp]["value"]
                else:
                    group["icp"] = None

                
                
                group.pop("id_industry", None)
                group.pop("id_tier", None)
                group.pop("id_team", None)
                group.pop("id_icp", None)
            
            return raw_groups

        except Exception as e:
            print(f"Lỗi mapping data: {e}")
            return []

       
    
        
    
    async def bulk_add_groups(self, groups_data: List[Dict]):
        """Phân loại và lưu Group vào các supabase tương ứng chạy song song."""
        print(f"DEBUG: Dữ liệu groups nhận vào Service để thêm: {groups_data}")
        try:
            tasks = []
            
            # 1. Lấy dữ liệu danh mục từ Supabase
            categories_dict = await asyncio.to_thread(get_all_categoriesFB)
            
            # 2. Tạo các Map tra cứu ngược: { "value": "id" }
            # Ép kiểu str() cho key để tránh lỗi so sánh int (vd tier=1) và chuỗi "1"
            intents_map = {str(item["value"]): item["id"] for item in categories_dict.get("intents", [])}
            industries_map = {str(item["value"]): item["id"] for item in categories_dict.get("industries", [])}
            tiers_map = {str(item["value"]): item["id"] for item in categories_dict.get("tiers", [])}
            teams_map = {str(item["value"]): item["id"] for item in categories_dict.get("teams", [])}
            icp_map = {str(item["value"]): item["id"] for item in categories_dict.get("icp", [])}

            # 3. Gắn ID và Mapping cho từng group
            for group in groups_data:
                group["id"] = str(uuid.uuid4())
                group["last_crawl"] = None # Gán thời gian cào hiện tại cho mỗi group mới thêm vào
                chay_24h = "TRUE" if group.get("chay_24h") is True else "FALSE"  # Mặc định khi thêm mới sẽ chưa chạy 24h
                group["chay_24h"] = chay_24h  # Mặc định khi thêm mới sẽ chưa chạy 24h
                # Lấy value text từ payload gửi lên
                intent_val = group.get("intent")
                industry_val = group.get("industry")
                tier_val = group.get("tier")
                team_val = group.get("team")
                icp_val = group.get("icp")
                
                # Ánh xạ lấy ID (Nếu có giá trị thì tìm trong map, không có thì set None)
                group["id_intent"] = intents_map.get(str(intent_val)) if intent_val is not None else None
                group["id_industry"] = industries_map.get(str(industry_val)) if industry_val is not None else None
                group["id_tier"] = tiers_map.get(str(tier_val)) if tier_val is not None else None
                group["id_team"] = teams_map.get(str(team_val)) if team_val is not None else None
                group["id_icp"] = icp_map.get(str(icp_val)) if icp_val is not None else None

                # 4. Dọn dẹp dữ liệu (Tùy chọn nhưng RẤT QUAN TRỌNG)
                # Supabase sẽ báo lỗi nếu bạn đẩy lên các cột không tồn tại trong bảng.
                # Xóa các key text cũ đi, chỉ giữ lại các cột id_ khóa ngoại.
                group.pop("intent", None)
                group.pop("industry", None)
                group.pop("tier", None)
                group.pop("team", None)
                group.pop("icp", None)
                group.pop("icp_desc", None) 
                 # Trường này chỉ dùng để hiển thị trên FE, không cần lưu vào DB
                group.pop("date_crawl", None)  
                # Nếu bảng Supabase của bạn không có cột này, hãy xóa dòng này đi. Còn nếu có, giữ lại và đảm bảo dữ liệu đúng định dạng (vd: "TRUE"/"FALSE" hoặc boolean True/False)
                
                # 💡 Mẹo nhỏ: Dữ liệu debug gửi lên là 'link_group', nhưng bảng của bạn có thể là 'group_url'. 
                # Nếu sai tên, bạn đổi tên key ở đây:
                if "link_group" in group:
                    group["group_url"] = group.pop("link_group")

                tasks.append(group)
                
            await asyncio.to_thread(create_groupFB, tasks[0])
            
            # Chèn code gọi hàm Supabase insert multiple rows (tasks) ở đây
            # Ví dụ: await asyncio.to_thread(create_multiple_groupsFB, tasks)
            
            return True
            
        except Exception as e:        
            print(f"Lỗi khi bulk_add_groups: {e}")
            return False
        
    

    async def bulk_delete_groups(self, urls: List[str]):
        """Xóa Group trên cả 2 Sheet chạy song song."""
        tasks = [
            asyncio.to_thread(self.group_sheet.delete_multiple_groups, urls),
            asyncio.to_thread(self.group_24h_sheet.delete_multiple_groups, urls)
        ]
        await asyncio.gather(*tasks)
        return True

    # ==========================================
    # LOGIC XỬ LÝ INTENT
    # ==========================================
    async def bulk_add_intents(self, intents_data: List[Dict]):
        """Thêm hàng loạt Intent vào Sheet."""
        return await asyncio.to_thread(self.intent_sheet.add_multiple_intents, intents_data)

    async def bulk_delete_intents(self, intents: List[str]):
        """Xóa hàng loạt Intent khỏi Sheet."""
        return await asyncio.to_thread(self.intent_sheet.delete_multiple_intents, intents)
    async def get_all_intents(self) -> List[dict]:
        """Lấy toàn bộ dữ liệu Intents từ supabase."""
        # YÊU CẦU: Trong class IntentSheetService phải có hàm get_all_intents()
        try:
            categories_dict = await asyncio.to_thread(get_all_categoriesFB)
            intents =  categories_dict.get("intents", [])
            for intent in intents:
                intent.pop("id", None)  # Xóa trường 'id' nếu không cần thiết cho FE
            return intents
        except Exception as e:
            print(f"Lỗi khi lấy Intents từ supabase: {e}")
            return []
    async def get_all_user_scores(self) -> List[dict]:
        """Lấy toàn bộ dữ liệu User Scores từ supabase."""
        # Gọi hàm đồng bộ get_all_user_scores trong luồng background
        
        try:
            user_scores = await asyncio.to_thread(get_all_kpis)  # Giả sử có hàm get_all_user_scores() trong UserScoreSheetService
            result = []
            for user in user_scores:
                # Trích xuất object member_info an toàn (tránh lỗi NoneType)
                member_info = user.get("member_info") or {}
    
                result.append({
                    "id": user.get("id"),
                    "name": member_info.get("name", "Unknown"), # Chui vào member_info để lấy name
                    "scorePerWeek": user.get("kpi_per_week", 0) # Map đúng trường kpi_per_week sang scorePerWeek cho FE
                })
            return result
        except Exception as e:
            print(f"Lỗi khi lấy User Scores từ supabase: {e}")
            return []
    async def check_comment_within_24h(self, url_post: str, comment_id: str) -> bool:
        """
        Kiểm tra xem comment (dựa theo url_post và id) đã tồn tại trong vòng 24h qua hay chưa.
        Hàm này chạy bất đồng bộ (async) để không block luồng chính.
        
        - Trả về True: Nếu CHƯA tồn tại, hoặc đã tồn tại nhưng CŨ HƠN 24h.
        - Trả về False: Nếu ĐÃ tồn tại TRONG VÒNG 24h qua.
        """
        return await asyncio.to_thread(
            self.comment_sheet.check_comment_new_within_24h, 
            url_post, 
            comment_id
        )
    async def bulk_add_comments(self, comments_data: List[Dict]) -> bool:
        """
        Thêm hàng loạt Comments vào Google Sheet (chạy bất đồng bộ).
        
        Args:
            comments_data (List[Dict]): Danh sách các từ điển chứa thông tin bình luận/tương tác.
                Cấu trúc dự kiến của mỗi từ điển (Dict) bao gồm:
                [
                    {
                        "id": "123456789",          # (Bắt buộc) ID duy nhất của comment/tương tác để chống trùng lặp
                        "url_post": "https/...",    # (Bắt buộc) Đường dẫn URL của bài viết
                        "name": "Nguyễn Văn A",     # (Bắt buộc) Tên người dùng tương tác/bình luận
                        "like": "LIKE",               # (Tùy chọn) loại cảm xúc (VD: "LIKE", "HAHA", "LOVE", "WOW", "SAD", "ANGRY")
                        "comment": "Nội dung..."    # (Tùy chọn) Nội dung bình luận hoặc loại cảm xúc (VD: "LIKE", "HAHA")
                    },
                    ...
                ]
                * Lưu ý: Không cần truyền key thời gian, hệ thống sẽ tự động lấy thời gian lúc ghi vào Sheet.

        Returns:
            bool: True nếu thêm thành công (có dòng mới được chèn), False nếu trống hoặc lỗi.
        """
        if not comments_data:
            return False
            
        return await asyncio.to_thread(
            self.comment_sheet.add_multiple_comments, 
            comments_data
        )
    async def bulk_process_comments_and_scores(self, comments_data: List[Dict]) -> tuple[bool, bool]:
        """
        Thực thi SONG SONG 2 tác vụ từ một nguồn dữ liệu duy nhất: 
        1. Ghi danh sách Comments vào Sheet Comments.
        2. Lấy trực tiếp 'id' và 'name' từ comments để cộng điểm vào Sheet User_Scores.
        
        Args:
            comments_data (List[Dict]): Danh sách dữ liệu tương tác lấy về từ crawler.
                Cấu trúc chi tiết của mỗi object:
                [
                    {
                        "id": "1000123456789",      # (Bắt buộc) Dùng làm ID check trùng lặp (Sheet Comments) VÀ định danh User (Sheet Scores)
                        "name": "Nguyễn Văn A",     # (Bắt buộc) Tên hiển thị dùng chung cho cả 2 Sheet
                        "url_post": "https/...",    # (Dành cho Sheet Comments) Link bài viết
                        "like": "5",                # (Dành cho Sheet Comments) Số lượng tương tác của comment
                        "comment": "Tuyệt vời",     # (Dành cho Sheet Comments) Nội dung bình luận
                        
                    },
                    ...
                ]
                
        Returns:
            tuple[bool, bool]: Kết quả của (Comments_Success, Scores_Success)
        """
        if not comments_data:
            return False, False

        # 1. Bóc tách dữ liệu User_Scores từ Comments_Data (Dùng chung luôn 'id' và 'name')
        users_data = []
        for cmt in comments_data:
            uid = str(cmt.get("id", "")).strip()
            name = str(cmt.get("name", "")).strip()
            
            # Chỉ đưa vào danh sách cộng điểm nếu có tồn tại ID
            if uid:
                users_data.append({
                    "id": uid,
                    "name": name,
                    "score_to_add": int(cmt.get("score_to_add", 1)) # Mặc định cộng 1 điểm nếu không truyền
                })

        # 2. Khởi tạo danh sách các Task cần chạy đồng thời
        tasks = [
            run_in_threadpool(self.comment_sheet.add_multiple_comments, comments_data)
        ]
        
        # Task 2: Cập nhật điểm
        if users_data:
            tasks.append(
                run_in_threadpool(self.user_score_sheet.bulk_update_scores, users_data)
            )
        else:
            # Task ảo nếu mảng users_data trống (chỉ xảy ra khi toàn bộ comments gửi lên đều không có 'id')
            async def empty_task(): return False
            tasks.append(empty_task())

        # 3. Thực thi song song
        results = await asyncio.gather(*tasks)
        
        return results[0], results[1]