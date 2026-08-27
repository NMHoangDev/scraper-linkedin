-- Module Hợp đồng (Contracts): bảng riêng tách khỏi customer_leads, tương tự cách
-- quotes/quote_forms tách khỏi customer_leads (065_service_catalog.sql). Liên kết
-- deal_id + quote_id để truy vết nguồn (khách hàng CRM + báo giá đã chốt), nhưng
-- không phụ thuộc/không sửa field contract_status/contract_signed_at cũ trên
-- customer_leads (ContractDetailModal.tsx hiện có vẫn dùng field cũ, giữ nguyên).
--
-- clauses lưu JSONB (không tách bảng con như quote_items) vì điều khoản hợp đồng
-- không cần tính toán số học per-row, chỉ cần nội dung có thể sửa (contenteditable
-- phía FE) theo dạng [{id, title, body}].

CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number TEXT NOT NULL UNIQUE,
    deal_id UUID REFERENCES public.customer_leads(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'service',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_legal', 'pending_signature', 'signed',
        'active', 'completed', 'expiring', 'expired', 'terminated'
    )),
    contract_value NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    start_date DATE,
    end_date DATE,
    signed_at TIMESTAMPTZ,
    payment_terms TEXT,
    clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_risk_score INT CHECK (ai_risk_score IS NULL OR (ai_risk_score >= 0 AND ai_risk_score <= 100)),
    ai_review JSONB,
    ai_prompt TEXT,
    version INT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES public.app_users(id),
    updated_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_deal_id ON public.contracts(deal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quote_id ON public.contracts(quote_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.contracts;
CREATE POLICY "Allow authenticated full access" ON public.contracts
    FOR ALL USING (true) WITH CHECK (true);

-- Lịch sử hoạt động hợp đồng (tạo/sửa/đổi trạng thái/AI soạn) — cùng kiểu quote_activity_log.
CREATE TABLE IF NOT EXISTS public.contract_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.app_users(id),
    action TEXT NOT NULL,
    changes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_activity_log_contract_id ON public.contract_activity_log(contract_id);

ALTER TABLE public.contract_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.contract_activity_log;
CREATE POLICY "Allow authenticated full access" ON public.contract_activity_log
    FOR ALL USING (true) WITH CHECK (true);
