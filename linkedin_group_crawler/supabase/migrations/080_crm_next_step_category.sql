-- ============================================================
-- Migration 080: "Viec tiep theo" (next step) category list for the
-- redesigned "Xac minh Lead" drawer.
--
-- Goal: the "SDR/Sale can lam gi tiep" field in the Lead verification flow
-- must be a dropdown driven by an admin-manageable category list instead of
-- a free-text input, exactly like Chuc vu (migration 079).
--
-- Purely additive, and deliberately DDL-free:
--   - No new column on crm_leads. The chosen option's LABEL is stored in the
--     already-existing `crm_leads.next_step` TEXT column (same column every
--     existing list/detail/deal-convert read path already uses, including
--     crm_convert_lead()'s COALESCE(p_deal->>'next_step', v_lead.next_step)).
--     The drawer resolves the label back to a category id on load. Adding a
--     next_step_category_id column was considered and rejected: it would buy
--     nothing here (there is no rename-safety requirement on next_step the
--     way there was for position_label_snapshot) while forcing schema drift
--     on a hot table.
--   - This migration therefore only SEEDS 6 rows into public.categories with
--     the new category_type='crm_next_step'. `categories` already has
--     is_active from 079; the new type is exposed as the 6th section of
--     CrmCategorySections in CategoryManagementContent.tsx so leaders can
--     add/edit/remove options without a code change.
--
-- Idempotent: categories has no unique constraint on (category_type, code),
-- so guard per-row with NOT EXISTS instead of ON CONFLICT (same as 079).
-- ============================================================

DO $$
DECLARE
    v_rows CONSTANT jsonb := '[
        {"code": "Goi_lai", "name": "Gọi lại"},
        {"code": "Gui_tai_lieu", "name": "Gửi tài liệu"},
        {"code": "Demo_tu_van", "name": "Demo/Tư vấn"},
        {"code": "Gui_bao_gia", "name": "Gửi báo giá"},
        {"code": "Theo_doi_lai", "name": "Theo dõi lại"},
        {"code": "Khac", "name": "Khác"}
    ]'::jsonb;
    v_row jsonb;
BEGIN
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.categories
            WHERE category_type = 'crm_next_step' AND code = v_row->>'code'
        ) THEN
            INSERT INTO public.categories (category_type, code, name, platform, is_active)
            VALUES ('crm_next_step', v_row->>'code', v_row->>'name', 'all', true);
        END IF;
    END LOOP;
END $$;
