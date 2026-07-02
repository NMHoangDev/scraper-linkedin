-- ============================================================
-- Migration: 017_expand_customers.sql
-- Mở rộng bảng customer_leads thành bảng CRM đầy đủ
-- ============================================================

-- Thêm các trường thông tin định danh
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS email            TEXT,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS city             TEXT,
  ADD COLUMN IF NOT EXISTS website         TEXT,
  ADD COLUMN IF NOT EXISTS industry         TEXT,
  ADD COLUMN IF NOT EXISTS tax_code         TEXT;

-- Thêm trường truy vết nguồn gốc
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS source_platform  TEXT DEFAULT 'FB_Inbox'
                   CHECK (source_platform IN ('FB_Inbox', 'FB_Group', 'Zalo', 'Manual'));

-- Thêm trường giao dịch
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS customer_since   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_package  TEXT,
  ADD COLUMN IF NOT EXISTS lifetime_value  NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_status  TEXT DEFAULT 'active'
                   CHECK (contract_status IN ('active', 'completed', 'maintenance'));

-- Thêm trường chăm sóc sau bán
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS warranty_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS care_note       TEXT,
  ADD COLUMN IF NOT EXISTS last_care_at     TIMESTAMPTZ;

-- Thêm trường phân loại & thao tác CRM
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS activity_status TEXT DEFAULT 'active'
                   CHECK (activity_status IN ('active', 'paused', 'churned')),
  ADD COLUMN IF NOT EXISTS has_budget      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reject_reason_type TEXT
                   CHECK (reject_reason_type IN (
                     'Khong_lien_lac_duoc',
                     'Chua_co_nhu_cau',
                     'Cham_trai_nghiem',
                     'Thieu_nhan_su',
                     'Chia_tay_doi_tac_cu',
                     'Khong_du_tai_chinh',
                     'Chua_phu_hop_thoi_diem',
                     'Khac'
                   ));

-- Thêm trường KPI / review
ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS review_result    TEXT
                   CHECK (review_result IN ('Qualify', 'Disqualify', 'Chua_xem_xet'));

-- Indexes cho các cột mới (tìm kiếm phổ biến)
CREATE INDEX IF NOT EXISTS idx_customers_conv_id        ON public.customer_leads(conv_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone          ON public.customer_leads(phone);
CREATE INDEX IF NOT EXISTS idx_customers_city            ON public.customer_leads(city);
CREATE INDEX IF NOT EXISTS idx_customers_industry        ON public.customer_leads(industry);
CREATE INDEX IF NOT EXISTS idx_customers_source          ON public.customer_leads(source_platform);
CREATE INDEX IF NOT EXISTS idx_customers_activity        ON public.customer_leads(activity_status);
CREATE INDEX IF NOT EXISTS idx_customers_contract_status ON public.customer_leads(contract_status);
CREATE INDEX IF NOT EXISTS idx_customers_tags            ON public.customer_leads USING GIN(tags);

-- ============================================================
-- Trigger: tự động cập nhật customer_since khi status = closed
-- ============================================================
CREATE OR REPLACE FUNCTION set_customer_since_on_close()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' THEN
    NEW.customer_since = COALESCE(NEW.customer_since, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_customer_since ON public.customer_leads;
CREATE TRIGGER trg_set_customer_since
  BEFORE UPDATE ON public.customer_leads
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_since_on_close();
