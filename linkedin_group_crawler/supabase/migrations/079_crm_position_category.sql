-- ============================================================
-- Migration 079: Chuc vu (job position/title) category-driven select.
--
-- Goal: replace free-text "Chuc vu" inputs across CRM with a
-- category-driven searchable-select, while the legacy free-text
-- `position` TEXT column on every affected table stays completely
-- unmodified in meaning (still the column every existing list/detail
-- view reads). This migration is purely additive:
--   - categories: add nullable is_active (default true) so a position
--     can be "deactivated" (hidden from new-selection search) without
--     ever deleting the row - existing rows referencing it must keep
--     rendering correctly. The other 4 category_type's already wired
--     into CrmCategorySections (crm_industry/crm_source/
--     crm_service_package/crm_package) keep using hard DELETE exactly
--     as before; is_active only gets a UI toggle for category_type=
--     'crm_position' in this pass (see CategoryManagementContent.tsx).
--   - crm_customers / crm_leads / crm_contacts / customer_leads: add
--     nullable position_category_id (FK -> categories.id) and
--     position_label_snapshot (TEXT). Backend mirrors the resolved
--     category name into the existing `position` column server-side
--     so no existing read path needs to change.
-- ============================================================

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_type_active
    ON public.categories(category_type, is_active);

ALTER TABLE public.crm_customers
    ADD COLUMN IF NOT EXISTS position_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position_label_snapshot TEXT;

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS position_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position_label_snapshot TEXT;

ALTER TABLE public.crm_contacts
    ADD COLUMN IF NOT EXISTS position_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position_label_snapshot TEXT;

ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS position_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position_label_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_customers_position_category_id
    ON public.crm_customers(position_category_id) WHERE position_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_position_category_id
    ON public.crm_leads(position_category_id) WHERE position_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_position_category_id
    ON public.crm_contacts(position_category_id) WHERE position_category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_leads_position_category_id
    ON public.customer_leads(position_category_id) WHERE position_category_id IS NOT NULL;

-- Seed the 7 sample "Chuc vu" categories (category_type='crm_position'),
-- active by default. categories has no unique constraint on
-- (category_type, code) so guard idempotency with a NOT EXISTS check per
-- row instead of ON CONFLICT.
DO $$
DECLARE
    v_rows CONSTANT jsonb := '[
        {"code": "Giam_doc", "name": "Giám đốc"},
        {"code": "Chu_doanh_nghiep", "name": "Chủ doanh nghiệp"},
        {"code": "Marketing_Director", "name": "Marketing Director"},
        {"code": "Truong_phong_Marketing", "name": "Trưởng phòng Marketing"},
        {"code": "Truong_phong_IT", "name": "Trưởng phòng IT"},
        {"code": "Ke_toan_truong", "name": "Kế toán trưởng"},
        {"code": "Nhan_vien_mua_hang", "name": "Nhân viên mua hàng"}
    ]'::jsonb;
    v_row jsonb;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.categories
            WHERE category_type = 'crm_position' AND code = v_row->>'code'
        ) THEN
            INSERT INTO public.categories (category_type, code, name, platform, is_active)
            VALUES ('crm_position', v_row->>'code', v_row->>'name', 'all', true);
        END IF;
    END LOOP;
END $$;

COMMENT ON COLUMN public.categories.is_active IS
    'Soft-deactivate flag. false = hidden from new-selection search/dropdowns but existing rows referencing this category id must keep rendering via their own position_label_snapshot. Only category_type=crm_position exposes a deactivate toggle in the admin UI as of migration 079; other types keep hard DELETE.';
COMMENT ON COLUMN public.crm_customers.position_category_id IS
    'FK -> categories.id (category_type=crm_position). Nullable; legacy free-text position column is left unmodified and is mirrored server-side from the resolved category name for backward-compatible display.';
COMMENT ON COLUMN public.crm_customers.position_label_snapshot IS
    'Server-derived snapshot of the category name at save time (never trust a client-supplied value) so a later deactivated/renamed category still displays correctly on this record.';
COMMENT ON COLUMN public.crm_leads.position_category_id IS 'See crm_customers.position_category_id.';
COMMENT ON COLUMN public.crm_leads.position_label_snapshot IS 'See crm_customers.position_label_snapshot.';
COMMENT ON COLUMN public.crm_contacts.position_category_id IS 'See crm_customers.position_category_id.';
COMMENT ON COLUMN public.crm_contacts.position_label_snapshot IS 'See crm_customers.position_label_snapshot.';
COMMENT ON COLUMN public.customer_leads.position_category_id IS 'See crm_customers.position_category_id.';
COMMENT ON COLUMN public.customer_leads.position_label_snapshot IS 'See crm_customers.position_label_snapshot.';
