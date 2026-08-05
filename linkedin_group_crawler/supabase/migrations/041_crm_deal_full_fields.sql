-- ============================================================
-- Migration: 041_crm_deal_full_fields.sql
-- Bo sung cac truong CRM (crm-next) truoc gio chi luu tren UI, chua
-- persist xuong DB - xem docs/CRM_NEXT_INTEGRATION_MAPPING.md muc
-- "Fields Requiring Future Backend/DB Support".
-- ============================================================

-- 1. Thong tin lien he + phan loai goi rieng khoi service_package
--    (truoc gio "position"/"package" bi nhet vao tags[] voi prefix
--    crm_position:/crm_package: - gio co cot rieng, tags[] tra ve
--    dung cho tag tu do nhu thiet ke ban dau).
ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS position    TEXT,
    ADD COLUMN IF NOT EXISTS crm_package TEXT,
    ADD COLUMN IF NOT EXISTS zalo        TEXT,
    ADD COLUMN IF NOT EXISTS facebook    TEXT,
    ADD COLUMN IF NOT EXISTS telegram    TEXT;

-- 2. Ly do tam dung rieng khoi note chung, va thoi diem dong deal
--    rieng khoi customer_since/updated_at (truoc gio dung tam fallback).
ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS pause_reason TEXT,
    ADD COLUMN IF NOT EXISTS closed_at    TIMESTAMPTZ;

-- 3. Chi tiet danh gia Won/Lost (25 truong o OutcomeInfo: confidence,
--    reasons, rootCause, evidence, competitor, fitScore, repeat,
--    improve, cac truong knowledge-base...) - luu JSONB thay vi nhet
--    JSON string vao closed_reason (closed_reason tu gio chi con la
--    text ly do ngan, dung dung nghia cot).
ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS outcome_detail JSONB;

-- 4. Mo rong contract_status ho tro du 7 gia tri cua crm-next, khong
--    con chi 3 gia tri active/completed/maintenance. Giu nguyen 3 gia
--    tri cu de khong pha du lieu hien co.
ALTER TABLE public.customer_leads
    DROP CONSTRAINT IF EXISTS customer_leads_contract_status_check;
ALTER TABLE public.customer_leads
    ADD CONSTRAINT customer_leads_contract_status_check
    CHECK (contract_status IN (
        'active', 'completed', 'maintenance',
        'moi_tiep_nhan', 'dang_xu_ly', 'da_bao_gia', 'dang_dam_phan',
        'da_chot', 'tam_dung', 'khong_hoat_dong'
    ));

-- 5. Backfill du lieu cu dang nhet trong tags[] (crm_position:/
--    crm_package:) sang cot that, roi don sach tag noi bo khoi tags[].
UPDATE public.customer_leads
SET position = (
    SELECT substring(tag FROM length('crm_position:') + 1)
    FROM unnest(tags) AS tag
    WHERE tag LIKE 'crm_position:%'
    LIMIT 1
)
WHERE position IS NULL
  AND EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag LIKE 'crm_position:%');

UPDATE public.customer_leads
SET crm_package = (
    SELECT substring(tag FROM length('crm_package:') + 1)
    FROM unnest(tags) AS tag
    WHERE tag LIKE 'crm_package:%'
    LIMIT 1
)
WHERE crm_package IS NULL
  AND EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag LIKE 'crm_package:%');

UPDATE public.customer_leads
SET tags = ARRAY(
    SELECT tag FROM unnest(tags) AS tag
    WHERE tag NOT LIKE 'crm_position:%' AND tag NOT LIKE 'crm_package:%'
)
WHERE EXISTS (
    SELECT 1 FROM unnest(tags) AS tag
    WHERE tag LIKE 'crm_position:%' OR tag LIKE 'crm_package:%'
);

-- 6. Backfill outcome_detail tu closed_reason dang duoc serialize voi
--    prefix "CRM_OUTCOME_V1:" (xem SeedingCrmRepository.ts serializeOutcome).
--    Sau backfill, code moi se doc/ghi outcome_detail truc tiep, con
--    closed_reason quay lai dung nghia "ly do dong deal" (text ngan).
UPDATE public.customer_leads
SET outcome_detail = substring(closed_reason FROM length('CRM_OUTCOME_V1:') + 1)::jsonb
WHERE closed_reason LIKE 'CRM_OUTCOME_V1:%'
  AND outcome_detail IS NULL;

UPDATE public.customer_leads
SET closed_reason = COALESCE(outcome_detail->>'reasonText', outcome_detail->>'rootCause', NULL)
WHERE closed_reason LIKE 'CRM_OUTCOME_V1:%';
