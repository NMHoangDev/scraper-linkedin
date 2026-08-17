-- 1) quote_approve trước đây chỉ cho chuyển 'draft' -> 'approved'. Báo giá cũ
--    (tạo trước migration 059 — quote_approval_workflow, đổi số từ 053 khi merge
--    dev vào main để tránh trùng với migration 053 của dev) có status='confirmed'
--    — sửa được (quote_update
--    không chặn 'confirmed') nhưng KHÔNG duyệt được vì bị RPC từ chối, dù CRM
--    card đã coi 'confirmed' là "chưa duyệt, sửa được" (xem DetailDrawer.tsx).
--    Cho phép duyệt cả từ 'confirmed', không chỉ 'draft'.
CREATE OR REPLACE FUNCTION public.quote_approve(
    p_quote_id UUID, p_actor_id UUID, p_public_token TEXT
) RETURNS public.quotes
LANGUAGE plpgsql
AS $$
DECLARE
    v_quote public.quotes;
    v_item_count INT;
BEGIN
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'quote_not_found';
    END IF;
    IF v_quote.status = 'approved' THEN
        RETURN v_quote;
    END IF;
    IF v_quote.status NOT IN ('draft', 'confirmed') THEN
        RAISE EXCEPTION 'quote_not_in_draft_status';
    END IF;

    SELECT count(*) INTO v_item_count FROM public.quote_items WHERE quote_id = p_quote_id;
    IF v_item_count = 0 OR v_quote.total_amount IS NULL OR v_quote.total_amount <= 0 THEN
        RAISE EXCEPTION 'quote_missing_required_fields';
    END IF;

    UPDATE public.quotes SET
        status = 'approved',
        approved_by = p_actor_id,
        approved_at = NOW(),
        public_token = COALESCE(public_token, p_public_token),
        public_enabled = true
    WHERE id = p_quote_id
    RETURNING * INTO v_quote;

    INSERT INTO public.quote_activity_log (quote_id, actor_id, action, changes)
    VALUES (p_quote_id, p_actor_id, 'approved', NULL);

    RETURN v_quote;
END;
$$;

-- 2) Leader mac dinh duoc duyet bao gia (nhu admin), nhung phai qua cot
--    can_approve_quotes (khong hard-code role trong code nua) de admin van
--    tuy chinh duoc tung nguoi qua UI Quan ly thanh vien. Backfill true cho
--    leader hien co; tu nay ve sau khi thang role len leader se tu bat co nay
--    (xem update_user_role() o app/modules/all_platform/services/supabase_user_service.py).
UPDATE public.app_users SET can_approve_quotes = true
WHERE role = 'leader' AND can_approve_quotes = false;
