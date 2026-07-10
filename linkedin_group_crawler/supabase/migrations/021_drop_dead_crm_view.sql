-- v_customer_leads_with_stage (từ 020_crm_pipeline.sql) tính lại days_in_stage bằng SQL
-- nhưng không có nơi nào trong code dùng view này — service tính days_in_stage tại
-- runtime trong customer_lead_service._normalize_row(). Xoá view chết.
DROP VIEW IF EXISTS v_customer_leads_with_stage;
