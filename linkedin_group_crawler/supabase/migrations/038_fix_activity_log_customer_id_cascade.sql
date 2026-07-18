-- Xóa deal CRM (customer_leads) đang lỗi 23502 not-null violation trên
-- customer_lead_activity_log.customer_id khi xóa deal.
--
-- Migration 021_crm_pipeline.sql định nghĩa FK này là ON DELETE CASCADE, nhưng
-- constraint thực tế trên production lại là ON DELETE SET NULL (có thể bị đổi
-- tay qua Supabase dashboard) -- customer_id lại NOT NULL, nên Postgres cố
-- set NULL rồi tự chặn bởi chính ràng buộc NOT NULL, xóa deal nào cũng lỗi.
--
-- Tìm động theo pg_constraint thay vì đoán tên, chạy an toàn dù tên constraint
-- thực tế trên production là gì.
DO $$
DECLARE
    existing_constraint text;
BEGIN
    SELECT con.conname INTO existing_constraint
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'customer_lead_activity_log'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%customer_leads%';

    IF existing_constraint IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.customer_lead_activity_log DROP CONSTRAINT %I', existing_constraint);
    END IF;
END $$;

ALTER TABLE public.customer_lead_activity_log
    ADD CONSTRAINT customer_lead_activity_log_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.customer_leads(id) ON DELETE CASCADE;
