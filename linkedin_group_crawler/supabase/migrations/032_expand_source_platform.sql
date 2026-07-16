-- Mở rộng danh sách source_platform hợp lệ cho customer_leads.
--
-- Dropdown "Nguồn" ở CRM (SOURCE_OPTIONS trong crmConfig.ts) cho chọn 7 nguồn:
-- Manual, FB_Inbox, FB_Group, Zalo, Website, Referral, MarkeeChat — nhưng
-- constraint gốc ở migration 017_expand_customers.sql chỉ cho phép 4 giá trị
-- đầu, khiến tạo deal với nguồn Website/Referral/MarkeeChat luôn lỗi.
--
-- Constraint gốc được thêm ẩn danh qua ADD COLUMN ... CHECK (...) nên không rõ
-- tên chính xác Postgres tự sinh — tìm động theo pg_constraint thay vì đoán tên,
-- để chạy an toàn dù tên constraint thực tế trên production là gì.
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

ALTER TABLE public.customer_leads
    ADD CONSTRAINT customer_leads_source_platform_check
    CHECK (source_platform IN (
        'Manual', 'FB_Inbox', 'FB_Group', 'Zalo', 'Website', 'Referral', 'MarkeeChat'
    ));
