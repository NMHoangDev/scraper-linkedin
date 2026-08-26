-- Đơn vị phát hành báo giá (bên bán, vd SecurityZone/Cloudgate/Markee) — tách biệt
-- với khách hàng CRM (bên nhận, bảng customer_leads). Chọn ở Bước 1 wizard tạo báo
-- giá; thông tin được SNAPSHOT thẳng vào quotes.data lúc tạo/sửa (không live-join
-- lại bảng này khi hiển thị báo giá đã lưu) — sửa công ty ở đây chỉ ảnh hưởng báo
-- giá tạo/sửa SAU thời điểm sửa, không đụng báo giá cũ.
--
-- Chưa có trang quản trị CRUD cho bảng này (đợt sau nếu cần) — sửa thông tin công ty
-- (địa chỉ/người liên hệ/SĐT/MST/logo còn thiếu ở data seed dưới) làm trực tiếp qua
-- DB/Supabase Studio.

CREATE TABLE quote_issuer_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,           -- "SZ" | "CG" | "MK", định danh nội bộ (KHÔNG dùng trong số báo giá)
  legal_name TEXT NOT NULL,
  brand_name TEXT,
  address TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_code TEXT,
  logo_url TEXT,
  default_quote_form_id UUID REFERENCES quote_forms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE quotes
  ADD COLUMN issuer_company_id UUID REFERENCES quote_issuer_companies(id) ON DELETE SET NULL;

ALTER TABLE quote_forms
  ADD COLUMN is_default_template BOOLEAN NOT NULL DEFAULT false;

-- Chỉ cho phép đúng 1 mẫu mặc định active tại 1 thời điểm — tránh 2 mẫu cùng gắn
-- is_default_template=true khiến frontend không biết chọn mẫu nào làm fallback.
CREATE UNIQUE INDEX quote_forms_one_default_template
  ON quote_forms ((is_default_template))
  WHERE is_default_template = true;

INSERT INTO quote_issuer_companies (code, legal_name, address, contact_name, phone, email, website, tax_code, sort_order)
VALUES
  ('SZ', 'SecurityZone', NULL, NULL, NULL, NULL, NULL, NULL, 0),
  ('CG', 'CÔNG TY TNHH CLOUDGATE', NULL, NULL, NULL, 'sales@getcloudgate.com', 'Getcloudgate.com', NULL, 1),
  ('MK', 'MARKEE AI', 'TP. Hồ Chí Minh', NULL, NULL, 'sales@markee.vn', 'markee.vn', NULL, 2)
ON CONFLICT (code) DO NOTHING;

-- Redefine quote_update (gốc 059, đã redefine ở 062/063/065) chỉ để thêm tham số
-- p_issuer_company_id — cập nhật issuer_company_id trên quotes khi sửa báo giá.
-- Toàn bộ logic tính subtotal/discount/vat/total + cha/con + snapshot Danh mục dịch
-- vụ giữ NGUYÊN như bản 065, không đổi gì khác.
CREATE OR REPLACE FUNCTION public.quote_update(
    p_quote_id UUID, p_actor_id UUID, p_data JSONB, p_items JSONB, p_changes JSONB,
    p_issuer_company_id UUID DEFAULT NULL
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
            subtotal_amount, vat_amount, total_amount, sort_order,
            catalog_item_id, bundle_snapshot, list_price_usd, unit_price_usd, exchange_rate, unit_price_vnd
        ) VALUES (
            p_quote_id, NULL,
            COALESCE(v_item->>'description', ''),
            v_item->>'service_description',
            v_item->>'unit',
            v_qty, v_unit_price, v_discount_pct, v_item_discount, v_item_after_discount, v_vat_rate,
            v_item_subtotal, v_item_vat, v_item_total, v_parent_index,
            NULLIF(v_item->>'catalog_item_id', '')::uuid,
            v_item->'bundle_snapshot',
            (v_item->>'list_price_usd')::numeric,
            (v_item->>'unit_price_usd')::numeric,
            (v_item->>'exchange_rate')::numeric,
            (v_item->>'unit_price_vnd')::numeric
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
                subtotal_amount, vat_amount, total_amount, sort_order,
                catalog_item_id, bundle_snapshot, list_price_usd, unit_price_usd, exchange_rate, unit_price_vnd
            ) VALUES (
                p_quote_id, v_parent_id,
                COALESCE(v_child->>'description', ''),
                v_child->>'service_description',
                v_child->>'unit',
                v_qty, v_unit_price, v_discount_pct, v_item_discount, v_item_after_discount, v_vat_rate,
                v_item_subtotal, v_item_vat, v_item_total, v_child_index,
                NULLIF(v_child->>'catalog_item_id', '')::uuid,
                v_child->'bundle_snapshot',
                (v_child->>'list_price_usd')::numeric,
                (v_child->>'unit_price_usd')::numeric,
                (v_child->>'exchange_rate')::numeric,
                (v_child->>'unit_price_vnd')::numeric
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
        issuer_company_id = COALESCE(p_issuer_company_id, issuer_company_id),
        updated_by = p_actor_id
    WHERE id = p_quote_id
    RETURNING * INTO v_quote;

    INSERT INTO public.quote_activity_log (quote_id, actor_id, action, changes)
    VALUES (p_quote_id, p_actor_id, 'updated', p_changes);

    RETURN v_quote;
END;
$$;

-- Redefine quote_update_and_approve (gốc 059) chỉ để thêm tham số
-- p_issuer_company_id, chuyển tiếp xuống quote_update. Không đổi logic approve.
CREATE OR REPLACE FUNCTION public.quote_update_and_approve(
    p_quote_id UUID, p_actor_id UUID, p_data JSONB, p_items JSONB, p_changes JSONB, p_public_token TEXT,
    p_issuer_company_id UUID DEFAULT NULL
) RETURNS public.quotes
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM public.quote_update(p_quote_id, p_actor_id, p_data, p_items, p_changes, p_issuer_company_id);
    RETURN public.quote_approve(p_quote_id, p_actor_id, p_public_token);
END;
$$;
