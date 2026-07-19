-- Phase 2 adjustment: Proposal / Sale Kit links are tracked per customer,
-- project/deal, and version. Keep old URL/upload columns for compatibility.

ALTER TABLE public.sales_assets
    ADD COLUMN IF NOT EXISTS customer_lead_id UUID REFERENCES public.customer_leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES public.customer_leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS project_name TEXT,
    ADD COLUMN IF NOT EXISTS version TEXT,
    ADD COLUMN IF NOT EXISTS source_type TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT;

UPDATE public.sales_assets
SET
    source_url = COALESCE(NULLIF(source_url, ''), NULLIF(public_url, ''), NULLIF(file_url, '')),
    source_type = COALESCE(NULLIF(source_type, ''), 'external'),
    version = COALESCE(NULLIF(version, ''), 'v1')
WHERE source_url IS NULL OR source_url = '' OR source_type IS NULL OR source_type = '' OR version IS NULL OR version = '';

ALTER TABLE public.sales_assets
    DROP CONSTRAINT IF EXISTS sales_assets_type_check,
    ADD CONSTRAINT sales_assets_type_check CHECK (
        type IN (
            'proposal',
            'sale_kit',
            'portfolio',
            'other',
            -- Legacy values from migration 033, kept so existing rows stay valid.
            'brochure',
            'case_study',
            'company_profile'
        )
    );

ALTER TABLE public.sales_assets
    DROP CONSTRAINT IF EXISTS sales_assets_source_type_check,
    ADD CONSTRAINT sales_assets_source_type_check CHECK (
        source_type IS NULL OR source_type IN ('canva', 'google_docs', 'google_drive', 'external')
    );

CREATE INDEX IF NOT EXISTS idx_sales_assets_customer_lead_id ON public.sales_assets(customer_lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_assets_deal_id ON public.sales_assets(deal_id);
CREATE INDEX IF NOT EXISTS idx_sales_assets_project_name ON public.sales_assets(project_name);
CREATE INDEX IF NOT EXISTS idx_sales_assets_source_type ON public.sales_assets(source_type);
