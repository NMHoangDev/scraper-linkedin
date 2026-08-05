-- Bug thật: form báo giá có 2 ô riêng "Tên dịch vụ" và "Mô tả", nhưng DB
-- (quote_items) chỉ có 1 cột `description` — nên khi cả 2 ô có nội dung,
-- payload FE gộp `description ?? serviceDescription` khiến "Tên dịch vụ"
-- luôn bị RỚT MẤT (không lưu ở đâu cả), chỉ "Mô tả" được lưu.
-- Thêm cột riêng để lưu đúng cả 2.
ALTER TABLE public.quote_items
    ADD COLUMN IF NOT EXISTS service_description TEXT;

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
            quote_id, description, service_description, unit, quantity, unit_price, vat_rate,
            subtotal_amount, vat_amount, total_amount, sort_order
        ) VALUES (
            p_quote_id,
            COALESCE(v_item->>'description', ''),
            v_item->>'service_description',
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
