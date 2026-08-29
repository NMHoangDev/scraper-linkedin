-- "Tạo cơ hội bán hàng" drawer (CreateOpportunityDrawer.tsx) cần chọn "Nguồn cơ
-- hội": Khách hàng hiện có / Lead Convert / Upsell / Referral. 'Referral' đã có
-- sẵn (SOURCE_OPTIONS cũ + category crm_source). 3 giá trị còn lại chưa tồn tại
-- trong danh mục crm_source (category_type='crm_source', bảng categories) —
-- migration 056 đã bỏ CHECK constraint cứng trên customer_leads.source_platform
-- và giao hẳn việc kiểm soát danh mục nguồn hợp lệ cho bảng `categories`
-- (_validate_source() trong crm_customer_service.py chặn nếu categories có
-- hàng nhưng source không khớp code nào). Migration này CHỈ insert thêm data
-- (additive, idempotent qua NOT EXISTS, không đụng dòng nào có sẵn) — đúng quy
-- tắc "chỉ additive migration" của phiên làm việc, cùng pattern với migration
-- 079 (seed crm_position).
DO $$
DECLARE
    v_rows CONSTANT jsonb := '[
        {"code": "Existing_Customer", "name": "Khách hàng hiện có"},
        {"code": "Lead_Convert", "name": "Lead Convert"},
        {"code": "Upsell", "name": "Upsell"}
    ]'::jsonb;
    v_row jsonb;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.categories
            WHERE category_type = 'crm_source' AND code = v_row->>'code'
        ) THEN
            INSERT INTO public.categories (category_type, code, name, platform, is_active)
            VALUES ('crm_source', v_row->>'code', v_row->>'name', 'all', true);
        END IF;
    END LOOP;
END $$;
