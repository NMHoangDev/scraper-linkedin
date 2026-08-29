# Tổng quan CRM + Báo giá + Hợp đồng (tài liệu bàn giao cho team Backend)

Tài liệu này mô tả 3 module liên quan chặt với nhau trong `linkedin_group_crawler` (FastAPI)
+ `linkedin-crawler-ui` (Next.js): **CRM** (pipeline bán hàng), **Báo giá** (Quotes), **Hợp
đồng** (Contracts) — kèm danh sách file, API, bảng DB, và 2 tính năng AI đang có (đang chạy
được hay đang thiếu gì). Viết cho người chưa từng đụng vào 3 module này.

## 0. Quan hệ giữa 3 module

```
CRM (customer_leads = 1 "deal")
  │
  ├─ 1 deal có thể gắn 1 báo giá  → quotes.deal_id
  │     └─ báo giá thuộc 1 mẫu (quote_forms) + 1 công ty phát hành (quote_issuer_companies)
  │
  └─ 1 deal có thể gắn 1 hợp đồng → contracts.deal_id (optional — hợp đồng cũng
        có thể tạo "thủ công" không cần deal, xem contracts.manual_customer_name)
        └─ hợp đồng có thể tham chiếu tới báo giá → contracts.quote_id
```

Cả 3 module dùng chung 1 backend FastAPI (`app/modules/all_platform/`), cùng pattern
router → service → Supabase table, cùng auth (`get_current_user`, JWT qua cookie
`crawlpro_access_token` hoặc Bearer header). Frontend cùng pattern
`repositories/Seeding*Repository.ts` gọi `${API_BASE_URL}/api/all-platform/...`.

⚠️ **Trạng thái nhánh git hiện tại**: nhánh `feat/deal-quick-add-form-redesign` (CRM +
popup "Thêm deal nhanh") **chưa có** module Hợp đồng — module đó nằm ở nhánh
`feat/contracts-ai-copilot` đã merge vào `main` riêng. Khi merge 2 bên vào nhau, **migration
số `072` bị trùng** — nhánh CRM dùng `072_customer_leads_next_step.sql`, nhánh Hợp đồng
dùng `072_contracts.sql`. **Backend cần đánh số lại 1 trong 2 trước khi chạy** (đề xuất: giữ
`072_customer_leads_next_step.sql`, đổi 4 file contracts thành `076-079`).

---

## 1. CRM — Pipeline bán hàng

### 1.1 Tổng quan
Kanban 7 giai đoạn chính (`new_lead → contacted → qualified → requirement → proposal_sent →
negotiation → contract_sent`) + 3 trạng thái cuối (`on_hold`/`won`/`lost`). Mỗi "deal" là 1
dòng trong bảng `customer_leads` (tên bảng cũ, giữ nguyên vì lịch sử — không phải chỉ leads
nữa mà là toàn bộ deal).

Vừa làm lại (2026-08-27/28): popup **"Thêm deal nhanh"** — rút gọn chỉ còn field bắt buộc
thật sự cần (Tên khách hàng, Liên hệ, Sản phẩm/Dịch vụ, Giai đoạn, Next step, Follow-up),
có khối dán văn bản + AI tự điền, 2 thẻ "Deal Health" (điểm 0-100 tự tính) và "Người phụ
trách" (tự lấy Sale đang đăng nhập), phần còn lại gom vào "Thông tin nâng cao" thu gọn.

### 1.2 File chính
**Frontend** (`linkedin-crawler-ui/modules/crm/`)
| File | Vai trò |
|---|---|
| `components/CrmShell.tsx` | Trang CRM chính — Kanban/bảng, mở modal deal, wiring handlers |
| `components/DealFormModal.tsx` | Khung popup "Thêm deal" (tạo mới = "Thêm deal nhanh" / sửa = "Chỉnh sửa deal") |
| `components/DealFormFields.tsx` | Toàn bộ field + validate + tính Deal Health + preset Next step + AI điền nhanh |
| `components/CrmKanbanBoard.tsx`, `CrmTableView.tsx` | 2 chế độ xem |
| `components/DetailDrawer.tsx` | Chi tiết 1 deal (lịch sử, hợp đồng, báo giá gắn kèm) |
| `components/AnalyticsView.tsx` | Phân tích CRM (phễu, hiệu suất theo Sale/team) |
| `constants/crmConfig.ts` | `DEAL_STAGES`, `DEAL_STAGE_META` (nhãn/màu dùng CHUNG toàn app), `STAGE_REQUIREMENTS` (field bắt buộc khi CHUYỂN giai đoạn) |
| `repositories/SeedingCrmRepository.ts` | Gọi API thật, map field camelCase ↔ snake_case |
| `types/index.ts` | `Deal`, `CreateDealInput`, `UpdateDealInput` |

**Backend** (`linkedin_group_crawler/app/modules/all_platform/`)
| File | Vai trò |
|---|---|
| `routers/customer_lead.py` | CRUD deal, transition giai đoạn, upload file, 2 endpoint AI điền nhanh |
| `services/customer_lead_service.py` | Logic CRUD + `STAGE_REQUIRED_FIELDS` (chỉ validate lúc **chuyển giai đoạn** qua `/transition`, **không** validate lúc tạo mới) |
| `services/deal_ai_parse_service.py` | AI điền nhanh — xem mục 5 |
| `services/crm_permission_service.py` | `can_write_deal`, `can_edit_contract`... |
| `schemas/customer_lead.py` | `CustomerLeadCreate/Update/Response`, `STAGE_REQUIRED_FIELDS` |

### 1.3 API (prefix `/api/all-platform/customer-leads`)
| Method + path | Việc |
|---|---|
| `GET ""` | List deal (filter, phân trang) |
| `POST ""` | Tạo deal — **không validate theo giai đoạn**, chỉ Pydantic schema chặn field sai kiểu |
| `PUT "/{id}"` | Sửa deal |
| `DELETE "/{id}"` | Xoá deal |
| `POST "/{id}/transition"` | Chuyển giai đoạn — **có** validate `STAGE_REQUIRED_FIELDS` (server-side, không tin client) |
| `GET "/{id}/activity-log"` | Lịch sử hoạt động |
| `GET "/stage-counts"`, `GET "/sdrs"`, `GET "/by-conv/{conv_id}"` | Tiện ích |
| `POST "/upload"` | Upload file đính kèm (brief/proposal/contract) |
| `GET "/ai-parse-deal/status"`, `POST "/ai-parse-deal"` | AI điền nhanh — xem mục 5 |

### 1.4 DB — bảng `customer_leads`
Migration liên quan (đầy đủ, theo thứ tự):
`011, 017, 021, 026, 027, 038, 041, 042, 046, 050, 052, 056, 072_customer_leads_next_step`.
Cột mới nhất `next_step` (TEXT, migration 072) — Sale gõ tay hoặc AI gợi ý, hiển thị ở form
nhanh, KHÔNG bắt buộc ở tầng DB (chỉ bắt buộc qua validate frontend lúc tạo mới).

---

## 2. Báo giá (Quotes)

### 2.1 Tổng quan
Wizard tạo báo giá rút gọn còn 3 bước: **Khách hàng → Hạng mục báo giá → Xác nhận**. Mẫu
báo giá (`quote_forms`, mỗi mẫu tự định nghĩa field qua `schema_json`) không còn chọn tay ở
1 bước riêng — tự resolve theo **công ty phát hành** (`quote_issuer_companies`) chọn ở bước
1. Số báo giá dạng `YYYYMMDDHHMM` (giờ VN), báo giá đã duyệt (`approved`) có thể **gửi qua
Telegram** (link public, chưa gửi kèm PDF thật).

### 2.2 File chính
**Frontend**
| File | Vai trò |
|---|---|
| `modules/crm/integrations/quotes/CreateQuoteModal.tsx` | Wizard 3 bước, mở từ CRM/Quote Center |
| `modules/crm/integrations/quotes/IssuerCompanySection.tsx` | Khối chọn công ty phát hành ở Bước 1 |
| `modules/quotes/components/QuoteDocumentRenderer.tsx` | Render báo giá dùng chung cho preview/chi tiết/public/PDF |
| `modules/quotes/components/QuoteFormBuilderPage.tsx` | Trình dựng mẫu báo giá (kéo-thả field) |
| `modules/quotes/components/IssuerCompanyAdminPage.tsx` | Trang quản trị "Đơn vị phát hành" (CRUD + upload logo) |
| `modules/quotes/components/TelegramSendButton.tsx` | Nút "Gửi qua Telegram" |
| `modules/quotes/utils/quoteColumns.ts` | Cột hiển thị báo giá suy **động** theo `schema_json` của từng mẫu (không hardcode) |
| `modules/crm/components/QuoteCenterPage.tsx` | Dashboard tổng hợp báo giá liên kết CRM |

**Backend**
| File | Vai trò |
|---|---|
| `routers/quote.py` | CRUD quote/quote_form, issuer-companies, service-catalog-options, send-telegram, telegram-log |
| `services/supabase_quote_service.py` | Logic chính — `_next_quote_number()` (định dạng số báo giá), `create_quote/update_quote`, `list_issuer_companies` |
| `services/quote_telegram_service.py` | Render PDF qua Playwright (từ trang public `?print=true`) + gọi Telegram Bot API `sendDocument` |
| `services/supabase_service_catalog_service.py` | Danh mục Sản phẩm & dịch vụ (nguồn cho popup "+ Chọn từ danh mục") |

### 2.3 API (prefix `/api/all-platform/quotes` và `/quote-forms`)
| Method + path | Việc |
|---|---|
| `GET/POST /quote-forms`, `PUT/DELETE /quote-forms/{id}` | CRUD mẫu báo giá |
| `GET /quotes`, `POST /quotes`, `PUT /quotes/{id}` | CRUD báo giá |
| `POST /quotes/{id}/approve`, `POST /quotes/{id}/update-and-approve` | Duyệt (khoá sửa vĩnh viễn, sinh public link) |
| `GET /quotes/issuer-companies`, `GET/PUT /quotes/issuer-companies/{id}` | Đơn vị phát hành |
| `GET /quotes/service-catalog-options` | Dữ liệu cho popup chọn hạng mục |
| `POST /quotes/{id}/send-telegram`, `GET /quotes/{id}/telegram-log` | Gửi Telegram + lịch sử |
| `GET /quotes/public/{token}`, `GET /quote-forms/public/{token}` | Trang public cho khách xem (không cần đăng nhập) |

### 2.4 DB
| Bảng | Migration tạo | Ghi chú |
|---|---|---|
| `quote_forms`, `quotes`, `quote_items` | `028` | Bảng gốc |
| — | `059, 060` | Luồng duyệt (draft → approved) |
| `quote_items` | `061, 062, 063` | service_description, discount_percent, cha/con |
| `quote_forms` | `064` | Default cho mẫu Douyin |
| `service_catalog_items`... | `065` | Danh mục Sản phẩm & dịch vụ |
| `quote_issuer_companies` | `069` | Đơn vị phát hành (seed sẵn 3 công ty) |
| `quote_telegram_log` | `070` | Log gửi Telegram (append-only) |
| `quote_forms.issuer_company_id` | `071` | Gắn mẫu ↔ công ty |

**Nguyên tắc quan trọng — snapshot, không live-join**: thông tin công ty phát hành/khách
hàng/danh mục dịch vụ được ghi thẳng vào `quotes.data` (JSONB) lúc tạo/sửa báo giá. Sửa
`quote_issuer_companies` hay danh mục sau này **chỉ ảnh hưởng báo giá tạo mới**, không đụng
báo giá cũ đã lưu.

---

## 3. Hợp đồng (Contracts) — module mới, đang ở nhánh `main` riêng

### 3.1 Tổng quan
Module độc lập, **không tái dùng** field hợp đồng cũ trong `customer_leads`
(`contract_status`, `contract_signed_at`...) — bảng `contracts` hoàn toàn mới, có thể gắn
với 1 deal CRM (`deal_id`) và/hoặc 1 báo giá (`quote_id`), hoặc tạo tay không cần deal
(`manual_customer_name`). Có **"AI Contract Copilot"**: soạn thảo hợp đồng tự động từ dữ
liệu deal + báo giá, chấm điểm rủi ro, và đề xuất chỉnh sửa.

### 3.2 File chính
**Frontend**
| File | Vai trò |
|---|---|
| `app/(all-platform)/all-platform/contracts/page.tsx` | Danh sách hợp đồng + 4 KPI |
| `app/(all-platform)/all-platform/contracts/[id]/page.tsx` | Chi tiết |
| `app/(all-platform)/all-platform/contract-templates/page.tsx` | Thư viện mẫu hợp đồng |
| `modules/contracts/components/ContractHomePage.tsx`, `ContractDetailPage.tsx` | Trang chính |
| `modules/contracts/components/ManualContractModal.tsx` | Tạo hợp đồng thủ công (không qua AI) |
| `modules/crm/integrations/contracts/ContractAIWizard.tsx` | **Wizard AI 3 bước**: chọn nguồn dữ liệu (deal/báo giá) → AI soạn + kiểm tra → duyệt & xuất (Tải Word/PDF/Gửi Pháp chế/Gửi ký điện tử) |
| `modules/contract-templates/components/ContractTemplatesPanel.tsx` | Tab thư viện mẫu (upload .docx/.pdf/.txt, trích xuất text) |
| `modules/contracts/repositories/SeedingContractRepository.ts` | Gọi API |

**Backend**
| File | Vai trò |
|---|---|
| `routers/contract.py` | CRUD + 3 endpoint AI (generate-draft/ai-review/refine-draft) |
| `routers/contract_template.py` | CRUD thư viện mẫu |
| `services/supabase_contract_service.py` | CRUD + thống kê dashboard |
| `services/contract_ai_service.py` | AI Copilot — xem mục 5 |
| `services/contract_template_service.py` | Upload + trích xuất text từ .docx/.pdf/.txt |

### 3.3 API (prefix `/api/all-platform/contracts` và `/contract-templates`)
| Method + path | Việc |
|---|---|
| `GET/POST /contracts`, `PUT /contracts/{id}`, `DELETE /contracts/{id}` | CRUD |
| `PUT /contracts/{id}/status` | Đổi trạng thái |
| `POST /contracts/generate-draft` | AI soạn 7 điều khoản (ĐIỀU 1-7 cố định) từ deal+báo giá — **chưa lưu DB**, trả về để FE xem trước |
| `POST /contracts/ai-review` | AI chấm điểm rủi ro 0-100 + danh sách phát hiện (ok/warn) |
| `POST /contracts/refine-draft` | AI viết lại điều khoản để sửa các phát hiện ở trên |
| `GET/POST/DELETE /contract-templates` | Thư viện mẫu tham khảo cho AI |

### 3.4 DB
| Migration | Việc |
|---|---|
| `072_contracts.sql`* | Bảng `contracts` (clauses JSONB, ai_generated, ai_risk_score, ai_review JSONB, status draft→...→terminated) + `contract_activity_log` |
| `073_contracts_extra_fields.sql`* | `owner_id`, `progress_percent`, `payment_collected_percent` |
| `074_contract_templates.sql`* | Bảng `contract_templates` (chỉ lưu text đã trích xuất, không lưu file gốc) |
| `075_contracts_manual_customer_name.sql`* | Cho phép hợp đồng không gắn deal |

\* Số thứ tự cần đổi lại khi merge — xem cảnh báo ở mục 0.

---

## 4. AI điền nhanh (CRM) — đang làm gì, đang vướng gì

**Đang làm gì**: nút "AI điền nhanh" ở popup "Thêm deal nhanh" — Sale dán 1 đoạn văn bản
thô (tin nhắn, email, ghi chú cuộc gọi) vào ô textarea, bấm nút, AI đọc và trả về JSON đúng
8 field cố định (`customerName, companyName, phone, email, servicePackage, estimatedBudget,
nextStep, note`), sau đó **chỉ điền vào field đang RỖNG** trong form — không ghi đè field
Sale đã tự gõ tay. Backend: `deal_ai_parse_service.py` → gọi endpoint OpenAI-compatible
`{OPENAI_BASE_URL}/chat/completions` (giống hệt cách `ai_comment_service.py` đang làm cho
tính năng viết comment tự động).

**Đang vướng gì**: biến môi trường **`OPENAI_API_KEY` đang để trống** ở cả `.env` và
`.env.local` trong máy dev hiện tại → tính năng **tự nhận biết và tắt gọn gàng** (nút
disable + tooltip "Chưa cấu hình AI"), không crash, không chặn luồng tạo deal bằng tay. Chỉ
cần điền `OPENAI_API_KEY=sk-...` vào `.env`/`.env.local` rồi **khởi động lại backend**
(uvicorn không tự đọc lại `.env` khi hot-reload code) là dùng được ngay — không cần sửa code
gì thêm. Có endpoint `GET /customer-leads/ai-parse-deal/status` để FE tự kiểm tra đã cấu
hình chưa mà không tốn 1 lần gọi AI thật.

**Tương tự cho AI Contract Copilot** (mục 3) — `contract_ai_service.py` dùng chung 3 biến
`OPENAI_API_KEY/OPENAI_BASE_URL/AI_MODEL`, nên hễ cấu hình được key cho tính năng CRM ở
trên thì Contract Copilot cũng chạy được luôn, không cần cấu hình riêng. Contract Copilot có
thêm 1 lớp fallback riêng: nếu model chính (`AI_MODEL`) báo lỗi "no available channel" (hay
gặp với proxy OpenAI dùng chung), tự thử lần lượt `gpt-4o-mini → gpt-4o → gpt-5-mini →
gpt-5 → gpt-4.1-mini → gpt-4.1` (2 lần mỗi model) trước khi báo lỗi hẳn — CRM chưa có lớp
fallback này, chỉ thử đúng 1 model.

---

## 5. Biến môi trường cần có (`linkedin_group_crawler/.env`)

| Biến | Bắt buộc cho | Trạng thái hiện tại (máy dev) |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Toàn bộ | Đã có |
| `OPENAI_API_KEY` | AI điền nhanh (CRM) + AI Contract Copilot | **Trống — cần backend điền** |
| `OPENAI_BASE_URL` | như trên | Có default `https://api.openai.com/v1` nếu bỏ trống |
| `AI_MODEL` | như trên | Có default `gpt-4o` nếu bỏ trống |
| `TELEGRAM_QUOTE_BOT_TOKEN`, `TELEGRAM_QUOTE_CHAT_ID`, `TELEGRAM_QUOTE_TOPIC_ID` | Gửi báo giá qua Telegram | Đã có trong `.env` (group Markee Team, topic Báo giá) |

---

## 6. Việc cần backend theo dõi/làm tiếp

1. **Đổi số migration trùng 072** trước khi merge nhánh CRM + nhánh Hợp đồng (mục 0).
2. **Điền `OPENAI_API_KEY`** nếu muốn bật AI điền nhanh (CRM) và AI Contract Copilot — 1 key
   dùng chung cho cả 2, không cần làm gì thêm ở code.
3. Race condition nhẹ ở `_next_quote_number()` (mục 2) — sinh số báo giá kiểu check-rồi-
   insert, 2 request tạo báo giá cùng lúc trong cùng 1 phút có thể văng lỗi trùng số thay vì
   tự động nối `-02` — chưa có transaction lock, cân nhắc vá nếu tần suất tạo báo giá đồng
   thời tăng lên.
4. Contract module chưa từng được QA bởi phiên làm việc CRM/Báo giá này — nếu cần audit kỹ
   (tương tự đợt audit đã làm cho Báo giá), nên làm 1 lượt riêng.
