# Hướng dẫn setup 2 VPS Windows làm Worker cào (test multi-VPS worker queue)

Bối cảnh: backend (API hàng đợi job) đang chạy **local trên máy bạn**
(`localhost:8000`, Supabase **dev**), được lộ ra Internet qua Cloudflare Tunnel:

```
BACKEND_URL = https://garbage-advanced-thesaurus-satisfactory.trycloudflare.com
```

> Lưu ý: URL này chỉ tồn tại khi máy bạn còn mở terminal chạy `uvicorn` VÀ
> terminal chạy `cloudflared tunnel --url http://localhost:8000`. Nếu bạn tắt
> 1 trong 2, worker trên VPS sẽ poll lỗi (không phải bug, chỉ là do tunnel/backend
> đã tắt). Nếu cần tunnel mới, chạy lại `cloudflared tunnel --url http://localhost:8000`
> và nó in ra URL mới — báo lại để cập nhật bước 4 dưới đây.

Làm các bước sau **trên từng VPS** (lặp lại 2 lần, cho VPS #1 và VPS #2):

## 1. RDP vào VPS, cài Chrome
Nếu VPS chưa có Chrome, cài bản Chrome for Desktop bình thường (không dùng bản Beta/Dev).

## 2. Copy thư mục extension vào VPS
Copy toàn bộ thư mục `extensions/api-facebook-get-extension` (từ repo, nhánh
`feature/multi-vps-worker-queue`) vào VPS, ví dụ `C:\extension\api-facebook-get-extension`.

Cách copy: zip thư mục lại, tải lên VPS qua RDP clipboard/file transfer, hoặc
`git clone` repo trên VPS rồi checkout đúng nhánh.

## 3. Load extension vào Chrome (mỗi VPS)
1. Mở Chrome trên VPS, vào `chrome://extensions`.
2. Bật **Developer mode** (góc trên phải).
3. Bấm **Load unpacked**, chọn đúng thư mục `api-facebook-get-extension` vừa copy.
4. Extension "FB API Auto Crawler" sẽ xuất hiện trong danh sách.

## 4. Đăng nhập Facebook trên Chrome của VPS — KHÔNG CÒN CẦN LÀM TAY NỮA
Từ bản vá "acc theo đúng nhân viên", worker tự động xin đúng acc của đúng nhân
viên sở hữu nhóm từ pool (`crawl_fb_accounts`) và tự set cookie — không cần RDP
vào VPS đăng nhập tay nữa.

Điều kiện: acc FB của nhân viên đó phải đã được **đăng ký vào pool 1 lần**
(gắn `id_member`), qua API `POST /auth/login` (kèm field `id_member`) — việc
này làm 1 lần/nhân viên, không phải mỗi lần setup VPS. Nếu acc chưa có trong
pool hoặc chưa gắn đúng `id_member`, job của nhân viên đó sẽ tự quay về
`pending` chờ (xem "Hành vi mới" bên dưới), không cào nhầm acc khác.

## 5. Trỏ worker về backend qua tunnel
1. Vào `chrome://extensions`, tìm extension, bấm **"service worker"** để mở
   DevTools console riêng của nó.
2. Chạy lệnh (thay đúng URL tunnel hiện tại nếu đã đổi):
```js
chrome.storage.local.set({ worker_api_base: 'https://garbage-advanced-thesaurus-satisfactory.trycloudflare.com' })
```
3. Kiểm tra lại:
```js
chrome.storage.local.get('worker_api_base').then(console.log)
```
4. **Để console này mở** — sau bản sửa mới, `sendLog()` sẽ in log trực tiếp ra
   đây (`📥 [Worker Queue] Nhận job cào...`, `✅ ... Hoàn tất job ...`).

## 6. Xác nhận worker đã có worker_id riêng
Mỗi VPS tự sinh 1 `worker_id` (UUID) riêng, lưu trong `chrome.storage.local`,
dùng để backend biết job nào đã giao cho VPS nào. Không cần làm gì thêm — chỉ
cần xác nhận 2 VPS có `worker_id` khác nhau (chạy `chrome.storage.local.get('worker_id')`
ở mỗi console, so sánh — phải khác nhau; nếu VPS được clone từ image có sẵn
`chrome.storage.local` của máy khác thì 2 worker_id có thể trùng, cần xoá đi
cho tự sinh lại: `chrome.storage.local.remove('worker_id')` rồi reload extension).

---

## Sau khi cả 2 VPS đã sẵn sàng, báo lại để test

Tôi (Claude) sẽ enqueue nhiều job liên tiếp qua backend local, rồi kiểm tra:
- Mỗi job chỉ được **1 trong 2 VPS** claim (không bị giao trùng — nhờ
  `FOR UPDATE SKIP LOCKED` trong migration `028_crawl_worker_queue.sql`).
- Cả 2 VPS đều poll và crawl được, không riêng 1 con làm hết.
- Kết quả (bài viết) được lưu đúng vào Supabase dev.

### Hành vi mới sau bản vá lỗi (đáng chú ý khi test)
- Worker giờ gửi heartbeat thêm vài lần **trong lúc đang cào** (không chỉ lúc
  vừa nhận job) — nhìn console sẽ không thấy log gì thêm (heartbeat chạy im,
  không `sendLog`), nhưng nếu tò mò có thể xem tab Network của DevTools service
  worker để thấy vài request `POST .../queue/heartbeat` xen giữa lúc cào.
- Job fail (network lỗi, content script lỗi...) giờ **tự thả về `pending` để
  thử lại tối đa 2 lần** (`retry_count`) trước khi bị đánh `failed` hẳn — nếu
  test cố tình làm 1 job fail (VD tắt tunnel giữa lúc cào), đừng ngạc nhiên khi
  thấy job đó quay lại `pending` thay vì `failed` ngay ở lần đầu.
- Worker giờ tự đổi acc theo đúng `id_member` của từng job (xem mục 4) — nếu
  test với nhiều nhân viên/nhiều acc, xem log console sẽ thấy "Đã đổi acc ..."
  mỗi khi job kế tiếp thuộc về nhân viên khác với acc đang cầm. Nếu 2 job liên
  tiếp cùng 1 nhân viên, worker giữ nguyên acc, không đổi lại (tránh đăng nhập
  lại liên tục).

## Bước tiếp theo (sau khi test 2 VPS pass)
Khi luồng này ổn định, sẽ chuyển sang giai đoạn tích hợp với VPS "main" thật
(con đang chạy luồng 24h auto-crawl SSE production) — main sẽ enqueue job vào
hàng đợi này thay vì gọi trực tiếp qua SSE, và deploy code `crawl_queue.py` +
migration `028` lên đúng backend mà VPS main/2 VPS worker cùng trỏ tới (khi đó
mới bỏ tunnel, dùng thẳng URL backend thật).
