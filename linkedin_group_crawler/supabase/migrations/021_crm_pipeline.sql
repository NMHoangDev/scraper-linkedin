-- ============================================================
-- Migration: 021_crm_pipeline.sql
-- Thêm các cột cho Sales Pipeline (state machine theo quy tắc nghiệp vụ):
--   deal_stage           : stage hiện tại (10 stage)
--   prev_stage           : stage trước khi vào On Hold (để resume)
--   follow_up_date       : ngày dự kiến follow-up (cho On Hold)
--   decision_maker       : người ra quyết định (cho Qualified)
--   estimated_budget     : ngân sách dự kiến (cho Qualified, BIGINT để chứa số lớn)
--   stage_entered_at     : thời điểm vào stage hiện tại (để tính days_in_stage)
--   last_attachment_url  : URL file đính kèm gần nhất (proposal/contract/brief)
--   last_attachment_name : tên file gần nhất
--   closed_reason        : text ghi lý do Won (không bắt buộc)
-- ============================================================

ALTER TABLE public.customer_leads
  ADD COLUMN IF NOT EXISTS deal_stage         TEXT
                   DEFAULT 'new_lead'
                   CHECK (deal_stage IN (
                     'new_lead', 'contacted', 'qualified', 'requirement',
                     'proposal_sent', 'negotiation', 'contract_sent',
                     'on_hold', 'won', 'lost'
                   )),
  ADD COLUMN IF NOT EXISTS prev_stage         TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_date     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_maker     TEXT,
  ADD COLUMN IF NOT EXISTS estimated_budget   NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage_entered_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS last_attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS closed_reason      TEXT;

-- Backfill: set deal_stage theo status cũ cho các row hiện có
UPDATE public.customer_leads
SET deal_stage = CASE
  WHEN status = 'closed'   THEN 'won'
  WHEN status = 'rejected' THEN 'lost'
  ELSE COALESCE(deal_stage, 'new_lead')
END
WHERE deal_stage IS NULL;

-- Backfill: set stage_entered_at cho các row đã có deal_stage mà chưa có timestamp
UPDATE public.customer_leads
SET stage_entered_at = COALESCE(stage_entered_at, updated_at, created_at, NOW())
WHERE stage_entered_at IS NULL;

-- ============================================================
-- Bảng activity log (audit trail cho mỗi lần đổi deal_stage)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customer_lead_activity_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID NOT NULL REFERENCES public.customer_leads(id) ON DELETE CASCADE,
  action           TEXT NOT NULL,            -- 'stage_change' | 'created' | 'note_added' | ...
  from_stage       TEXT,                     -- NULL cho action khác stage_change
  to_stage         TEXT,
  field            TEXT,                     -- nếu là update 1 field cụ thể
  old_value        TEXT,
  new_value        TEXT,
  actor_id         UUID,                     -- id người thao tác
  actor_name       TEXT,                     -- cache name người thao tác để hiển thị
  note             TEXT,
  attachment_url   TEXT,
  attachment_name  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_customer
  ON public.customer_lead_activity_log(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_action
  ON public.customer_lead_activity_log(action);

-- ============================================================
-- Indexes mới
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_customers_deal_stage
  ON public.customer_leads(deal_stage);

CREATE INDEX IF NOT EXISTS idx_customers_deal_stage_entered
  ON public.customer_leads(deal_stage, stage_entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_follow_up_date
  ON public.customer_leads(follow_up_date)
  WHERE follow_up_date IS NOT NULL;

-- ============================================================
-- View tiện cho UI: gom nhóm theo stage, có sẵn days_in_stage
-- (tính bằng SQL: NOW() - stage_entered_at, là integer ngày)
-- ============================================================
CREATE OR REPLACE VIEW public.v_customer_leads_with_stage AS
SELECT
  cl.*,
  GREATEST(0, EXTRACT(DAY FROM (NOW() - cl.stage_entered_at))::INT) AS days_in_stage,
  (SELECT COUNT(*) FROM public.customer_lead_activity_log al WHERE al.customer_id = cl.id) AS activity_count
FROM public.customer_leads cl;

COMMENT ON TABLE  public.customer_lead_activity_log IS 'Audit trail cho mỗi thay đổi trên deal CRM — ghi bất cứ khi nào stage thay đổi, có thể mở rộng cho note_added/attachment_added.';
COMMENT ON COLUMN public.customer_leads.deal_stage IS 'Stage hiện tại trong sales pipeline (10 stage theo state machine).';
