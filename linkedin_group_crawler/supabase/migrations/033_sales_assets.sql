-- Shared sales document library for Proposal / Portfolio / Sale Kit.
-- Assets are archived instead of hard-deleted so old CRM activity logs keep
-- their links/history intact.

CREATE TABLE IF NOT EXISTS public.sales_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (
        type IN (
            'proposal',
            'portfolio',
            'sale_kit',
            'brochure',
            'case_study',
            'company_profile'
        )
    ),
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    industry TEXT,
    service_package TEXT,
    file_url TEXT,
    public_url TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sales_assets_type ON public.sales_assets(type);
CREATE INDEX IF NOT EXISTS idx_sales_assets_status ON public.sales_assets(status);
CREATE INDEX IF NOT EXISTS idx_sales_assets_created_by ON public.sales_assets(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_assets_tags ON public.sales_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sales_assets_updated_at ON public.sales_assets(updated_at DESC);

CREATE OR REPLACE FUNCTION update_sales_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_assets_updated_at ON public.sales_assets;
CREATE TRIGGER trg_sales_assets_updated_at
BEFORE UPDATE ON public.sales_assets
FOR EACH ROW
EXECUTE FUNCTION update_sales_assets_updated_at();

ALTER TABLE public.sales_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to sales_assets" ON public.sales_assets;
CREATE POLICY "Allow authenticated full access to sales_assets"
ON public.sales_assets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
