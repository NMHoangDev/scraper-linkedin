-- Module Form báo giá (Quote Forms) — cho phép tạo mẫu báo giá động, sinh báo giá
-- thật gắn với customer_leads (CRM deal), thay cho field "Tham chiếu báo giá" nhập tay
-- (last_attachment_url/last_attachment_name) trước đây.

CREATE TABLE IF NOT EXISTS public.quote_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    schema_version INTEGER NOT NULL DEFAULT 1,
    layout_type TEXT NOT NULL DEFAULT 'cloudgate_standard_quote',
    schema_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    share_token TEXT,
    share_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES public.customer_leads(id) ON DELETE SET NULL,
    quote_form_id UUID NOT NULL REFERENCES public.quote_forms(id),
    quote_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    form_schema_version INTEGER NOT NULL,
    form_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    issued_at TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    public_token TEXT,
    public_enabled BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
    unit_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
    vat_rate NUMERIC(8, 2) NOT NULL DEFAULT 0,
    subtotal_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Liên kết Deal (customer_leads) -> Quote thật đã tạo qua flow "Thêm deal và báo giá".
-- Deal cũ (chưa từng có quote thật) vẫn giữ nguyên hành vi cũ qua last_attachment_url/name
-- ở tầng repository (rowToDeal fallback), cột này chỉ populate khi có quote thật.
ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_deal_id ON public.quotes(deal_id);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON public.quotes(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_forms_code ON public.quote_forms(code);
CREATE INDEX IF NOT EXISTS idx_quote_forms_share_token ON public.quote_forms(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_customer_leads_quote_id ON public.customer_leads(quote_id);

-- Trigger auto update updated_at (quote_forms, quotes)
CREATE OR REPLACE FUNCTION update_quote_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quote_forms_updated_at
BEFORE UPDATE ON public.quote_forms
FOR EACH ROW
EXECUTE FUNCTION update_quote_forms_updated_at();

CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION update_quotes_updated_at();

-- RLS Policies — cùng pattern với customer_leads (011_customer_leads.sql):
-- CRUD nội bộ qua backend dùng service role (bypass RLS); policy này là lớp phòng thủ
-- nếu có truy vấn trực tiếp bằng user JWT.
ALTER TABLE public.quote_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to quote_forms"
ON public.quote_forms
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to quotes"
ON public.quotes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to quote_items"
ON public.quote_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
