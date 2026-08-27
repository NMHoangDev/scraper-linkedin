# Kiến trúc tính năng Chat Zalo — Tài liệu để copy sang dự án khác

> Viết ngày 2026-08-26, dựa trên toàn bộ code + kinh nghiệm debug thực tế của
> repo `scraper-linkedin` (đợt sửa lỗi 2026-08-25 → 08-26, xem thêm
> `docs/ZALO_FIX_PROGRESS_2026-08-25.md` để có đầy đủ log điều tra từng bug).
> Mục tiêu: đọc xong tài liệu này là biết chính xác **copy file nào, đặt ở
> đâu, chạy migration gì, và vì sao mọi thứ được thiết kế như vậy** — để dựng
> lại tính năng "1 hoặc nhiều tài khoản Zalo dùng chung, đăng nhập bằng cookie
> trình duyệt (không QR), gửi/nhận tin real-time" ở một dự án hoàn toàn khác.

## 0. Tóm tắt siêu ngắn

```
Chrome Extension (đọc cookie đã login sẵn trên chat.zalo.me)
        │  POST cookie + imei + userAgent
        ▼
Backend FastAPI  ──►  Node.js (zca-js, thư viện Zalo API không chính thức)
        │                     │
        │                     ├─ Worker pool persistent (gửi tin, list group...)
        │                     └─ Listener persistent (nhận tin real-time qua WebSocket)
        ▼
   Supabase (Postgres) — lưu account/hội thoại/tin nhắn
        │
        ▼
Frontend Next.js  ──►  SSE (Server-Sent Events) để cập nhật tin mới real-time
```

Không có bước "quét QR" nào bắt buộc trong luồng chính — người dùng chỉ cần
đã đăng nhập Zalo Web (chat.zalo.me) bình thường trên Chrome của họ, extension
tự đọc cookie ra và gửi cho backend.

---

## 1. Kiến trúc tổng thể

```
┌──────────────────────┐
│ Chrome Extension      │  (chạy trong trình duyệt của NHÂN VIÊN)
│ extension-login-zalo/ │
│  - mở tab chat.zalo.me│
│  - đọc cookie qua     │
│    chrome.cookies API │
│  - POST /import-session
└──────────┬────────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend FastAPI (Python) — linkedin_group_crawler/app/        │
│                                                                │
│  api/routes/*.py  (HTTP endpoints, mount prefix /zalo)         │
│         │                                                     │
│  services/zca_*.py (business logic, gọi Node qua subprocess)   │
│         │                                                     │
│         ├─► services/zca_worker_pool.py                       │
│         │       spawn scripts/zca_api_server.js (1 process    │
│         │       Node PERSISTENT / account — gửi tin, list      │
│         │       group, tìm user...)                            │
│         │                                                     │
│         └─► services/zca_persistent_listener.py                │
│                 spawn scripts/zca_persistent_listener.js       │
│                 (1 process Node PERSISTENT / account — mở      │
│                 WebSocket riêng, nhận tin real-time, tự lưu    │
│                 vào Supabase, KHÔNG qua HTTP request nào)       │
│                                                                │
│  services/supabase_service.py — mọi thao tác đọc/ghi Postgres  │
└──────────────────┬─────────────────────────────────────────────┘
                    │ REST (PostgREST)
                    ▼
┌──────────────────────────────┐        ┌───────────────────────────┐
│ Supabase (Postgres)           │        │ Frontend Next.js           │
│  zalo_accounts, zalo_groups,  │◄──────►│ linkedin-crawler-ui/       │
│  zalo_messages, ...           │  REST  │  components/all-platform/  │
└───────────────────────────────┘  + SSE │  zalo/**                   │
                                          └───────────────────────────┘
```

**2 process Node.js persistent riêng biệt cho mỗi tài khoản Zalo** là điểm
kiến trúc quan trọng nhất cần hiểu trước khi đọc code:

1. **Worker pool** (`zca_api_server.js`, quản lý bởi `zca_worker_pool.py`) —
   giữ 1 session `zca-js` sống để trả lời NHANH các lệnh chủ động (gửi tin,
   list group, tìm user...) mà không phải login lại từ đầu mỗi lần gọi.
2. **Persistent listener** (`zca_persistent_listener.js`, quản lý bởi
   `zca_persistent_listener.py`) — giữ 1 kết nối WebSocket sống để NHẬN tin
   nhắn mới real-time, tự lưu DB, không phụ thuộc HTTP request nào từ
   frontend.

Cả 2 đều dùng chung 1 file cookie (`artifacts/zca-auth/<account_id>.json`)
nhưng là **2 tiến trình Node độc lập, không chia sẻ state runtime** — đây là
lý do vì sao bug "key mismatch" (mục 7) chỉ ảnh hưởng 1 trong 2 mà không ảnh
hưởng cái còn lại, và vì sao phải nhớ đồng bộ logic khi sửa 1 trong 2 file.

---

## 2. Danh sách file cần copy

### 2.1 Backend Python — `linkedin_group_crawler/app/modules/all_platform/zalo/`

Copy **nguyên thư mục**. Các file quan trọng nhất (đọc trước khi đọc phần còn
lại):

| File | Vai trò |
|---|---|
| `services/zca_persistent_listener.py` | **Quan trọng nhất.** Khởi động/giám sát listener realtime, xử lý event tin nhắn mới, tự restart khi session hết hạn |
| `services/zca_worker_pool.py` | Quản lý pool worker Node persistent theo account |
| `services/zca_api_bridge.py` | Wrapper Python gọi Node (ưu tiên qua pool, fallback spawn riêng) |
| `services/zca_auth_store.py` | Lưu/đọc file cookie `artifacts/zca-auth/<id>.json` (tuỳ chọn mã hoá Fernet) |
| `services/supabase_service.py` | Toàn bộ hàm đọc/ghi Postgres (upsert group/message, list account...) |
| `api/routes/auth.py` | QR login (legacy) + **`POST /import-session`** (nhận cookie từ extension — endpoint quan trọng nhất) |
| `api/routes/conversations.py` | **File trung tâm nhất của API.** List hội thoại, gửi tin (`/send`, `/send-media`), tìm+nhắn user lạ (`/users/find`, `/users/threads`) |
| `api/routes/accounts.py` | CRUD tài khoản Zalo, RBAC theo role |
| `api/routes/listener.py` | `GET /listener/status` — debug trạng thái listener |
| `api/routes/events.py` | SSE stream đẩy tin nhắn mới ra frontend real-time |
| `api/security.py` | `verify_zalo_api_key` — auth bằng header `X-API-Key` |
| `config.py` | Toàn bộ `Settings`/env var riêng cho module Zalo |

Các file còn lại trong thư mục (đầy đủ, nên copy hết để không thiếu import):
`api/routes/broadcasts.py`, `api/routes/crawler.py`, `api/routes/groups.py`,
`api/routes/jobs.py`, `api/routes/library.py`, `api/routes/maintenance.py`,
`api/routes/inbox_share.py`, `api/proxy.py`,
`crawler/*.py` (legacy Playwright — **có thể bỏ nếu chỉ cần luồng ZCA hiện
đại**, không phải phần cốt lõi),
`schemas/*.py` (Pydantic models),
`services/zca_broadcast_sender.py`, `services/zca_qr_bridge.py`,
`services/supabase_inbox_share_service.py`, `services/message_events.py`,
`services/session_store.py`, `services/redis_session_store.py`,
`services/session_browser.py`, `services/browser_operation_lock.py`,
`services/worker_pool.py` (khác `zca_worker_pool.py` — dùng cho crawler
legacy), `services/job_store.py`, `services/job_events.py`,
`services/asset_cleanup_scheduler.py`, `services/debug_artifacts.py`,
`services/gsheet_service.py` (tuỳ chọn, ghi Google Sheet).

**Ngoài thư mục `zalo/` nhưng BẮT BUỘC cần copy/tái tạo:**

- `app/main.py` — 2 đoạn:
  - Dòng ~98-114: `_start_zca_listeners_background()` — tự động khởi động
    listener cho MỌI account đã có cookie khi backend boot lên (tắt bằng env
    `DISABLE_ZCA_LISTENERS=1`).
  - Dòng ~130-135: gọi `shutdown_persistent_listeners()` lúc app shutdown.
- `app/modules/all_platform/router.py` (dòng ~312-338) — import + mount 13
  router con của module zalo vào prefix `/zalo`.
- `app/modules/all_platform/auth_deps.py` — `get_authenticated_caller_email`,
  `get_current_user`: đọc JWT từ cookie `crawlpro_access_token`, TOÀN BỘ route
  Zalo phụ thuộc hàm này để biết ai đang gọi (RBAC). Dự án mới cần 1 hệ thống
  auth tương đương, hoặc viết lại 2 hàm này cho khớp cơ chế login riêng.

### 2.2 Node.js bridge scripts — `linkedin_group_crawler/scripts/`

Copy 4 file, đặt cùng thư mục `scripts/` cạnh code Python (Python spawn các
file này bằng đường dẫn tương đối `Path(__file__).resolve().parents[N] /
"scripts" / "..."`, xem `zca_api_bridge.py::zca_api_script_path()`):

| File | Vai trò |
|---|---|
| `zca_api_bridge.js` | Bridge 1-shot: mỗi lệnh spawn 1 process Node riêng biệt rồi thoát ngay. Dùng làm **fallback** khi worker pool lỗi. |
| `zca_api_server.js` | **Persistent JSON-Lines server** — 1 process Node sống lâu dài/account, nhận lệnh qua stdin, trả `{ok, response}` qua stdout. Đây là đường **ưu tiên** cho mọi lệnh chủ động (gửi tin, list group...). |
| `zca_persistent_listener.js` | Listener realtime độc lập — mở `api.listener` (WebSocket) của zca-js, in ra stdout mỗi dòng JSON khi có tin mới (`event: "message"`). |
| `zca_qr_login.js` | Quét QR đăng nhập thuần, không qua extension — **tuỳ chọn**, chỉ cần nếu vẫn muốn giữ luồng QR dự phòng. |

⚠️ **Cả 2 file `zca_api_bridge.js` và `zca_api_server.js` PHẢI trả về đúng
CÙNG 1 shape JSON cho cùng 1 lệnh** (ví dụ `send-message` phải luôn trả
`{ok: true, response: {...}}`, không được 1 file dùng `response` còn file
kia dùng `result`) — đây chính là bug gây lặp tin nhắn đã gặp thực tế (mục 7).
Nếu viết lại từ đầu, cân nhắc gộp 2 file thành 1 module dùng chung để tránh
lặp lại lỗi y hệt.

### 2.3 Vendor zca-js (bản đã vá tay) — `linkedin_group_crawler/vendor/zca-js/`

zca-js là thư viện Zalo API không chính thức (npm: `zca-js`). **Bản trên npm
registry (kể cả version mới nhất) thiếu 3 hàm** `getCMOld`, `getCMRecent`,
`getUserChatHistory` ở bản CommonJS (bản ESM có sẵn nhưng Node `require()`
không dùng được thẳng). Repo này đã copy 1 bản zca-js đã vá sẵn 3 hàm đó từ
1 dự án khác (`InvoiceFlowManager/services/zalo-bridge/zca-js`) vào
`vendor/zca-js/`.

**Cách copy sang dự án mới — 2 lựa chọn:**

- **Cách nhanh (đã dùng trong repo này):** copy nguyên thư mục
  `vendor/zca-js/` (560 file) sang dự án mới, giữ nguyên
  `package.json`'s dependency: `"zca-js": "file:vendor/zca-js"`.
- **Cách sạch hơn (khuyến nghị nếu có thời gian):** `npm install zca-js`
  bản mới nhất từ registry, rồi tự vá lại 3 hàm theo đúng pattern trong
  `vendor/zca-js/dist/cjs/apis.cjs` (wire `getCMOld`/`getCMRecent`/
  `getUserChatHistory` vào constructor class `API`) — tránh vendor cả 1 bản
  fork có thể đã lỗi thời.

⚠️ **Biết trước để khỏi mất công điều tra lại:** `getCMOld` là **stub rỗng cố
ý** (`reason: "CM_OLD_NOT_REVERSED"`) — không gọi Zalo thật. Và
`getUserChatHistory`/`getGroupChatHistory` (2 hàm lấy lịch sử tin nhắn CŨ,
dùng endpoint REST `/api/message/history` và `/api/group/history`) **đã bị
Zalo dừng phục vụ hoàn toàn** — gọi luôn trả 404 thật từ server Zalo, không
phải bug code. Tính đến 2026-08-26, **không có cách nào lấy lại lịch sử tin
nhắn cũ (trước lúc bot bắt đầu nghe) bằng zca-js** — chỉ nhận được tin
**real-time** (sau khi listener đã kết nối) qua `api.listener`, đường này
KHÔNG bị ảnh hưởng vì dùng WebSocket, không qua 2 endpoint chết trên. Nếu dự
án mới không cần backfill lịch sử cũ (giống yêu cầu gốc của session này) thì
không phải lo gì thêm.

### 2.4 Chrome Extension — `extensions/extension-login-zalo/`

Copy nguyên thư mục:

| File | Vai trò |
|---|---|
| `manifest.json` | Manifest V3. `host_permissions` cho `chat.zalo.me` + domain web app thật của dự án mới (**phải sửa domain trong `content_scripts.matches` và `externally_connectable`/whitelist trong `background.js`** khi đổi dự án). |
| `background.js` | Service worker chính: đọc cookie qua `chrome.cookies.getAll`, `importZaloSession()` (mở/tìm tab Zalo, chờ cookie xuất hiện tối đa ~50s để user kịp đăng nhập nếu chưa, POST `/import-session`, LUÔN tự đóng tab dù thành công hay lỗi), cache `imei` ổn định trong `chrome.storage.local`. |
| `zalo-content.js` | Content script chạy trên `chat.zalo.me`: đọc `document.cookie`, đoán `imei` từ `localStorage`, scrape DOM tin nhắn (dùng cho tính năng đồng bộ dự phòng qua DOM, không phải đường chính). |
| `page-bridge.js` | Content script chạy trên domain web app — relay `window.postMessage` (từ trang web) ↔ `chrome.runtime.sendMessage` (extension). Đây là cách web app "nói chuyện" được với extension mà không cần biết extension ID. |
| `popup.html`, `popup.js` | Popup đơn giản khi bấm icon extension. |

**Điểm thiết kế quan trọng cần giữ khi viết lại:**
- Backend `/import-session` **không yêu cầu cookie key cụ thể nào** ("lấy
  được bao nhiêu dùng bấy nhiêu") — nếu bắt buộc đúng tên cookie
  (`zpsid`/`zpw_sek`...) sẽ vỡ ngay khi Zalo đổi tên cookie (đã xảy ra thật,
  xem mục 7).
- Extension **luôn tự đóng tab** sau khi thử gửi cookie (dù backend chấp
  nhận hay từ chối) — không có điều kiện nào khiến tab bị "treo" mở mãi.
- `imei` gửi lên **phải ổn định** giữa các lần gọi cho cùng 1 account —
  Zalo coi cookie phiên là "session key" gắn với đúng 1 imei lúc phát hành,
  đổi imei mỗi lần sẽ luôn bị Zalo từ chối (xem mục 7).

### 2.5 Frontend — `linkedin-crawler-ui/`

| Nhóm | File |
|---|---|
| Trang quản lý tài khoản (`/all-platform/tai-khoan`) | `components/all-platform/zalo/dashboard/ZaloDashboardView.tsx`, `ZaloAccountsPageContent.tsx` |
| Trang inbox chính (`/all-platform/zalo-inbox`) | `components/all-platform/zalo/admin-inbox/ZaloInboxAdminShell.tsx` (**component lớn/quan trọng nhất frontend**), `ZaloAccountAuthView.tsx` (modal đăng nhập), `ZaloTeamAccountTree.tsx` |
| Modal nhắn người lạ | `components/all-platform/zalo/dashboard/ZaloNewChatModal.tsx` |
| Danh sách hội thoại ảo hoá | `components/all-platform/zalo/dashboard/sidebar/ZaloConversationListVirtualized.tsx` |
| UI phụ | `dashboard/ZaloKpiPanel.tsx`, `dashboard/InboxShareToggle.tsx`, `dashboard/chat/ZaloChatSkeleton.tsx`, `dashboard/chat/ZaloEmptyChat.tsx` |
| Hooks | `hooks/useZaloAdminInbox.ts` (dùng cho `ZaloInboxAdminShell`), `hooks/useZaloCrawlerFlow.ts` (dùng cho `ZaloDashboardView` — có cả luồng QR legacy) |
| Service gọi API | `services/zaloCrawlerService.ts` (toàn bộ hàm gọi REST backend), `services/zaloExtension.ts` (bridge `postMessage` gọi extension) |
| Type | `types/zalo-api.ts` |
| Pages Next.js | `app/(all-platform)/all-platform/tai-khoan/page.tsx`, `app/(all-platform)/all-platform/zalo-inbox/page.tsx` |
| Build extension zip | `scripts/build-extension-zips.mjs` (đóng gói `extensions/extension-login-zalo/` → `public/extension-login-zalo.zip` để nút "Tải extension" luôn phục vụ bản mới nhất) |

**Legacy, có thể bỏ qua nếu chỉ cần đúng luồng hiện đại (Extension + ZCA):**
`ZaloCrawlerPageContent.tsx`, `ZaloChatView.tsx` (trang `/zalo-crawl`,
`/zalo-chat` — không còn được liên kết từ sidebar sau khi dọn UI ngày
2026-08-25).

**KHÔNG liên quan Zalo (đừng nhầm copy):** `lib/markee-ext-provision.ts` là
cho 1 extension Facebook khác ("seeding-markee").

---

## 3. Luồng hoạt động chi tiết

### 3.1 Đăng nhập qua Extension

```
User bấm "Đăng nhập lại" trên web app
   │
   ▼
Frontend gọi importZaloSessionViaExtension() (services/zaloExtension.ts)
   │  window.postMessage({type: "IMPORT_ZALO_SESSION", ...}, "*")
   ▼
page-bridge.js (content script trên domain web app) nhận, forward
   │  chrome.runtime.sendMessage(...)
   ▼
background.js :: importZaloSession(data)
   1. getOrOpenZaloTab() — tìm tab chat.zalo.me đang mở, hoặc mở tab mới
   2. waitForAnyZaloCookies() — đọc cookie mỗi 2s, tối đa ~50s (đủ thời gian
      để user quét QR/đăng nhập nếu tab vừa mở chưa có session). Điều kiện
      dừng: có ÍT NHẤT 1 cookie zalo.me, KHÔNG yêu cầu tên cụ thể.
   3. getStableImei() — ưu tiên imei content-script tìm được trong
      localStorage Zalo; nếu không có, dùng giá trị đã cache trong
      chrome.storage.local; nếu chưa từng có, sinh 1 UUID và CACHE LẠI vĩnh
      viễn (không sinh mới mỗi lần).
   4. POST {backend}/api/all-platform/zalo/auth/import-session
      body: { account_id, cookies: [...], user_agent, imei }
   5. LUÔN đóng tab (finally block) — dù bước 4 thành công hay lỗi.
   ▼
Backend :: import_session_from_extension()  (auth.py)
   - Parse cookies (nhận mảng {key,value,domain,...}, không ép tên cụ thể)
   - imei: nếu request không gửi, thử load imei ĐÃ LƯU từ lần import trước
     cho account này (load_zca_auth) trước khi mới sinh UUID — giữ ổn định
   - save_zca_auth(user_id, auth) → ghi file artifacts/zca-auth/<id>.json
   - asyncio.create_task(_background_extension_sync):
       [1/2] first_time_sync — backfill vài tin gần nhất (THƯỜNG SẼ LỖI vì
             endpoint lịch sử cũ đã chết, xem mục 2.3 — không sao, có log
             warning rồi vẫn tiếp tục bước 2)
       [2/2] start_listener(user_id, auth, force_restart=True) — khởi động
             process Node persistent listener cho account này
   - Trả về 200 NGAY (không đợi background task xong)
```

### 3.2 Gửi tin nhắn

```
Frontend: POST /conversations/{conversation_id}/send  {text}
   │
   ▼
conversations.py :: send_message_to_conversation()
   1. check_caller_conversation_access() — RBAC: caller có quyền xem/gửi
      hội thoại này không (owner / admin / leader-được-share /
      is_shared_with_all)
   2. load_zca_auth(user_id) — lấy cookie đã lưu
   3. resolve_thread_type() — tự suy đoán group (1) hay cá nhân (0) từ
      conversation_id
   4. send_zca_message() → zca_api_bridge.py → ƯU TIÊN gọi qua worker pool
      (zca_api_server.js, đã có session Node sống sẵn) → fallback spawn
      riêng (zca_api_bridge.js) nếu pool lỗi
   5. _persist_outgoing_message() — lưu ngay 1 row vào zalo_messages với
      sender_name="Bạn", is_sent=true, ĐỂ HIỂN THỊ LIỀN không cần đợi
      listener echo về. source_message_id lấy từ msgId trong response gửi
      tin (nếu có) — QUAN TRỌNG: đây là msgId THẬT do Zalo cấp, phải trùng
      với msgId mà listener sẽ nhận được khi Zalo echo tin về, nếu không
      khớp → DB insert thành 2 row riêng biệt → hiển thị LẶP tin (bug đã gặp
      thật, xem mục 7).
```

### 3.3 Nhận tin real-time

```
zca_persistent_listener.js (1 process Node / account, chạy độc lập, KHÔNG
qua HTTP request nào)
   │
   │  api.listener.on("message", (msg) => { in ra stdout 1 dòng JSON })
   ▼
zca_persistent_listener.py đọc stdout của process con theo từng dòng
   │
   ▼
_handle_event() → normalize message → save_listener_messages()
   (supabase_service.py — upsert vào zalo_groups + zalo_messages qua RPC
   fn_bulk_save_zalo_messages, ON CONFLICT (user_id, group_id,
   source_message_id) để tránh trùng)
   │
   ▼
message_events.py — publish event vào in-memory event bus
   │
   ▼
api/routes/events.py :: stream_zalo_events() — SSE endpoint, mỗi client
frontend đang mở giữ 1 kết nối SSE, backend push event ngay khi có
   │
   ▼
Frontend nhận SSE → cập nhật UI real-time không cần refresh
```

### 3.4 Danh sách hội thoại + RBAC

- `GET /conversations?account_id=...` → ưu tiên gọi RPC
  `fn_get_zalo_conversations` (Postgres function) — RPC này tự check quyền
  theo: là chủ sở hữu (`owner_id`) HOẶC account đánh dấu
  `is_shared_with_all=true` HOẶC admin/leader đã được share riêng từng hội
  thoại qua `zalo_conversation_permissions`.
- Nếu RPC lỗi (không tồn tại/exception) → fallback code Python
  (`check_caller_conversation_access`) — **PHẢI giữ 2 đường này ĐỒNG BỘ
  logic RBAC**, vì đã từng xảy ra bug: RPC tồn tại nhưng lỗi thời (không biết
  cột `is_shared_with_all` mới thêm) mà KHÔNG throw exception (chỉ trả rỗng)
  → fallback không bao giờ được kích hoạt → tính năng "dùng chung" bị bỏ qua
  hoàn toàn ở đúng chỗ quan trọng nhất (xem mục 7).

### 3.5 Nhắn riêng cho người trong nhóm (không cần kết bạn)

Tính năng thêm ngày 2026-08-26: mỗi tin nhắn nhóm đã lưu sẵn `sender_id` (UID
Zalo thật của người gửi, lấy từ `data.uidFrom` khi listener nhận tin) +
`sender_name`. Bấm icon cạnh tên người gửi trong 1 tin nhắn nhóm sẽ:

1. Gọi `POST /conversations/users/threads` (`create_user_thread`) với
   `user_id = sender_id`, `display_name = sender_name` — **không cần tìm qua
   SĐT/username** vì đã biết sẵn người này từ chính tin nhắn nhóm.
2. Endpoint này `upsert_group(group_id=target_user_id, ...)` — tạo 1 hội
   thoại cá nhân mới trong `zalo_groups` với `group_id` = UID người đó (đúng
   convention: hội thoại cá nhân/DM có `group_id` = UID đối phương).
3. Frontend chuyển sang hội thoại vừa tạo, gửi tin bình thường qua
   `POST /conversations/{uid}/send` (tự nhận `thread_type=0` vì đây không
   phải group).

Endpoint gửi tin **không** kiểm tra đã kết bạn hay chưa — zca-js cho phép gửi
tin tới UID bất kỳ (Zalo coi như "tin nhắn làm quen", có giới hạn/rate-limit
riêng phía Zalo nếu người nhận đã tắt "nhận tin từ người lạ", lúc đó backend
sẽ nhận lỗi rõ ràng từ Zalo khi gọi `sendMessage`).

### 3.6 Broadcast hàng loạt

`api/routes/broadcasts.py` + `services/zca_broadcast_sender.py` — gửi cùng 1
tin tới nhiều hội thoại, có delay giữa các lần gửi
(`ZALO_BROADCAST_DELAY_SECONDS`) để tránh bị Zalo rate-limit/khoá tài khoản.
Không phải phần cốt lõi của "chat" — có thể bỏ qua nếu dự án mới không cần.

---

## 4. Database schema (Supabase/Postgres)

### 4.1 ⚠️ Cảnh báo quan trọng nhất của toàn bộ tài liệu này

**Các bảng GỐC (`zalo_accounts`, `zalo_groups`, `zalo_messages`,
`zalo_sessions`, `zalo_users`, `zalo_message_assets`) KHÔNG có migration nào
tạo ra trong repo** — chúng là "shadow tables", được tạo tay ngoài luồng
migration (qua Supabase Dashboard SQL Editor) từ rất lâu trước khi có nhiều
migration khác. Tương tự, RPC function `fn_get_zalo_conversations` gốc (bản
đầu tiên, trước khi bị migration `067` ghi đè) và 1 số object khác cũng có
thể là "shadow object" tạo tay.

**Nghĩa là:** copy sang dự án mới, migration trong `supabase/migrations/`
**không đủ để dựng lại schema từ đầu**. Phải:
1. Dump trực tiếp schema từ Supabase Cloud production hiện tại
   (`pg_dump --schema-only` hoặc qua Dashboard → Database → xem definition
   từng bảng/function), HOẶC
2. Tự viết `CREATE TABLE` mới dựa vào các cột mà code Python/SQL tham chiếu
   (liệt kê ở bảng dưới — đã suy ngược đủ dùng cho toàn bộ luồng chat).

### 4.2 Schema cần có (suy ngược từ code, đủ cho luồng chat)

```sql
CREATE TABLE public.zalo_accounts (
    account_id text PRIMARY KEY,
    owner_id text,
    id_member text,
    label text,
    phone text,
    status text DEFAULT 'unknown',
    zalo_id text,
    avatar_url text,
    is_active boolean DEFAULT true,
    is_shared_with_all boolean NOT NULL DEFAULT true, -- xem migration 066+068
    last_seen_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.zalo_groups (
    user_id text NOT NULL,
    group_id text NOT NULL,
    group_name text,
    avatar_url text,
    unread_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_friend boolean DEFAULT false,       -- migration 012
    last_message_at timestamptz,
    last_message_content text,
    last_sender_id text,
    last_sender_name text,
    last_message_type text,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, group_id)
    -- UNIQUE (user_id, group_id) bắt buộc cho ON CONFLICT — xem mục 4.4
);

CREATE TABLE public.zalo_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    group_id text,
    group_name text,
    source_message_id text,
    sender_id text,
    sender_name text,
    timestamp_text text,
    time_text text,
    type text NOT NULL DEFAULT 'text',
    content text,
    is_sent boolean NOT NULL DEFAULT false,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
    -- UNIQUE (user_id, group_id, source_message_id) bắt buộc — xem mục 4.4
);

CREATE TABLE public.zalo_message_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES public.zalo_messages(id) ON DELETE CASCADE, -- xem lưu ý dưới
    source_url text,
    storage_path text,
    storage_url text,
    status text NOT NULL DEFAULT 'pending',
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.zalo_conversation_permissions ( -- migration 003
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id text NOT NULL,
    conversation_id text NOT NULL,
    id_leader uuid,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
    -- + cột KPI verify, xem migration 004/005
);
```

⚠️ **Lưu ý FK `zalo_message_assets.message_id`:** bản gốc của repo này dùng
`ON DELETE SET NULL` nhưng cột `message_id` lại `NOT NULL` — tổ hợp này gây
lỗi `PermissionError`-style crash thật khi xoá 1 message có asset đính kèm
(`null value in column "message_id" violates not-null constraint`). Dự án
mới nên dùng `ON DELETE CASCADE` như viết ở trên để tránh lặp lại đúng bug
này.

`zalo_sessions`, `zalo_users` — 2 bảng phụ (lưu session/user tối giản để
tương thích ngược với code cũ), không bắt buộc cho luồng chat hiện đại nếu
viết lại từ đầu; grep `zalo_sessions`/`zalo_users` trong
`supabase_service.py` nếu cần biết chính xác cột nào đang dùng.

### 4.3 Migrations có sẵn (áp theo đúng thứ tự nếu copy nguyên)

| # | File | Nội dung |
|---|---|---|
| 003 | `003_zalo_conversation_permissions.sql` | Tạo bảng `zalo_conversation_permissions` |
| 004 | `004_zalo_inbox_share_kpi.sql` | Thêm cột KPI verify |
| 005 | `005_zalo_inbox_share_multi_leader.sql` | Hỗ trợ nhiều leader share |
| 012 | `012_zalo_groups_is_friend.sql` | Thêm cột `is_friend` |
| 013 | `013_zca_bulk_save_rpc.sql` | Tạo `fn_bulk_save_zalo_messages` (⚠️ có bug "trứng gà" tạo index trong body RPC — index không bao giờ được tạo trên DB tinh, xem mục 4.4) |
| 014 | `014_zca_extended_rpcs.sql` | Tạo `fn_get_zalo_conversations` (bản CŨ), `fn_get_zalo_conversation_messages`, `fn_hard_delete_zalo_account` |
| 015 | `015_update_bulk_save_rpc.sql` | Cập nhật lại `fn_bulk_save_zalo_messages` |
| 066 | `066_zalo_accounts_shared_with_all.sql` | Thêm cột `is_shared_with_all` (default false) |
| 067 | `067_fn_get_zalo_conversations_shared_with_all.sql` | Sửa RPC tôn trọng `is_shared_with_all` |
| 068 | `068_zalo_accounts_shared_default_true.sql` | Đổi default `is_shared_with_all` → true |

Tuỳ chọn (chỉ cần nếu copy cả dashboard KPI admin):
`019_admin_teams_kpi_add_zalo.sql`, `020_admin_teams_kpi_add_leader.sql`.

**Khuyến nghị cho dự án mới:** viết GỘP LẠI thành 1-2 migration sạch ngay từ
đầu với default `is_shared_with_all=true` luôn (bỏ qua lịch sử 066→068), và
sửa thẳng bug "trứng gà" ở 013 (tạo index TRƯỚC khi định nghĩa RPC, không
lồng trong body function).

### 4.4 Index bắt buộc — KHÔNG có trong migration nào, phải tự thêm

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_groups_uniq
  ON public.zalo_groups (user_id, group_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_messages_uniq
  ON public.zalo_messages (user_id, group_id, source_message_id);
```

Thiếu 2 index này → mọi lần `upsert` qua `ON CONFLICT (user_id, group_id
[, source_message_id])` sẽ lỗi **`42P10`** ÂM THẦM (không throw exception rõ
ràng lên tới log dễ thấy) → **danh sách hội thoại/tin nhắn trống hoàn toàn**
dù listener chạy đúng, cookie đúng, mọi thứ "trông như" hoạt động. Đây là 1
trong những bug khó phát hiện nhất đã gặp — luôn tạo 2 index này NGAY khi
setup DB mới, đừng đợi tới lúc gặp lỗi.

---

## 5. Cấu hình môi trường (`.env`)

Dùng chung với các module khác trong app (không phải riêng Zalo):
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=...
API_KEY=            # để RỖNG sẽ tắt hẳn check X-API-Key (verify_zalo_api_key) — chỉ nên rỗng ở local dev
```

Riêng module Zalo (đọc trong `config.py`, KHÔNG có sẵn trong `.env.example`
— phải tự thêm khi copy):
```
ZALO_ZCA_AUTH_STORE_DIR=artifacts/zca-auth   # nơi lưu cookie/imei mỗi account
ZALO_ZCA_STARTUP_SYNC_ENABLED=0              # để 0 — luồng backfill nó phục vụ đã chết (mục 2.3), bật lên chỉ tốn tài nguyên vô ích
ZALO_SESSION_TTL_HOURS=8
ZALO_DEBUG_ARTIFACTS_DIR=artifacts/debug
ZALO_CORS_ORIGINS=...
ZALO_BROADCAST_DELAY_SECONDS=...
ZALO_ASSET_RETENTION_DAYS=...
DISABLE_ZCA_LISTENERS=0                      # đặt 1 trên môi trường KHÔNG muốn tự động kết nối Zalo khi boot (vd 1 bản backend chạy dư/backup)
```

Extension (`chrome.storage.local`, cấu hình qua popup, KHÔNG phải file
`.env`): `backendUrl`, `apiKey`, `userId` — trỏ về đúng backend + API key của
dự án mới.

---

## 6. Docker / Deploy

### 6.1 Base image cần có cả Python lẫn Node.js

`Dockerfile` build trên nền `mcr.microsoft.com/playwright/python:...` (đã có
sẵn Python + Playwright/Chromium — cần cho luồng crawler legacy, có thể đổi
sang base Python thường nếu bỏ hẳn Playwright), rồi cài Node 20 qua
NodeSource:
```dockerfile
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs
```
**Không có bước `RUN npm install`** — image chỉ `COPY . .` nguyên trạng rồi
`chown -R pwuser:pwuser /app` + `USER pwuser` (chạy app KHÔNG phải root, best
practice bảo mật).

### 6.2 ⚠️ Gotcha #1: quyền ghi volume mount

`docker-compose.yml` mount 3 named volume vào container:
```yaml
volumes:
  - backend-storage:/app/storage
  - backend-data:/app/data
  - backend-artifacts:/app/artifacts   # ← chứa artifacts/zca-auth/*.json
```
Named volume Docker **mặc định tạo với quyền root** khi lần đầu được tạo,
NHƯNG app chạy bằng user `pwuser` (không phải root, theo `USER pwuser` ở
trên) → `save_zca_auth()` ghi file vào `/app/artifacts/zca-auth/` sẽ
**crash 500 `PermissionError`** cho tới khi ai đó chạy tay:
```bash
docker exec -u root <container> chown -R pwuser:pwuser /app/artifacts /app/data /app/storage
```
Đây là bug thật đã gặp trên production (volume tạo từ nhiều tuần trước, chưa
ai từng thử đăng nhập thật nên chưa lộ ra) — **dự án mới nên chạy `chown`
này ngay sau lần `docker compose up` đầu tiên**, hoặc thêm 1 entrypoint
script chạy `chown` lúc container khởi động (trước khi hạ quyền xuống
`pwuser`) để không phải nhớ làm tay.

### 6.3 ⚠️ Gotcha #2: `zca-js` là dependency `file:` local, không phải npm

`package.json`:
```json
"dependencies": { "zca-js": "file:vendor/zca-js" }
```
Vì Dockerfile không chạy `npm install`, **toàn bộ `node_modules/zca-js/` +
hết dependency bắc cầu của nó** (`tough-cookie`, `ws`, `crypto-js`,
`form-data`, `json-bigint`, `pako`, `semver`, `spark-md5`, `tldts`,
`mime-types`, v.v.) phải **đã có sẵn trong build context** — repo này giải
quyết bằng cách force-add cả `node_modules/zca-js/` vào git (ghi đè
`.gitignore` cho riêng thư mục đó bằng `git add -f`).

**Khuyến nghị cho dự án mới — ĐỪNG lặp lại cách này** (dễ vỡ theo hệ điều
hành/version Node, khó review diff, phình repo): thêm hẳn bước
`RUN npm ci` (hoặc `npm install`) vào Dockerfile, chỉ cần copy
`vendor/zca-js/` + `package.json`/`package-lock.json`. Lưu ý: nếu chạy
`npm install` trên **Windows** rồi mới build Docker (copy `node_modules` có
sẵn vào container Linux), symlink `node_modules/zca-js` sẽ trỏ tới đường dẫn
Windows tuyệt đối → không tồn tại trong Linux container → lỗi tương tự
`MODULE_NOT_FOUND`. Cách sạch nhất: để `npm install`/`npm ci` chạy **bên
trong** bước build Docker (Linux), không chạy trên máy Windows dev rồi COPY
kết quả sang.

### 6.4 Build lại extension zip lúc deploy

`linkedin-crawler-ui/scripts/build-extension-zips.mjs` (chạy qua
`predev`/`prebuild` trong `package.json`) đóng gói `extensions/*/` thành
`public/*.zip` để nút "Tải extension" trên web luôn phục vụ bản mới nhất.
**Docker build của frontend chỉ có context = thư mục frontend** (không thấy
được `../extensions`) nên script này silent-skip trong Docker, dùng nguyên
`public/*.zip` đã commit sẵn — **nghĩa là ai sửa `extensions/` mà quên chạy
lại script này + commit file `.zip` mới thì bản deploy vẫn phát tán extension
CŨ**. CI/CD nên có 1 bước riêng chạy script này trên máy có đủ
`../extensions` TRƯỚC khi build Docker image (xem `.github/workflows/
deploy-app.yml` bước "Dong goi lai extension zip tu source moi nhat" để
tham khảo).

---

## 7. Các bug đã gặp thật & cách đã fix (để dự án mới KHÔNG lặp lại)

| # | Bug | Triệu chứng | Nguyên nhân | Fix |
|---|---|---|---|---|
| 1 | zca-js thiếu API | Không lấy được lịch sử/list hội thoại qua CM protocol | Bản CJS của zca-js không wire `getCMOld`/`getCMRecent`/`getUserChatHistory` vào class API (chỉ ESM có) | Vendor bản đã vá (mục 2.3), hoặc tự wire lại |
| 2 | Symlink Windows→Linux | `MODULE_NOT_FOUND` khi container chạy | `npm install` trên Windows tạo symlink tuyệt đối, COPY sang Linux container trỏ sai | `npm install`/`npm ci` PHẢI chạy trong Linux container (mục 6.3) |
| 3 | Heuristic group/DM sai | Lấy lịch sử tin nhắn lỗi hàng loạt | Code cũ đoán "group nếu ID bắt đầu bằng 'g'" — ID zca-js là số nguyên trần, không có tiền tố | Bỏ heuristic, luôn gọi đúng hàm theo `thread_type` thật |
| 4 | Thiếu unique index | Danh sách hội thoại/tin nhắn TRỐNG hoàn toàn, không lỗi rõ ràng | `ON CONFLICT` cần unique index nhưng migration tạo index BÊN TRONG body RPC (bug "trứng gà") | Tạo 2 index thủ công (mục 4.4) |
| 5 | RPC không biết cột RBAC mới | Tài khoản "dùng chung" vẫn bị coi là private | `fn_get_zalo_conversations` là shadow object viết tay, không tự cập nhật khi thêm cột `is_shared_with_all`, và code Python chỉ fallback khi RPC lỗi (RPC này trả rỗng chứ không lỗi) | Sửa RPC (migration 067), luôn kiểm tra logic RPC + code Python đồng bộ |
| 6 | Quyền ghi `/app/artifacts` | Backend 500 `PermissionError` mọi lần import cookie mới | Named volume Docker tạo với quyền root, app chạy user không phải root | `chown` lại volume (mục 6.2) |
| 7 | Required cookie keys | Tab extension mở lên rồi "treo" (thực ra đang poll chờ tới 90s rồi bỏ cuộc, không đóng tab) | Code cũ chỉ coi "đã login" khi thấy đúng cookie `zpsid`/`zpw_sek` — nếu Zalo đổi tên cookie thì không bao giờ đúng | Bỏ yêu cầu tên cụ thể, chỉ cần có ÍT NHẤT 1 cookie; đồng thời rút ngắn + LUÔN đóng tab trong `finally` dù thành công hay lỗi |
| 8 | imei không ổn định | Login "thành công" (cookie nhận được, HTTP 200) nhưng listener luôn báo lỗi Zalo "session key improperly submitted" | Content script đoán imei không ra, backend tự sinh UUID MỚI mỗi lần gọi — Zalo coi cookie gắn với đúng 1 imei lúc phát hành | Cache imei ổn định ở cả extension (`chrome.storage.local`) và backend (tái dùng imei đã lưu cho account đó) |
| 9 | Key mismatch `result`/`response` | Mỗi tin nhắn gửi đi hiển thị LẶP thành 2 dòng trên UI | 2 script Node xử lý gửi tin (`zca_api_bridge.js` vs `zca_api_server.js`) trả JSON với tên field khác nhau (`response` vs `result`), Python chỉ đọc đúng 1 tên → luôn rơi vào nhánh sinh ID tạm → khi Zalo echo tin thật về, DB coi là 2 tin khác nhau | Đồng bộ tên field ở cả 2 script Node + thêm fallback đọc cả 2 tên ở Python |
| 10 | Endpoint lịch sử cũ đã chết | `getGroupChatHistory`/`getUserChatHistory` luôn trả 404 | Zalo đã dừng phục vụ 2 REST endpoint cũ này ở phía server (không phải bug code) | Không sửa được — chấp nhận giới hạn, chỉ dựa vào tin real-time qua listener (mục 2.3) |
| 11 | Extension zip cũ | Nút "Tải extension" phát tán bản CŨ dù code đã fix | `public/*.zip` là file build, dễ quên rebuild+commit sau khi sửa `extensions/` | Luôn chạy `build-extension-zips.mjs` sau khi sửa extension, có bước CI riêng (mục 6.4) |
| 12 | CI nuốt lỗi `git pull` | Deploy báo ✅ nhưng code KHÔNG cập nhật trên server | Bước đóng gói extension zip để lại working tree "dirty", `git pull || true` ở bước sau nuốt lỗi merge conflict im lặng | `git checkout -- public/*.zip` trước khi pull + bỏ `|| true` |

---

## 8. Checklist triển khai cho dự án mới (theo thứ tự)

1. [ ] Copy `linkedin_group_crawler/app/modules/all_platform/zalo/` (mục 2.1)
       + `services/`/`api/routes/` liên quan.
2. [ ] Copy `linkedin_group_crawler/scripts/zca_*.js` (mục 2.2) — đồng bộ
       tên field JSON giữa 2 script server/bridge (tránh bug #9).
3. [ ] Copy `linkedin_group_crawler/vendor/zca-js/` (mục 2.3), hoặc tự vá
       lại từ npm mới nhất.
4. [ ] Copy `extensions/extension-login-zalo/` (mục 2.4) — sửa domain trong
       `manifest.json` + whitelist trong `background.js` cho đúng dự án mới.
5. [ ] Copy frontend (`components/all-platform/zalo/**`, hooks, services,
       types, pages — mục 2.5).
6. [ ] Dựng schema DB (mục 4) — dump từ Supabase Cloud hiện tại HOẶC tạo mới
       theo mục 4.2, nhớ tạo 2 unique index (mục 4.4) NGAY TỪ ĐẦU.
7. [ ] Cấu hình `.env` (mục 5) — đặc biệt `ZALO_ZCA_STARTUP_SYNC_ENABLED=0`.
8. [ ] Dockerfile: cài Node 20 + `RUN npm ci` trong container Linux (mục
       6.1, 6.3) — KHÔNG copy `node_modules` từ máy dev.
9. [ ] `docker-compose.yml`: mount volume cho `artifacts/zca-auth`, và
       `chown` đúng quyền ngay sau lần `up` đầu tiên (mục 6.2).
10. [ ] Wire `_start_zca_listeners_background()` + `shutdown_persistent_listeners()`
        vào lifecycle app (startup/shutdown event) của framework backend mới.
11. [ ] Test luồng end-to-end: cài extension → bấm đăng nhập → xác nhận
        `artifacts/zca-auth/<id>.json` được tạo → xác nhận
        `GET /listener/status` báo `connected:true` → gửi 1 tin thử → xác
        nhận CHỈ hiện 1 dòng (không lặp, bug #9) → nhờ người khác nhắn vào →
        xác nhận nhận được real-time qua SSE.
