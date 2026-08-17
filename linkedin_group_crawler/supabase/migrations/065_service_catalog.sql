-- Danh mục dịch vụ (Service Catalog): group / component / bundle.
-- - group: nhóm hiển thị trong cây quản trị (vd "VPS Hosting"), parent_id luôn NULL.
-- - component: dịch vụ thành phần thuộc 1 group (vd SZ-CPU), parent_id = group id.
-- - bundle: gói/combo bán ra thuộc 1 group (vd SZ-VPS), parent_id = group id, tổ hợp
--   nhiều component qua service_catalog_bundle_items. Trên báo giá, chọn 1 bundle chỉ
--   sinh ĐÚNG 1 dòng quote_item (không bung thành nhiều dòng con).
--
-- spec_quantity_per_unit/spec_unit_label (chỉ có ý nghĩa với component): quy đổi số
-- lượng cuối cùng khi component được đưa vào 1 bundle. Vd component "2 CPU (vCPU)":
-- spec_quantity_per_unit=2, spec_unit_label='CPU (vCPU)'. Số lượng hiển thị trong
-- Description Items của báo giá LUÔN do backend tính = bundle_items.quantity *
-- component.spec_quantity_per_unit, KHÔNG bao giờ nhập tay chuỗi hiển thị và KHÔNG
-- bao giờ hiển thị dạng phép nhân "4 x 2 CPU" hay ghép tên component vào.

CREATE TABLE IF NOT EXISTS public.service_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type TEXT NOT NULL CHECK (item_type IN ('group', 'component', 'bundle')),
    parent_id UUID REFERENCES public.service_catalog_items(id) ON DELETE CASCADE,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT,
    list_price_usd NUMERIC,
    unit_price_usd NUMERIC,
    exchange_rate_snapshot NUMERIC,
    default_unit_price_vnd NUMERIC NOT NULL DEFAULT 0,
    default_discount_percent NUMERIC NOT NULL DEFAULT 0 CHECK (default_discount_percent >= 0 AND default_discount_percent <= 100),
    default_vat_rate NUMERIC NOT NULL DEFAULT 0 CHECK (default_vat_rate >= 0 AND default_vat_rate <= 100),
    spec_quantity_per_unit NUMERIC NOT NULL DEFAULT 1,
    spec_unit_label TEXT,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    sort_order INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.app_users(id),
    updated_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_items_parent_id ON public.service_catalog_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_service_catalog_items_type_status ON public.service_catalog_items(item_type, status);

ALTER TABLE public.service_catalog_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.service_catalog_items;
CREATE POLICY "Allow authenticated full access" ON public.service_catalog_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.service_catalog_items_validate_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_parent_type TEXT;
BEGIN
    IF NEW.item_type = 'group' THEN
        IF NEW.parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'service_catalog_group_cannot_have_parent';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.parent_id IS NULL THEN
        RAISE EXCEPTION 'service_catalog_item_requires_group_parent';
    END IF;

    SELECT item_type INTO v_parent_type FROM public.service_catalog_items WHERE id = NEW.parent_id;
    IF v_parent_type IS NULL THEN
        RAISE EXCEPTION 'service_catalog_parent_not_found';
    END IF;
    IF v_parent_type <> 'group' THEN
        RAISE EXCEPTION 'service_catalog_parent_must_be_group';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_catalog_items_validate_hierarchy ON public.service_catalog_items;
CREATE TRIGGER trg_service_catalog_items_validate_hierarchy
BEFORE INSERT OR UPDATE OF item_type, parent_id ON public.service_catalog_items
FOR EACH ROW
EXECUTE FUNCTION public.service_catalog_items_validate_hierarchy();

-- Thành phần cấu tạo 1 bundle (vd SZ-VPS gồm 4 đơn vị SZ-CPU, 1 đơn vị SZ-RAM, ...).
CREATE TABLE IF NOT EXISTS public.service_catalog_bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID NOT NULL REFERENCES public.service_catalog_items(id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES public.service_catalog_items(id) ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (bundle_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_service_catalog_bundle_items_bundle_id ON public.service_catalog_bundle_items(bundle_id);

ALTER TABLE public.service_catalog_bundle_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.service_catalog_bundle_items;
CREATE POLICY "Allow authenticated full access" ON public.service_catalog_bundle_items
    FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.service_catalog_bundle_items_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_bundle_type TEXT;
    v_component_type TEXT;
BEGIN
    SELECT item_type INTO v_bundle_type FROM public.service_catalog_items WHERE id = NEW.bundle_id;
    IF v_bundle_type IS DISTINCT FROM 'bundle' THEN
        RAISE EXCEPTION 'service_catalog_bundle_items_bundle_id_must_be_bundle';
    END IF;

    SELECT item_type INTO v_component_type FROM public.service_catalog_items WHERE id = NEW.component_id;
    IF v_component_type IS DISTINCT FROM 'component' THEN
        RAISE EXCEPTION 'service_catalog_bundle_items_component_id_must_be_component';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_catalog_bundle_items_validate ON public.service_catalog_bundle_items;
CREATE TRIGGER trg_service_catalog_bundle_items_validate
BEFORE INSERT OR UPDATE ON public.service_catalog_bundle_items
FOR EACH ROW
EXECUTE FUNCTION public.service_catalog_bundle_items_validate();

-- Liên kết Mẫu báo giá <-> nhóm dịch vụ: catalog_item_id trỏ tới 1 GROUP => toàn bộ
-- bundle + component trong group đó khả dụng khi điền báo giá theo mẫu này.
CREATE TABLE IF NOT EXISTS public.quote_form_catalog_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_form_id UUID NOT NULL REFERENCES public.quote_forms(id) ON DELETE CASCADE,
    catalog_item_id UUID NOT NULL REFERENCES public.service_catalog_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (quote_form_id, catalog_item_id)
);

CREATE INDEX IF NOT EXISTS idx_quote_form_catalog_links_form_id ON public.quote_form_catalog_links(quote_form_id);

ALTER TABLE public.quote_form_catalog_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated full access" ON public.quote_form_catalog_links;
CREATE POLICY "Allow authenticated full access" ON public.quote_form_catalog_links
    FOR ALL USING (true) WITH CHECK (true);

-- quote_items: liên kết truy vết tới catalog + snapshot USD/VND/tỷ giá tại thời điểm
-- chọn dịch vụ. Đây là dữ liệu ĐÔNG CỨNG - sửa giá/tỷ giá trong Danh mục dịch vụ sau
-- này KHÔNG được phép ảnh hưởng báo giá đã lưu.
ALTER TABLE public.quote_items
    ADD COLUMN IF NOT EXISTS catalog_item_id UUID REFERENCES public.service_catalog_items(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bundle_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS list_price_usd NUMERIC,
    ADD COLUMN IF NOT EXISTS unit_price_usd NUMERIC,
    ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC,
    ADD COLUMN IF NOT EXISTS unit_price_vnd NUMERIC;

-- Redefine quote_update (gốc 059, đã redefine ở 062/063) để ghi thêm 6 cột mới khi
-- insert quote_items. Không đổi công thức tính subtotal/discount/vat/total.
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
        updated_by = p_actor_id
    WHERE id = p_quote_id
    RETURNING * INTO v_quote;

    INSERT INTO public.quote_activity_log (quote_id, actor_id, action, changes)
    VALUES (p_quote_id, p_actor_id, 'updated', p_changes);

    RETURN v_quote;
END;
$$;
