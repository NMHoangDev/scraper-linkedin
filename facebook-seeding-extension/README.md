# Facebook Seeding KPI Checker - Chrome Extension

## Giới thiệu

Extension Chrome giúp kiểm tra và lưu KPI seeding comment trên Facebook một cách tự động.

## Tính năng

- ✅ Tự động click "Tất cả bình luận"
- ✅ Tự động scroll và load hết bình luận
- ✅ Tìm comment dựa trên **Profile ID** (chính xác nhất)
- ✅ Tìm comment dựa trên **Tên Facebook** (backup)
- ✅ UI overlay hiển thị tiến trình
- ✅ Tự động lưu KPI vào database khi tìm thấy comment
- ✅ Gửi kết quả về Dashboard qua postMessage

## Cài đặt

### 1. Tạo Icons

Tạo 3 file PNG icon trong thư mục `icons/`:

- `icon16.png` (16x16 px)
- `icon48.png` (48x48 px)
- `icon128.png` (128x128 px)

Hoặc chạy script sau để tạo icons tự động:

```bash
# Sử dụng Node.js
node create-icons.js
```

### 2. Cài đặt Extension trong Chrome

1. Mở Chrome, vào `chrome://extensions/`
2. Bật **Developer mode** (góc trên bên phải)
3. Click **Load unpacked**
4. Chọn thư mục `facebook-seeding-extension`

### 3. Cấu hình

1. Click vào icon extension trên thanh toolbar
2. Nhập **API Base URL** (mặc định: `http://localhost:8000`)
3. Nhập **API Key** nếu cần
4. Click **Lưu Cài Đặt**

## Cách sử dụng

### Trên Dashboard

1. Đăng nhập vào Dashboard
2. Nhấn nút **"Tính KPI"**
3. Nhập **Tên Facebook** và **Profile ID** của bạn
4. Nhấn **"Bắt đầu quét seeding"**

### Extension sẽ tự động:

1. Mở từng bài post Facebook trong cửa sổ mới
2. Tự động kiểm tra comment
3. Hiển thị tiến trình trên overlay
4. Lưu KPI nếu tìm thấy comment
5. Đóng cửa sổ và chuyển sang bài tiếp theo

## Cấu trúc file

```
facebook-seeding-extension/
├── manifest.json          # Cấu hình extension
├── background.js          # Service worker - xử lý API
├── content-script.js     # Script chạy trên Facebook
├── content-style.css     # Styles
├── popup.html            # Trang cài đặt popup
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## API Endpoints

Extension gọi các endpoint sau:

- `POST /api/linkedin/seeding-kpi/save` - Lưu KPI
- `POST /api/linkedin/seeding-kpi/get-all` - Lấy danh sách KPI

## Selector Facebook

Extension sử dụng các selector ổn định:

| Mục đích | Selector |
|----------|----------|
| Comment article | `[role="article"]` |
| Profile link | `a[href*="/user/"]` |
| Commenter name | `a[href*="/user/"] span[dir="auto"]` |
| View more | `[role="button"][tabindex="0"]` |

## Troubleshooting

### Popup bị chặn

Đảm bảo cho phép popup trên trình duyệt:
- Chrome: Settings → Privacy → Pop-ups → Allow

### Không tìm thấy comments

- Đảm bảo đã đăng nhập Facebook
- Kiểm tra Profile ID và Tên Facebook đã đúng chưa
- Thử scroll thủ công để load comments

### Lỗi API

- Kiểm tra API Base URL đã đúng chưa
- Kiểm tra API Key (nếu cần)
- Đảm bảo backend server đang chạy

## License

MIT
