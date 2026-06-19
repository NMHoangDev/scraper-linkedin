# Cột Google Sheet cần bổ sung (Facebook + LinkedIn)

Dùng cho màn **Groups**, **Crawl form**, **Post feed** theo mock `groups-dashboard-redesign.html` và `crawl-form-redesign.html`.

## 1. Tab quản lý nhóm Facebook (`GroupManagement` / API `GET /api/v1/groups`)

| Cột (tên cột) | Kiểu | Bắt buộc | Ví dụ |
|---------------|------|----------|--------|
| `group_name` | text | Có | `Marketing Việt Nam Pro` |
| `url` | text (URL) | Có | `https://www.facebook.com/groups/marketingvn` |
| `intent` | text | Khuyến nghị | `Tuyển dụng IT` |
| `members` | number | Không | `48200` |
| `posts_per_week` | number | Không | `62` |
| `health_score` | number (0–100) | Không | `88` |
| `status` | enum | Không | `ACTIVE` \| `IDLE` \| `DEAD` |
| `last_crawl` | datetime / text ISO | Không | `2026-05-18 14:30:00` |
| `date_crawl` | date | Không | `2026-05-18` |
| **`industry`** | text | Không | `Marketing` |
| **`tier`** | number 1–3 | Không | `1` |
| **`team`** | text (CSV hoặc JSON array) | Không | `Sales,Marketing` hoặc `["Sales","Marketing"]` |
| **`icp`** | text (CSV hoặc JSON array) | Không | `Marketing Mgr,CMO` |
| **`icp_desc`** | text | Không | `Quản lý marketing SME` |
| **`platform`** | text | Không | `facebook` |

## 2. Tab nhóm LinkedIn (sheet URL nhóm / n8n `get-all-groups`)

| Cột | Kiểu | Ví dụ |
|-----|------|--------|
| `URL_Nhóm` / `url_group` | URL | `https://www.linkedin.com/groups/123` |
| `Tên nhóm` / `group_name` | text | `HR Vietnam` |
| `Loại_nhóm` / `type` | text | `Group cào` |
| `member` | number | `1200` |
| `Trạng thái` / `status` | text | `done` / `active` |
| **`industry`** | text | `HR` |
| **`tier`** | number | `2` |
| **`team`** | text CSV | `BD` |
| **`icp`** | text CSV | `HR Manager` |

## 3. Tab bài viết Facebook (post feed / crawl output)

| Cột | Kiểu | Ví dụ |
|-----|------|--------|
| `group_name` | text | `Marketing VN` |
| `link_group` | URL | `https://facebook.com/groups/...` |
| `url` | URL bài | `https://facebook.com/groups/.../posts/...` |
| `content` | text | Nội dung bài |
| `date` / `dateCrawl` | datetime | `2026-05-19 08:00:00` |
| `intent` | text | `Tuyển dụng` |
| `reactions` | number | `45` |
| `comments` | number | `12` |
| `shares` | number | `3` |
| `score` | number | `72` |
| **`platform`** | text | `facebook` |

## 4. Tab bài LinkedIn (đã có — giữ nguyên)

Các cột hiện tại: `URL_Bài_Viết`, `Email_crawl`, `ID_session_crawl`, `reaction`, `comment`, `Số like`, `Số comment`, `Điểm`, `Ngày`, v.v.

Khuyến nghị thêm (tuỳ chọn):

| Cột | Kiểu | Ví dụ |
|-----|------|--------|
| **`industry`** | text | `Công Nghệ` (copy từ group) |
| **`tier`** | number | `1` |

## Webhook LinkedIn (form chung — add / update)

Form **Groups chung** và **Crawl form** gửi thêm (tùy chọn) qua `/api/linkedin/groups/add` và `/update`:

| Field | Add | Update (khi đổi) |
|-------|-----|------------------|
| `industry`, `tier`, `team`, `icp`, `icp_desc` | Có | `new_*` tương ứng |
| `platform` | Mặc định `linkedin` | `new_platform` |

## Ghi chú lưu sheet

- `team` / `icp`: backend có thể ghi **chuỗi CSV**; FE parse thành mảng.
- `tier`: chỉ nhận `1`, `2`, `3`.
- `status` Facebook: map UI «Sống» → `ACTIVE`, «Chết» → `DEAD`, «Ít HĐ» → `IDLE`.
