# FB Post Feed Crawler — Chrome Extension

## Tổng quan

Extension Chrome (Manifest V3) cào dữ liệu bài viết từ **Facebook Group** trong ngày. Chạy trực tiếp trên trình duyệt user — tận dụng cookie đã login, không cần server chạy browser.

## Kiến trúc

```
┌─────────────┐
│   Popup UI  │  ← Giao diện người dùng (nhấn nút, cấu hình, xem kết quả)
└──────┬──────┘
       │ chrome.runtime.sendMessage
       ▼
┌──────────────┐
│   Background │  ← Service Worker: điều phối, quản lý queue groups, redirect
└──────┬───────┘
       │ chrome.tabs.sendMessage
       ▼
┌──────────────┐
│ Content Script│  ← Chạy trong tab Facebook, bóc tách DOM
└──────────────┘
```

## Luồng hoạt động

1. User nhấn **"Bắt đầu cào"** ở popup
2. Popup → gửi lệnh cho Background Service Worker
3. Background → redirect tab tới group đầu tiên (nếu cần)
4. Background → gửi lệnh cho Content Script
5. Content Script → scroll, bóc tách bài viết từng post block
6. Content Script → gửi từng post về Background
7. Background → forward về Popup (hiển thị realtime)
8. Khi group done → Background tự redirect sang group tiếp theo
9. Khi hết groups → hiển thị kết quả, cho export JSON/CSV hoặc gửi API

## Cài đặt

### 1. Load extension vào Chrome

1. Mở Chrome → `chrome://extensions/`
2. Bật **Developer mode** (góc trên phải)
3. Click **Load unpacked** → chọn thư mục `post-feed-extension/`
4. Extension xuất hiện trên toolbar

### 2. Tạo icons (tùy chọn)

Tạo 3 file icon trong `icons/`:
- `icon16.png` (16×16 px)
- `icon48.png` (48×48 px)
- `icon128.png` (128×128 px)

Hoặc bỏ qua, dùng icon mặc định của Chrome.

### 3. Mở Facebook Group

Đảm bảo đã đăng nhập Facebook trên trình duyệt. Mở tab bất kỳ Facebook Group nào (VD: `https://www.facebook.com/groups/xyz`).

### 4. Sử dụng

1. Click icon extension trên toolbar
2. Popup hiển thị thông tin group hiện tại
3. Thêm groups vào hàng đợi (hoặc dùng group hiện tại)
4. Cấu hình:
   - **Số bài tối đa**: giới hạn bài viết cào
   - **Delay scroll**: thời gian nghỉ giữa 2 lần scroll
   - **Auto chuyển group**: bật → tự động redirect sang group tiếp theo
5. Nhấn **Bắt đầu cào**
6. Quan sát realtime: số bài, số scroll, log
7. Khi done → xuất JSON/CSV hoặc gửi API

## API Backend

Extension hỗ trợ gửi dữ liệu về backend qua HTTP POST. Endpoint mẫu:

```
POST /api/crawl-result
Content-Type: application/json

{
  "posts": [
    {
      "post_url": "https://www.facebook.com/groups/xxx/posts/yyy",
      "author_name": "Nguyễn Văn A",
      "author_url": "https://www.facebook.com/nguyen.van.a",
      "timestamp_raw": "14 giờ",
      "timestamp_class": "recent",
      "content": "Nội dung bài viết...",
      "reactions": 125,
      "comments": 23,
      "shares": 5,
      "images": ["https://scontent.fhanxxx/xxx.jpg"],
      "video_url": null,
      "group_url": "https://www.facebook.com/groups/xxx",
      "crawled_at": "2026-06-25T14:30:00.000Z"
    }
  ]
}
```

## Cấu hình API trong backend (FastAPI)

```python
# linkedin_group_crawler/app/modules/all_platform/router.py

@router.post("/api/crawl-result")
async def receive_crawl_result(request: Request):
    body = await request.json()
    posts = body.get("posts", [])

    for post in posts:
        # Lưu vào Supabase
        await supabase.table("fb_posts").insert({
            "post_url": post.get("post_url"),
            "author_name": post.get("author_name"),
            "content": post.get("content"),
            "reactions": post.get("reactions"),
            "comments": post.get("comments"),
            "shares": post.get("shares"),
            "images": post.get("images"),
            "video_url": post.get("video_url"),
            "group_url": post.get("group_url"),
            "crawled_at": post.get("crawled_at"),
        })

    return {"ok": True, "count": len(posts)}
```

## Selectors sử dụng

Extension dùng **đúng selectors** từ `post_extractor.py` đã kiểm chứng:

| Trường | Selector |
|--------|----------|
| Feed container | `div[role="feed"]` |
| Post blocks | `div[role="feed"] > div` |
| Content (chính) | `div[data-ad-comet-preview="message"]` |
| Content (fallback) | `div[dir="auto"]` |
| See more | `div[role="button"]:has-text("Xem thêm")` |
| Reactions/Comments/Shares | `[aria-label]` |
| Images | `img[src*=scontent]` |
| Video URL | `a[href*=videos]` |

## Điều kiện dừng

Extension dừng khi:
- Đạt số bài tối đa (`maxPosts`)
- 5 bài cũ liên tiếp (timestamp > 24h)
- Cuộn đến cuối trang (không còn content mới)
- User nhấn nút "Dừng lại"

## Cấu trúc file

```
post-feed-extension/
├── manifest.json          # Manifest V3 config
├── background/
│   └── background.js      # Service Worker điều phối
├── content/
│   ├── content.js         # Core DOM extraction
│   └── content.css        # (tùy chọn) CSS overlay
├── popup/
│   ├── popup.html         # Giao diện popup
│   ├── popup.css          # Styles
│   └── popup.js           # Logic popup ↔ background
├── icons/                 # Icon extension (16/48/128 px)
└── README.md              # File này
```

## Khắc phục lỗi thường gặp

### "Không tìm thấy feed"
→ Chưa đăng nhập Facebook. Đăng nhập và reload tab.

### "Cào được 0 bài"
→ Facebook đổi cấu trúc DOM. Kiểm tra lại selectors trong `content.js`.

### "Extension không phản hồi"
→ Reload extension ở `chrome://extensions/`, hoặc nhấn refresh.

### "Không chuyển được group"
→ Tab bị chặn redirect. Thử tắt extension chặn quảng cáo, hoặc dùng tab mới.
