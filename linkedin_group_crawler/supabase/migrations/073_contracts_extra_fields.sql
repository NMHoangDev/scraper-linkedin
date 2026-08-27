-- Bổ sung field còn thiếu so với mockup UI (crm-trung-tam-sale-ai-hop-dong-v8.html,
-- module "contracts"): cột PHỤ TRÁCH, TIẾN ĐỘ (%), THANH TOÁN (% đã thu) trên bảng
-- danh sách hợp đồng — 069_contracts.sql chưa có 3 field này.

ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.app_users(id),
    ADD COLUMN IF NOT EXISTS progress_percent INT NOT NULL DEFAULT 0
        CHECK (progress_percent >= 0 AND progress_percent <= 100),
    ADD COLUMN IF NOT EXISTS payment_collected_percent INT NOT NULL DEFAULT 0
        CHECK (payment_collected_percent >= 0 AND payment_collected_percent <= 100);

CREATE INDEX IF NOT EXISTS idx_contracts_owner_id ON public.contracts(owner_id);
