-- Giam gia % tren TONG TRUOC THUE (subtotal), VAT tinh lai tren phan da giam.
-- Vi giam gia nhan deu len moi dong va VAT moi dong tuyen tinh theo subtotal
-- dong do, tong VAT sau giam = tong VAT goc x (1 - %/100) - dung cho ca
-- truong hop cac dong co VAT % khac nhau (cung cong thuc voi
-- quoteCalculations.ts va _apply_discount() phia Python, giu 3 noi tinh
-- khop nhau tuyet doi). subtotal_amount LUU GOC (chua tru giam gia) - tien
-- giam gia hien thi la gia tri suy ra (subtotal_amount * discountPercent/100),
-- khong luu cot rieng - discountPercent nam trong quotes.data (JSONB) nhu moi
-- field bao gia khac, khong can migrate schema them.
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
    v_discount_pct NUMERIC := 0;
    v_merged_data JSONB;
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

    v_merged_data := COALESCE(p_data, v_quote.data);
    v_discount_pct := GREATEST(0, LEAST(100, COALESCE((v_merged_data->>'discountPercent')::numeric, 0)));
    IF v_discount_pct > 0 THEN
        v_vat := v_vat * (100 - v_discount_pct) / 100;
        v_total := v_subtotal - (v_subtotal * v_discount_pct / 100) + v_vat;
    END IF;

    UPDATE public.quotes SET
        data = v_merged_data,
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
