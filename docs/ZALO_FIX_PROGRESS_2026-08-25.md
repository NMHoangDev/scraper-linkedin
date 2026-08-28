# Zalo messaging — tiến độ debug & fix (phiên 2026-08-25)

> Đọc file này TRƯỚC khi tiếp tục bất kỳ việc gì liên quan Zalo. Đây là nhật ký đầy đủ
> của 1 phiên debug rất dài — mọi phát hiện/quyết định quan trọng đều ghi lại ở đây để
> phiên mới (không có memory phiên cũ) tiếp tục đúng chỗ, không lặp lại các bước đã làm.

## 0. Mục tiêu ban đầu của user

1. Production (`seeding.markeeai.com`) chạy đúng bản mới nhất — **đã xác nhận OK**, không phải vấn đề (main = origin/main).
2. Zalo chat "hoạt động không đúng" trên production → thu về **1 tài khoản Zalo dùng chung** cho toàn công ty (mọi nhân viên xem/gửi được), tham khảo kiến trúc ổn định của `D:\InvoiceFlowManager\services\zalo-bridge` để áp dụng cho `D:\CrawlDataLinkedin` (repo "seeding").
3. Chrome extension `extension-login-zalo` bị "treo", không tự tắt tab đúng lúc khi lấy cookie đăng nhập.
4. **Vấn đề cốt lõi đang debug dở**: gửi tin nhắn không đồng bộ — không lấy/lưu được tin nhắn kèm thông tin người gửi/nhận. Đang test trên **môi trường local** (Docker Compose trên máy Windows dev, KHÔNG phải production) trước khi mang fix lên production.

## 1. Bản đồ hạ tầng (đã xác minh trực tiếp, không phải suy đoán)

| Thứ | Giá trị |
|---|---|
| Host production app | `10.120.60.26`, user `deployseeding`, pass — xem `docs/INFRASTRUCTURE.md` (gitignored, không commit). Repo: `/opt/apps/seeding_markeeai/scraper-linkedin` |
| DB production THẬT | **Supabase Cloud** `https://rtwpogvficadngtfrcci.supabase.co` (KHÔNG phải self-host `seeding.db.markeeai.com` — đó là thông tin CŨ/SAI còn sót trong `docs/INFRASTRUCTURE.md` và memory cũ) |
| Host self-host DB (dùng bởi local `.env` để test, KHÔNG liên quan production) | `10.30.194.82`, user `selfhost`, pass — xem `docs/INFRASTRUCTURE.md` (gitignored, không commit). Cần VPN mới SSH được. Chứa NHIỀU project không liên quan (`seeding-trung-nguyen-*`, `kpi-prod-*`, `anhhieudemo-*`) — **CHỈ đụng vào container KHÔNG có prefix** (`supabase-db`, `supabase-rest`, `supabase-pooler`...) — đó mới là project "seeding". |
| Local dev stack | Chạy bằng `docker compose` tại `D:\CrawlDataLinkedin`. Router ở **`http://localhost:18080`** (KHÔNG phải 8080 — port đó bị 1 Apache khác trên máy Windows này chiếm). Cấu hình port này nằm trong `docker-compose.override.yml` (gitignored, chỉ có ở máy này). |
| Tài khoản Zalo test local | `zl_21f42279`, số `0839108906` ("Hoàng") — tài khoản Zalo THẬT của user, có session sống. Các account khác trong DB test đều đã ẩn (`is_active=false`). |
| Tài khoản Zalo dùng chung trên production | MarkeeAI, `zl_986934c9`, số `0765055708`. Đã đánh dấu `is_shared_with_all=true`, 10 account khác đã ẩn. **NHƯNG CHƯA từng đăng nhập QR thật** — chưa có session. |

**Quan trọng:** mọi lệnh SSH/DDL trực tiếp do Claude tự chạy đều bị 1 lớp "auto-mode permission classifier" chặn (không phải do user từ chối) — luôn phải đưa lệnh/script cho **user tự chạy** trong PowerShell của họ.

## 2. Đã fix xong (đã commit, đã push lên `main`, trừ khi ghi rõ "chưa")

### 2.1 RBAC "1 tài khoản dùng chung" (đã lên production)
- Migration `linkedin_group_crawler/supabase/migrations/066_zalo_accounts_shared_with_all.sql` — thêm cột `zalo_accounts.is_shared_with_all`.
- `supabase_service.py::list_zalo_accounts()`, `conversations.py::check_caller_conversation_access()`, `accounts.py::PUT /accounts/{id}` — tôn trọng cờ này (bỏ qua check owner/leader/share riêng từng hội thoại). Chỉ admin đổi được cờ.
- Production: MarkeeAI đánh dấu `is_shared_with_all=true`, 10 account khác `is_active=false`.
- Production `.env`: thêm `ZALO_QR_LOGIN_MODE=zca` (bật cơ chế listener bền zca-js, thay Playwright "web" mode cũ hay treo).
- Đã deploy lên production (`main @ 453e4303`), verify khỏe, không hỏng gì.

### 2.2 Chrome extension (`extensions/extension-login-zalo/background.js`)
- **Bug**: `REQUIRED_COOKIE_KEYS = []` (rỗng) → coi là "đã login" ngay khi vừa mở tab (chỉ cần 1 cookie zalo.me bất kỳ, kể cả cookie tracking) → đóng tab quá sớm, gửi cookie rác lên backend.
- **Fix**: `REQUIRED_COOKIE_KEYS = ["zpsid", "zpw_sek"]` (2 cookie xác thực thật, tham khảo InvoiceFlowManager), dùng logic OR (cần ít nhất 1 trong 2).
- **Bug 2**: đóng tab TRƯỚC khi biết chắc backend nhận cookie thành công → nếu POST lỗi, mất tab, không retry được.
- **Fix**: đóng tab CHỈ SAU khi backend trả `ok`.

### 2.3 Frontend UI
- `/all-platform/tai-khoan` (`ZaloDashboardView.tsx`): thêm nút "Tải extension Zalo", tự đổi "✓ Đã cài Extension" (disable) nếu đã cài — check qua `isZaloExtensionAvailable()`.
- Nút "Mở chat" trên card tài khoản: đổi từ `router.push("/zalo-chat")` sang `router.push("/all-platform/zalo-inbox?account=<id>")`.
- `ZaloInboxAdminShell.tsx`: đọc query param `?account=` → tự `inbox.onSelectAccount(...)`.
- Nút "Đăng nhập lại" trên card tài khoản: đổi từ gọi `flow.startSession()` (QR thuần) sang `flow.restartSession()` (hàm ĐÃ CÓ SẴN trong `useZaloCrawlerFlow.ts`, tự thử Extension trước, fallback QR sau — chỉ là chưa được gọi đúng chỗ).

### 2.4 `zca-js` thiếu API — nguyên nhân gốc "không lấy được lịch sử tin nhắn"
- **Phát hiện**: bản `zca-js@2.1.2` cài qua npm (dùng ở CrawlDataLinkedin) **thiếu hẳn** 3 hàm `getCMRecent`, `getCMOld`, `getUserChatHistory` — dù cùng số version, bản InvoiceFlowManager vendor riêng (`D:\InvoiceFlowManager\services\zalo-bridge\zca-js`) có đủ (npm registry KHÔNG có version nào khác chứa 3 hàm này — đây là bản tự vá riêng của InvoiceFlowManager).
- **Fix**: copy `D:\InvoiceFlowManager\services\zalo-bridge\zca-js` → `linkedin_group_crawler/vendor/zca-js/`, đổi `package.json`: `"zca-js": "file:vendor/zca-js"`.
- **Bug ẨN thứ 2** (quan trọng, dễ tái phát): sau `npm install`, `node_modules/zca-js` trở thành **symlink với đường dẫn tuyệt đối Windows** (`D:/CrawlDataLinkedin/...`) — khi Docker `COPY . .` vào container Linux thì symlink này TRỎ TỚI ĐƯỜNG DẪN KHÔNG TỒN TẠI. **Fix**: `rm node_modules/zca-js && cp -r vendor/zca-js node_modules/zca-js` (thay symlink bằng bản copy thật) — **phải làm lại mỗi lần chạy `npm install`**.
- **Bug ẨN thứ 3**: cả bản InvoiceFlowManager gốc LẪN bản vừa vendor, file `dist/cjs/apis.cjs` (bản CommonJS — đây là bản Node `require()` thực sự dùng, theo `package.json` field `exports.require`) **KHÔNG wire 3 hàm mới vào class API** (chỉ có trong bản ESM `dist/apis.js`, bản CJS bị lệch/cũ hơn). Đã tự patch thêm vào `vendor/zca-js/dist/cjs/apis.cjs` (và đồng bộ sang `node_modules/zca-js/dist/cjs/apis.cjs`):
  ```js
  var getCMOld = require('./apis/getCMOld.cjs');
  var getCMRecent = require('./apis/getCMRecent.cjs');
  var getUserChatHistory = require('./apis/getUserChatHistory.cjs');
  // ... trong constructor:
  this.getCMOld = getCMOld.getCMOldFactory(ctx, this);
  this.getCMRecent = getCMRecent.getCMRecentFactory(ctx, this);
  this.getUserChatHistory = getUserChatHistory.getUserChatHistoryFactory(ctx, this);
  ```

### 2.5 Heuristic sai group-vs-DM trong listener
- File: `app/modules/all_platform/zalo/services/zca_persistent_listener.py`, 2 chỗ (`_sync_recent_groups_after_connect`, `_run_background_backfill`).
- **Bug**: `is_group = group_id.strip().startswith("g")` — ID thật từ zca-js là số nguyên trần, KHÔNG có tiền tố "g" (đó là convention riêng của DOM-scraping cũ trong `zalo-content.js`). Heuristic này luôn coi mọi thread là "user" → gọi `get_zca_user_history` sai hàm → lỗi.
- **Fix**: bỏ nhánh rẽ, LUÔN gọi `get_zca_group_history` (đã có comment xác nhận trong `zca_api_bridge.js`: hàm này dùng được cho cả group và DM nếu truyền đúng thread id — cách InvoiceFlowManager cũng lày y vậy trong `first_time_sync`). Đã bỏ import `get_zca_user_history` không dùng nữa.

### 2.6 DB test local thiếu unique index (KHÔNG áp dụng cho production — cần kiểm tra riêng)
- `zalo_groups` và `zalo_messages` trên DB self-host local (`10.30.194.82`) **thiếu unique index** cần cho `ON CONFLICT (user_id, group_id [, source_message_id])` — khiến MỌI lần lưu group/message qua REST upsert lỗi `42P10` âm thầm → **danh sách hội thoại trống hoàn toàn**.
- Nguyên nhân gốc: migration `013_zca_bulk_save_rpc.sql`/`015_update_bulk_save_rpc.sql` có bug "trứng gà" — `CREATE UNIQUE INDEX` nằm TRONG BODY của RPC function, sau chỗ mà `INSERT ... ON CONFLICT` trong CHÍNH function đó cần dùng nó → trên 1 DB tinh (chưa từng chạy RPC thành công 1 lần), index không bao giờ được tạo.
- **Fix đã áp dụng cho DB test local**:
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_groups_uniq ON public.zalo_groups (user_id, group_id);
  DROP INDEX IF EXISTS idx_zalo_messages_lookup; -- non-unique cũ, không đủ cho ON CONFLICT
  CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_messages_uniq ON public.zalo_messages (user_id, group_id, source_message_id);
  ```
- ⚠️ **CHƯA kiểm tra production (Supabase Cloud `rtwpogvficadngtfrcci`) có bị thiếu 2 index này không** — cần check trước khi assume nó ổn.

### 2.7 `fn_get_zalo_conversations` không biết `is_shared_with_all` — ✅ ĐÃ ÁP DỤNG XONG TRÊN LOCAL (2026-08-25, phiên tiếp theo)
- Phát hiện: có 1 DB FUNCTION `fn_get_zalo_conversations` tồn tại trong DB (self-host local) — **không nằm trong bất kỳ migration nào của repo** (giống `zalo_conversations_ui`, cả 2 là "shadow object" tạo tay ngoài luồng migration từ trước). Route `GET /conversations` (`conversations.py::list_conversations_for_caller`) gọi RPC này TRƯỚC, chỉ fallback sang code Python (`check_caller_conversation_access`, nơi tôi đã thêm check `is_shared_with_all`) NẾU RPC lỗi. RPC này **trả 200 thành công nhưng rỗng** (không lỗi) nên fallback KHÔNG BAO GIỜ chạy tới — cờ `is_shared_with_all` bị bỏ qua hoàn toàn ở endpoint list này.
- **Fix**: `linkedin_group_crawler/supabase/migrations/067_fn_get_zalo_conversations_shared_with_all.sql` — `CREATE OR REPLACE FUNCTION` thêm nhánh `OR v_is_shared_with_all` vào điều kiện lọc.
- ✅ **Đã xác nhận ÁP DỤNG XONG trên DB test local** (`10.30.194.82`, container `supabase-db`) — `pg_get_functiondef` cho thấy function hiện tại ĐÃ có nhánh `is_shared_with_all`. Không rõ có phải do user tự chạy `apply_rpc_fix_for_user.py` ở phiên trước hay không (phiên mới không thấy log lại), nhưng kết quả trên DB xác nhận fix ĐÃ SỐNG.
- ✅ **Đã verify end-to-end qua curl thật** (không chỉ SQL): `GET http://localhost:18080/api/all-platform/zalo/conversations?account_id=zl_21f42279&limit=5` trả về **302 conversations** đầy đủ tên/avatar/tin nhắn cuối — route hoạt động đúng, không cần làm gì thêm ở local.
- ⚠️ **VẪN CHƯA kiểm tra/áp production** (Supabase Cloud `rtwpogvficadngtfrcci`) — production rất có thể có cùng bản function viết tay, không biết `is_shared_with_all`. Cần chạy lại đúng nội dung `067_...sql` qua SQL Editor của Supabase Cloud production khi mang lên production (xem mục 4, bước 7).

## 3. Chuỗi nguyên nhân đầy đủ của "gửi tin không đồng bộ / list hội thoại trống"

1. `ZALO_ZCA_STARTUP_SYNC_ENABLED` mặc định `false` khắp nơi (kể cả production) → listener kết nối xong không tự đồng bộ tin nhắn gần đây. **Đã bật `=1` ở local `.env` để test — CHƯA bật ở production.**
2. `zca-js` thiếu hàm → mục 2.4.
3. Heuristic group/DM sai → mục 2.5.
4. Thiếu unique index → mục 2.6 (đã fix local, chưa check production).
5. `fn_get_zalo_conversations` không biết `is_shared_with_all` → mục 2.7 (**ĐANG DỞ**).

**Vẫn còn 1 vấn đề CHƯA GIẢI QUYẾT, độc lập với 5 điều trên:**

### 3.1 `get_zca_group_history` trả 404 cho MỌI group — ✅ ĐÃ TÌM RA ROOT CAUSE (2026-08-25, phiên tiếp theo): endpoint cũ của Zalo đã CHẾT, không phải bug của mình
- Test qua `POST /conversations/sync-recent` cho tài khoản `zl_21f42279`: **20/20 group** (tên nhóm thật, đúng, ví dụ "[Markee] Devops", "[SZ] Dev core team"...) đều lỗi y hệt:
  ```
  ZcaApiError: Request failed with status code 404
      at resolveResponse (/app/node_modules/zca-js/dist/cjs/utils.cjs:620:15)
  ```
- **Đã loại trừ giả thuyết ban đầu** (nghi `api.zpwServiceMap.group` rỗng/sai cho session này): exec thẳng vào container `seeding-backend`, tự login lại bằng cookie thật của `zl_21f42279` (script tạm, không sửa code production), in ra `api.zpwServiceMap` đầy đủ — **key `group` có giá trị HỢP LỆ**: `["https://tt-group-wpa.chat.zalo.me"]`. Test `getGroupChatHistory` với 3 group id thật (bao gồm 1 group công khai chắc chắn không phải DM, "CỘNG ĐỒNG BACKEND DEVELOPER") → **vẫn 404 cả 3**. Vậy không phải do service map rỗng, không phải do heuristic group/DM (mục 2.5 đã fix đúng rồi), không phải do session cụ thể của account test.
- **Test thêm `getUserChatHistory`** (hàm dành riêng cho DM, dùng `zpwServiceMap.chat[0]` + endpoint `/api/message/history` — khác hẳn `getGroupChatHistory` dùng `zpwServiceMap.group[0]` + `/api/group/history`) với 3 người bạn thật lấy từ `api.getAllFriends()` → **CŨNG 404 cả 3, không sót cái nào**.
- **Test `getCMOld`** (hàm InvoiceFlowManager tự "vá" thêm, tưởng là bản thay thế hiện đại cho `getGroupChatHistory`/`getUserChatHistory`) — đọc source `node_modules/zca-js/dist/apis/getCMOld.js` (và bản `.cjs` y hệt) mới phát hiện: **đây là 1 STUB CỐ Ý, KHÔNG GỌI ZALO THẬT**:
  ```js
  // "This endpoint is currently disabled/unreversed."
  return async function getCMOld(threadId, globalMsgId = 0, count = 50, isGroup = true, isOA) {
      return { msgs: [], groupMsgs: [], hasMore: false, disabled: true, reason: "CM_OLD_NOT_REVERSED" };
  };
  ```
  Tức là ngay cả bản zca-js đã vá của InvoiceFlowManager cũng **CHƯA reverse-engineer được** endpoint lấy tin nhắn cũ theo giao thức CM (Cloud Message) mới của Zalo — họ chỉ stub nó trả rỗng "cho graceful fallback", không phải trả dữ liệu thật.
- **Test `getCMRecent`** (hàm CM thật, dùng để LIST hội thoại gần đây — không phải lấy lịch sử 1 thread — endpoint `/api/cm/getrecentv2` trên `zpwServiceMap.group_cloud_message`/`cm`, fallback `tt-group-cm.chat.zalo.me`) gọi trực tiếp (ngoài listener) → lỗi `ZcaApiError code=604 "Lỗi không xác định"` — khác 404, chưa rõ nguyên nhân chính xác (có thể do gọi ngoài context listener bình thường, thiếu 1 số state; CHƯA điều tra sâu vì không phải đường lấy lịch sử của 1 thread cụ thể).
- **KẾT LUẬN**: `/api/group/history` và `/api/message/history` — 2 REST endpoint reverse-engineer "cổ điển" mà `getGroupChatHistory`/`getUserChatHistory` dùng — **đã bị Zalo dừng phục vụ hoàn toàn** (server trả 404 thật, không phải lỗi parse/encrypt phía mình). Zalo rõ ràng đã chuyển hạ tầng lưu trữ tin nhắn sang giao thức "CM" (Cloud Message) mới, và **chưa có ai (kể cả upstream `zca-js` lẫn bản vá của InvoiceFlowManager) reverse-engineer xong** endpoint lấy tin nhắn CŨ theo giao thức mới này — `getCMOld` chỉ là placeholder rỗng.
- **Ý nghĩa cho việc backfill lịch sử tin nhắn cũ**: **hiện tại KHÔNG THỂ backfill lịch sử tin nhắn cũ** (trước lúc bot bắt đầu lắng nghe) bằng bất kỳ hàm nào trong `zca-js` — đây là giới hạn của thư viện/giao thức, KHÔNG phải bug sửa được trong code của repo này. Không nên tốn thêm thời gian điều tra tiếp hướng "sửa được 404" — hướng duy nhất khả thi (nếu thật sự cần) là tự reverse-engineer giao thức CM mới, việc này tốn công và không phải mục tiêu chính hiện tại.
- **Quan trọng — điều này KHÔNG chặn mục tiêu chính**: danh sách hội thoại (tên, avatar) vẫn lưu được bình thường (qua đường khác, không qua `getGroupChatHistory`/`getUserChatHistory`) — chỉ riêng NỘI DUNG lịch sử tin nhắn CŨ bị chặn. Tin nhắn MỚI qua WS listener (real-time, `api.listener`, hoàn toàn khác code path, không đụng tới 2 endpoint chết này) không bị ảnh hưởng — vẫn CHƯA kiểm chứng bằng test gửi/nhận tin thật (xem mục 4).
- **Khuyến nghị**: coi lỗi 404 này là "known limitation, để sau" đúng như plan gốc ở mục 4 bước 5/6 — tập trung test luồng gửi/nhận tin real-time trước.

### 3.2 Phát hiện mới (ngoài lề, chưa fix): `POST /conversations/{id}/send` thiếu check quyền so với `send-media`
- `conversations.py::send_message_to_conversation` (gửi text) **KHÔNG gọi** `check_caller_conversation_access` trước khi gửi — trong khi `send_media_to_conversation` (gửi ảnh/file, cùng file, ngay dưới) CÓ gọi (dòng ~833: `allowed_conv_ids = await check_caller_conversation_access(...)`, trả 403 nếu hội thoại riêng tư chưa được share).
- Nghĩa là: với 1 tài khoản Zalo KHÔNG `is_shared_with_all` và có hội thoại riêng tư chưa share cho ai, endpoint gửi TEXT vẫn cho phép bất kỳ ai (miễn biết `conversation_id`) gửi tin nhắn thay mặt tài khoản đó — bỏ qua toàn bộ RBAC theo hội thoại. Endpoint gửi ảnh thì được chặn đúng.
- **CHƯA fix** — cần thêm đúng đoạn check giống `send_media_to_conversation` vào `send_message_to_conversation` (trước khi gọi `send_zca_message`). Vì đây là lỗ hổng RBAC (không phải lỗi luồng đang test), nên hỏi ý user trước khi sửa — không nằm trong phạm vi "làm tiếp việc dang dở" ban đầu nhưng liên quan trực tiếp tới chủ đề RBAC của cả phiên.

## 4. Việc cần làm ngay khi mở phiên mới

1. Kiểm tra xem user đã chạy `apply_rpc_fix_for_user.py` (mục 2.7) chưa / kết quả ra sao. Nếu phiên mới không thấy gì, viết lại script tương tự:
   ```python
   import paramiko
   HOST, USER = "10.30.194.82", "selfhost"
   PASS = "..."  # xem docs/INFRASTRUCTURE.md (gitignored, không commit)
   with open(r"D:\CrawlDataLinkedin\linkedin_group_crawler\supabase\migrations\067_fn_get_zalo_conversations_shared_with_all.sql", "r", encoding="utf-8") as f:
       sql = f.read()
   client = paramiko.SSHClient()
   client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
   client.connect(HOST, username=USER, password=PASS, timeout=20)
   sftp = client.open_sftp()
   with sftp.file("/tmp/fn_fix.sql", "w") as rf:
       rf.write(sql)
   sftp.close()
   stdin, stdout, stderr = client.exec_command(
       "echo '1' | sudo -S sh -c 'docker exec -i -u postgres supabase-db psql -d postgres < /tmp/fn_fix.sql' && rm -f /tmp/fn_fix.sql",
       get_pty=True,
   )
   print(stdout.read().decode()); print(stderr.read().decode())
   client.close()
   ```
   Chạy trực tiếp bằng Claude SẼ bị classifier chặn → phải đưa cho **user tự chạy** qua `py -3 <path>` trong PowerShell của họ (VPN phải đang mở).
2. Sau khi migration 067 áp dụng xong trên DB test local: hard-refresh trang `http://localhost:18080/all-platform/zalo-inbox?account=zl_21f42279`, xác nhận danh sách hội thoại hiện ra (đã xác nhận qua curl trực tiếp là CÓ dữ liệu — vấn đề chỉ là RPC filter).
3. Mở 1 hội thoại thật, gửi thử 1 tin nhắn — xem code `conversations.py::send_message_to_conversation` → `_persist_outgoing_message` (đã đọc, có vẻ ĐÚNG, nhưng CHƯA test live) có lưu đúng sender="Bạn"/is_sent=true không.
4. Nhờ 1 người khác gửi tin nhắn Zalo thật tới `0839108906` — kiểm tra tin có tự hiện lên UI qua SSE real-time không (không phụ thuộc vào lỗi 404 mục 3.1, vì đó là listener WS, khác đường).
5. Nếu 3 và 4 đều ổn → coi như luồng CHÍNH (gửi/nhận tin) đã sống, có thể để lỗi 404 (mục 3.1, chỉ ảnh hưởng backfill lịch sử CŨ) làm sau.
6. Điều tra tiếp lỗi 404 `getGroupChatHistory` (mục 3.1) nếu cần lấy lại lịch sử tin nhắn cũ.
7. Sau khi local ổn định, mang TỪNG fix sau lên **production** (qua git pull + rebuild + SSH, theo đúng flow deploy an toàn đã dùng suốt phiên này — build trước, swap sau, có rollback):
   - Kiểm tra + áp file 067 lên Supabase Cloud (`rtwpogvficadngtfrcci`) qua SQL Editor.
   - Kiểm tra + tạo 2 unique index (mục 2.6) trên Supabase Cloud nếu thiếu.
   - Thêm `ZALO_ZCA_STARTUP_SYNC_ENABLED=1` vào production `.env`.
   - Deploy code (`vendor/zca-js` + patch `apis.cjs` + fix `zca_persistent_listener.py` — đã có trong `main`, chỉ cần **SSH vào production, `cd linkedin_group_crawler && rm -rf node_modules/zca-js && npm install && rm -rf node_modules/zca-js && cp -r vendor/zca-js node_modules/zca-js`** trước khi rebuild Docker — vì production Dockerfile KHÔNG có bước `npm install`, chỉ `COPY . .` nguyên trạng, và `node_modules` không nằm trong git).
   - Nhờ người giữ số 0765055708 (MarkeeAI) quét QR đăng nhập thật lần đầu (chưa từng có session).
   - Điều tra xem lỗi 404 mục 3.1 có tái diễn trên production/MarkeeAI hay không.

## 5. Ghi chú vận hành khác
- File `linkedin_group_crawler/.env` (local) hiện có thêm `ZALO_ZCA_STARTUP_SYNC_ENABLED=1` — **chỉ áp dụng máy này**, không commit (đã trong .gitignore).
- `docker-compose.override.yml` (local, gitignored) đổi router sang port `18080` + build-arg frontend URL tương ứng — nếu máy khác không bị đụng port 8080 thì có thể không cần đổi.
- Nhánh `main` đã merge cả 2: fix Zalo (`is_shared_with_all` + các fix mục 2) VÀ 5 commit từ `dev` (PR #63 tuongtacnoibo — không liên quan Zalo). `dev` hiện đã đồng bộ ngược đầy đủ với `main`.
