-- Gỡ CHECK constraint cứng trên customer_leads.source_platform.
--
-- Migration 032 (customer_leads_source_platform_check) hardcode whitelist 7 giá
-- trị (Manual, FB_Inbox, FB_Group, Zalo, Website, Referral, MarkeeChat). Nhưng
-- SOURCE_OPTIONS ở CRM (crmConfig.ts) từ lâu đã cho leader/admin tự thêm nguồn
-- mới qua trang "Danh mục" (category_type='crm_source', bảng categories) —
-- danh sách này không tĩnh nữa. Hệ quả: chọn 1 nguồn tự thêm (vd "Personal")
-- rồi lưu deal là bị Postgres từ chối ngay ở CHECK constraint, và vì form CRM
-- luôn gửi lại toàn bộ payload (kể cả source_platform) mỗi lần save, MỌI lần
-- sửa deal đó — kể cả admin, kể cả không đụng ô Nguồn — đều fail theo.
--
-- Việc kiểm soát danh mục nguồn hợp lệ giờ do bảng `categories` đảm nhiệm ở
-- tầng app (xem categories.py + useCrm.ts mergeCategoryOptions), nên bỏ hẳn
-- CHECK ở DB thay vì cố đồng bộ 2 whitelist riêng biệt mỗi khi có nguồn mới.
DO $$
DECLARE
    existing_constraint text;
BEGIN
    SELECT con.conname INTO existing_constraint
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'customer_leads'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%source_platform%';

    IF existing_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.customer_leads DROP CONSTRAINT %I', existing_constraint);
    END IF;
END $$;
