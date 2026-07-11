-- ============================================================
-- Migration: 027_crm_payment_status.sql
-- Thêm trạng thái thanh toán cho CRM — trước đây chỉ có contract_status
-- (active/completed/maintenance) chứ không track được khách nào ĐÃ trả tiền,
-- khách nào CÒN NỢ, và hạn trả tiếp theo là ngày nào.
--
--   payment_due_date : ngày khách hàng cần thanh toán (kỳ tới / hạn hiện tại)
--   payment_status   : chưa thanh toán / thanh toán một phần / đã thanh toán
-- ============================================================

ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT
                   DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid', 'partial', 'paid'));

-- Backfill: các deal đã có sẵn nhưng chưa có payment_status (NULL) → coi như unpaid
UPDATE public.customer_leads
SET payment_status = 'unpaid'
WHERE payment_status IS NULL;

-- Index để lọc nhanh "ai đang nợ tiền" (payment_status != paid) và sắp theo hạn
CREATE INDEX IF NOT EXISTS idx_customers_payment_status
  ON public.customer_leads(payment_status);

CREATE INDEX IF NOT EXISTS idx_customers_payment_due_date
  ON public.customer_leads(payment_due_date)
  WHERE payment_due_date IS NOT NULL AND payment_status <> 'paid';

COMMENT ON COLUMN public.customer_leads.payment_due_date IS 'Ngày khách hàng cần thanh toán (hạn thu tiền kỳ hiện tại/tiếp theo).';
COMMENT ON COLUMN public.customer_leads.payment_status IS 'Trạng thái thanh toán: unpaid (chưa thanh toán) | partial (thanh toán một phần) | paid (đã thanh toán đủ).';
