# Module Zalo độc lập (zalo-module)

Tách tính năng **chat Zalo** (đăng nhập qua Chrome Extension đọc cookie
`chat.zalo.me`, gửi/nhận tin real-time qua `zca-js`, nhắn cho người lạ/người
trong nhóm, 2 trang UI "Tài khoản Zalo" + "Inbox Zalo") ra khỏi app "seeding"
chính (`linkedin_group_crawler/` + `linkedin-crawler-ui/`) thành **1 module
chạy hoàn toàn độc lập** — backend riêng, frontend riêng, extension riêng,
`docker-compose` riêng.

Xem đầy đủ kiến trúc gốc + toàn bộ bug đã gặp/đã fix tại
`../docs/ZALO_CHAT_FEATURE_EXTRACTION_GUIDE.md` (tài liệu viết riêng cho việc
tách module này). File này chỉ nói về **module đã tách xong**.

## Vì sao tách bảng riêng (không dùng chung `zalo_*` với app gốc)

Module này dùng **chung 1 server Postgres self-host** với app seeding (tiện,
cùng hạ tầng), nhưng đọc/ghi vào **bảng hoàn toàn mới** (`zalo_module_*`,
không phải `zalo_*`) và **tài khoản Zalo hoàn toàn riêng** (đăng nhập lại từ
đầu qua extension của module này). Lý do: tính năng chat Zalo có 2 tiến trình
Node.js persistent (`zca_worker_pool`, `zca_persistent_listener`) giữ session
sống cho từng tài khoản — nếu module này và app gốc cùng quản lý 1 tài khoản
Zalo thật, 2 backend sẽ tranh nhau session đó, có thể làm rớt phiên đang chạy
thật trên app gốc. Tách bảng + tách tài khoản đảm bảo **module này không ảnh
hưởng gì tới Zalo đang chạy trên app gốc**, dù chạy trên cùng 1 server DB.

Vẫn dùng chung bảng `app_users` (đăng nhập) + `JWT_SECRET_KEY` — an toàn vì
không liên quan tới session Zalo, và cho phép SSO nhẹ (tài khoản đã có ở app
seeding đăng nhập được luôn ở đây).

Cũng dùng chung `teams`/`member_of_teams` (không tạo lại) cho tính năng "Tin
nhắn KPI" (member tick chia sẻ 1 conversation để leader xem/verify) —
`api/routes/inbox_share.py` + `services/supabase_inbox_share_service.py`.
Đây chính là cơ chế mà `ZaloInboxAdminShell.tsx` dùng để populate RBAC (không
phải bolt-on tách rời), nên vẫn giữ nguyên trong module.

## Cấu trúc

```
zalo-module/
├── backend/     FastAPI (Python) + Node.js 20 (zca-js) — auth + toàn bộ API Zalo
├── frontend/    Next.js — 2 trang: /all-platform/tai-khoan, /all-platform/zalo-inbox
├── extension/   Chrome Extension (Manifest V3) — đăng nhập bằng cookie chat.zalo.me
├── nginx/       nginx.conf — router: /api/ -> backend, / -> frontend, SSE riêng
├── docker-compose.yml
└── README.md    (file này)
```

Đã **bỏ** so với app gốc (không thuộc phạm vi "nhắn/nhận tin, nhắn người lạ,
extension login, 2 trang UI"): QR-login/Playwright, broadcast hàng loạt,
"Zalo Library" (lưu tin nhắn thư viện), Google Sheet integration. Chi tiết
xem `docs/ZALO_CHAT_FEATURE_EXTRACTION_GUIDE.md`.

## Chạy local (docker compose)

```bash
cd zalo-module
cp .env.example .env                              # build-arg + port router
cp backend/.env.example backend/.env               # điền SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/JWT_SECRET_KEY thật
docker compose up --build -d
```

Mở `http://localhost:18190` (hoặc port đặt trong `ZALO_MODULE_ROUTER_PORT`).
Đăng nhập bằng 1 tài khoản `app_users` đã có sẵn (cùng DB với app seeding).

**Đã verify thật** (không chỉ đọc code) trong phiên tách module này:
migration SQL chạy sạch + đúng logic RBAC/upsert/hard-delete trên Postgres
15 thật; `docker build` cả backend lẫn frontend thành công; `docker compose
up` cả 3 container lên khoẻ (`backend` healthcheck pass); gọi qua router
(`/`, `/auth/login`, `/api/all-platform/zalo/accounts`) đều trả đúng status;
Node 20 + `zca-js` cài đúng trong container; entrypoint tự chown
`/app/artifacts` (named volume mới luôn tạo quyền root — tránh đúng bug đã
gặp trên app gốc); frontend `next build`/`tsc --noEmit` sạch, đủ 5 trang
(`/`, `/all-platform/tai-khoan`, `/all-platform/zalo-inbox`,
`/all-platform/profile`, `/auth/login`, `/auth/register`).

**Cài Extension** (Load unpacked, chưa cần build zip):
1. Mở `chrome://extensions`, bật "Chế độ cho nhà phát triển".
2. "Tải tiện ích đã giải nén" → chọn thư mục `zalo-module/extension/`.
3. Trên trang "Tài khoản Zalo", bấm "Đăng nhập qua Extension" cho từng tài
   khoản — extension mở tab `chat.zalo.me`, đọc cookie, gửi về backend module
   này (mặc định `http://localhost:18190`, đổi qua popup extension nếu cần).

## BẮT BUỘC trước khi dùng thật: áp migration DB

`backend/migrations/001_zalo_module_schema.sql` tạo toàn bộ bảng
`zalo_module_*` + RPC (`fn_zalo_module_*`) + 2 unique index bắt buộc. **Chưa
tự áp được** lên `seeding.db.markeeai.com` từ máy dev này (không có kênh
SSH/DDL tự động, xem `docs/INFRASTRUCTURE.md` ở repo chính) — cần 1 trong 2
cách:
- Dán nguyên nội dung file vào Supabase Studio SQL Editor của server
  self-host, HOẶC
- SSH (cần VPN) vào host chạy container `supabase-db`, chạy:
  `docker exec -i -u postgres supabase-db psql -d postgres < backend/migrations/001_zalo_module_schema.sql`

An toàn chạy lại nhiều lần (mọi lệnh đều `IF NOT EXISTS`/`CREATE OR REPLACE`).
Trước khi migrate xong, module vẫn build/chạy được — chỉ các API cần DB sẽ
trả lỗi/rỗng cho tới khi áp migration.

Cũng cần tạo bucket Supabase Storage mới **`zalo-module-assets`** (khác
`zalo-assets` app gốc đang dùng) nếu dùng tính năng gửi/nhận ảnh.

## Deploy lên host riêng (khi cần, chưa làm ở phiên tách module này)

Theo đúng mẫu `crm-module/README.md` mục "Deploy lên host riêng": copy
nguyên thư mục `zalo-module/`, điền `.env`/`backend/.env` thật,
`docker compose up --build -d`, trỏ domain/reverse-proxy vào port router.
