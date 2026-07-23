-- ============================================================
-- Migration 052: Thêm billing_type cho customer_leads.
--
-- Boi canh: sep yeu cau CRM phan biet duoc "don 1 lan" (vd outsource
-- theo nam) voi "don theo thang" (SaaS thu phi hang thang) - hien
-- customer_leads chi co estimated_budget/lifetime_value, khong biet
-- so tien do la mot lan hay lap lai theo chu ky nao.
--
-- default 'one_time' de tuong thich nguoc voi toan bo deal cu (khong
-- biet chu ky = coi nhu mot lan, dung tinh than cac cot optional khac
-- trong file nay - vd contract_status, payment_status).
-- ============================================================

ALTER TABLE customer_leads
    ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'one_time'
    CHECK (billing_type IN ('one_time', 'monthly', 'yearly'));

CREATE INDEX IF NOT EXISTS idx_customer_leads_billing_type ON customer_leads(billing_type);
