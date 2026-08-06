-- Parent/child quote items + per-item discount.
-- parent_item_id IS NULL: parent service. Non-null: one child service under a
-- parent in the same quote. Totals are calculated per row; parent discount does
-- not apply to children.

ALTER TABLE public.quote_items
    ADD COLUMN IF NOT EXISTS parent_item_id UUID REFERENCES public.quote_items(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_after_discount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.quote_items
    DROP CONSTRAINT IF EXISTS quote_items_discount_percent_check;
ALTER TABLE public.quote_items
    ADD CONSTRAINT quote_items_discount_percent_check
    CHECK (discount_percent >= 0 AND discount_percent <= 100);

ALTER TABLE public.quote_items
    DROP CONSTRAINT IF EXISTS quote_items_vat_rate_check;
ALTER TABLE public.quote_items
    ADD CONSTRAINT quote_items_vat_rate_check
    CHECK (vat_rate >= 0 AND vat_rate <= 100);

UPDATE public.quote_items
SET
    discount_percent = COALESCE(discount_percent, 0),
    discount_amount = COALESCE(discount_amount, 0),
    amount_after_discount = CASE
        WHEN COALESCE(amount_after_discount, 0) = 0 AND COALESCE(subtotal_amount, 0) <> 0
            THEN COALESCE(subtotal_amount, 0) - COALESCE(discount_amount, 0)
        ELSE COALESCE(amount_after_discount, 0)
    END;

CREATE INDEX IF NOT EXISTS idx_quote_items_parent_item_id ON public.quote_items(parent_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_parent_sort ON public.quote_items(quote_id, parent_item_id, sort_order);

CREATE OR REPLACE FUNCTION public.quote_items_validate_parent_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_quote_id UUID;
BEGIN
    IF NEW.parent_item_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT quote_id INTO v_parent_quote_id
    FROM public.quote_items
    WHERE id = NEW.parent_item_id;

    IF v_parent_quote_id IS NULL THEN
        RAISE EXCEPTION 'quote_item_parent_not_found';
    END IF;
    IF v_parent_quote_id <> NEW.quote_id THEN
        RAISE EXCEPTION 'quote_item_parent_quote_mismatch';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quote_items_validate_parent_quote ON public.quote_items;
CREATE TRIGGER trg_quote_items_validate_parent_quote
BEFORE INSERT OR UPDATE OF parent_item_id, quote_id ON public.quote_items
FOR EACH ROW
EXECUTE FUNCTION public.quote_items_validate_parent_quote();

CREATE OR REPLACE FUNCTION public.quote_update(
    p_quote_id UUID, p_actor_id UUID, p_data JSONB, p_items JSONB, p_changes JSONB
) RETURNS public.quotes
LANGUAGE plpgsql
AS $$
DECLARE
    v_quote public.quotes;
    v_subtotal NUMERIC := 0;
    v_discount NUMERIC := 0;
    v_vat NUMERIC := 0;
    v_total NUMERIC := 0;
    v_item JSONB;
    v_child JSONB;
    v_parent_id UUID;
    v_parent_index INT := 0;
    v_child_index INT;
    v_qty NUMERIC;
    v_unit_price NUMERIC;
    v_vat_rate NUMERIC;
    v_discount_pct NUMERIC;
    v_item_subtotal NUMERIC;
    v_item_discount NUMERIC;
    v_item_after_discount NUMERIC;
    v_item_vat NUMERIC;
    v_item_total NUMERIC;
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
        v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
        v_unit_price := COALESCE((v_item->>'unit_price')::numeric, 0);
        v_vat_rate := COALESCE((v_item->>'vat_rate')::numeric, 0);
        v_discount_pct := COALESCE((v_item->>'discount_percent')::numeric, 0);
        IF v_discount_pct < 0 OR v_discount_pct > 100 OR v_vat_rate < 0 OR v_vat_rate > 100 THEN
            RAISE EXCEPTION 'quote_item_invalid_percent';
        END IF;
        v_item_subtotal := v_qty * v_unit_price;
        v_item_discount := v_item_subtotal * v_discount_pct / 100;
        v_item_after_discount := v_item_subtotal - v_item_discount;
        v_item_vat := v_item_after_discount * v_vat_rate / 100;
        v_item_total := v_item_after_discount + v_item_vat;

        INSERT INTO public.quote_items (
            quote_id, parent_item_id, description, service_description, unit, quantity, unit_price,
            discount_percent, discount_amount, amount_after_discount, vat_rate,
            subtotal_amount, vat_amount, total_amount, sort_order
        ) VALUES (
            p_quote_id, NULL,
            COALESCE(v_item->>'description', ''),
            v_item->>'service_description',
            v_item->>'unit',
            v_qty, v_unit_price, v_discount_pct, v_item_discount, v_item_after_discount, v_vat_rate,
            v_item_subtotal, v_item_vat, v_item_total, v_parent_index
        )
        RETURNING id INTO v_parent_id;

        v_subtotal := v_subtotal + v_item_subtotal;
        v_discount := v_discount + v_item_discount;
        v_vat := v_vat + v_item_vat;
        v_total := v_total + v_item_total;

        v_child_index := 0;
        FOR v_child IN SELECT * FROM jsonb_array_elements(COALESCE(v_item->'children', '[]'::jsonb)) LOOP
            v_qty := COALESCE((v_child->>'quantity')::numeric, 0);
            v_unit_price := COALESCE((v_child->>'unit_price')::numeric, 0);
            v_vat_rate := COALESCE((v_child->>'vat_rate')::numeric, 0);
            v_discount_pct := COALESCE((v_child->>'discount_percent')::numeric, 0);
            IF v_discount_pct < 0 OR v_discount_pct > 100 OR v_vat_rate < 0 OR v_vat_rate > 100 THEN
                RAISE EXCEPTION 'quote_item_invalid_percent';
            END IF;
            v_item_subtotal := v_qty * v_unit_price;
            v_item_discount := v_item_subtotal * v_discount_pct / 100;
            v_item_after_discount := v_item_subtotal - v_item_discount;
            v_item_vat := v_item_after_discount * v_vat_rate / 100;
            v_item_total := v_item_after_discount + v_item_vat;

            INSERT INTO public.quote_items (
                quote_id, parent_item_id, description, service_description, unit, quantity, unit_price,
                discount_percent, discount_amount, amount_after_discount, vat_rate,
                subtotal_amount, vat_amount, total_amount, sort_order
            ) VALUES (
                p_quote_id, v_parent_id,
                COALESCE(v_child->>'description', ''),
                v_child->>'service_description',
                v_child->>'unit',
                v_qty, v_unit_price, v_discount_pct, v_item_discount, v_item_after_discount, v_vat_rate,
                v_item_subtotal, v_item_vat, v_item_total, v_child_index
            );

            v_subtotal := v_subtotal + v_item_subtotal;
            v_discount := v_discount + v_item_discount;
            v_vat := v_vat + v_item_vat;
            v_total := v_total + v_item_total;
            v_child_index := v_child_index + 1;
        END LOOP;

        v_parent_index := v_parent_index + 1;
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
