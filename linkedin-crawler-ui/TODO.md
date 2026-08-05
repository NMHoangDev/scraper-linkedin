# TODO — Thư viện Extension UI

- [x] 1. Tạo file dữ liệu `lib/extensions-data.ts` export `ExtensionItem[]` (6 extensions).
- [x] 2. Rewrite page `app/(all-platform)/all-platform/library/extensions/page.tsx` render từ data:
      - Grid responsive (3/2/1 cột), card cao đều.
      - Badge Available (xanh) / Internal (amber).
      - Available: [Tải Extension] [Mở cấu hình] [Video hướng dẫn (nếu có)].
      - Internal: ẩn tải/config/video, hiện "Liên hệ admin để lấy bản cài đặt".
      - Accordion "Hướng dẫn" (chỉ mở 1 card).
- [x] 3. Chạy `npm run type-check`.
- [x] 4. Chạy `npm run lint`.
- [x] 5. Chạy `npm run dev` (đã khởi động) để kiểm tra trực quan.
