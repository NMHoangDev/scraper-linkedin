-- Luồng duyệt Báo giá: tách "Tạo" (luôn ra draft, khoá link public) khỏi "Duyệt"
-- (hành động riêng, có kiểm tra quyền, khoá chỉnh sửa vĩnh viễn + mới sinh link public).
-- Quote cũ (status='confirmed', tạo trước migration này) giữ nguyên hành vi — không
-- hồi tố, public link cũ vẫn hoạt động (xem get_public_quote: status IN ('approved','confirmed')).

ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
    CHECK (status IN ('draft', 'confirmed', 'approved', 'cancelled'));

ALTER TABLE public.quotes
    ADD COLUMN IF NOT EXISTS updated_by  UUID REFERENCES public.app_users(id),
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.app_users(id),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Quyen duyet bao gia: co boolean rieng tren app_users (giong pattern is_active),
-- admin toggle qua trang Quan ly thanh vien. Admin luon duyet duoc du khong bat co nay.
ALTER TABLE public.app_users
    ADD COLUMN IF NOT EXISTS can_approve_quotes BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.quote_activity_log (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id   UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    actor_id   UUID REFERENCES public.app_users(id),
    action     TEXT NOT NULL,  -- 'created' | 'updated' | 'approved' | 'cancelled'
    changes    JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_activity_log_quote_id ON public.quote_activity_log(quote_id);

ALTER TABLE public.quote_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access to quote_activity_log"
ON public.quote_activity_log
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ── RPC functions: cap nhat/duyet bao gia phai chay atomic (xoa+chen lai items,
-- tinh lai tong, ghi log — tat ca hoac khong gi). postgrest moi request la 1
-- transaction rieng, nen goi qua supabase.rpc(...) thay vi nhieu lenh REST roi rac.

CREATE OR REPLACE FUNCTION public.quote_update(
    p_quote_id UUID, p_actor_id UUID, p_data JSONB, p_items JSONB, p_changes JSONB
) RETURNS public.quotes
LANGUAGE plpgsql
AS $$
DECLARE
    v_quote public.quotes;
    v_subtotal NUMERIC := 0;
    v_vat NUMERIC := 0;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_item_subtotal NUMERIC;
    v_item_vat NUMERIC;
    v_item_total NUMERIC;
    v_index INT := 0;
BEGIN
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'quote_not_found';
    END IF;
    IF v_quote.status = 'approved' THEN
        RAISE EXCEPTION 'quote_already_approved';
    END IF;

    DELETE FROM public.quote_items WHERE quote_id = p_quote_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        v_item_subtotal := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'unit_price')::numeric, 0);
        v_item_vat := v_item_subtotal * COALESCE((v_item->>'vat_rate')::numeric, 0) / 100;
        v_item_total := v_item_subtotal + v_item_vat;
        INSERT INTO public.quote_items (
            quote_id, description, unit, quantity, unit_price, vat_rate,
            subtotal_amount, vat_amount, total_amount, sort_order
        ) VALUES (
            p_quote_id,
            COALESCE(v_item->>'description', ''),
            v_item->>'unit',
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'unit_price')::numeric, 0),
            COALESCE((v_item->>'vat_rate')::numeric, 0),
            v_item_subtotal, v_item_vat, v_item_total, v_index
        );
        v_subtotal := v_subtotal + v_item_subtotal;
        v_vat := v_vat + v_item_vat;
        v_total := v_total + v_item_total;
        v_index := v_index + 1;
    END LOOP;

    UPDATE public.quotes SET
        data = COALESCE(p_data, data),
        subtotal_amount = v_subtotal,
        vat_amount = v_vat,
        total_amount = v_total,
        updated_by = p_actor_id
    WHERE id = p_quote_id
    RETURNING * INTO v_quote;

    INSERT INTO public.quote_activity_log (quote_id, actor_id, action, changes)
    VALUES (p_quote_id, p_actor_id, 'updated', p_changes);

    RETURN v_quote;
END;
$$;

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
        -- Idempotent: bam Duyet 2 lan (double-click/retry) khong tao them token/log moi.
        RETURN v_quote;
    END IF;
    IF v_quote.status <> 'draft' THEN
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

CREATE OR REPLACE FUNCTION public.quote_update_and_approve(
    p_quote_id UUID, p_actor_id UUID, p_data JSONB, p_items JSONB, p_changes JSONB, p_public_token TEXT
) RETURNS public.quotes
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.quote_update(p_quote_id, p_actor_id, p_data, p_items, p_changes);
    RETURN public.quote_approve(p_quote_id, p_actor_id, p_public_token);
END;
$$;
