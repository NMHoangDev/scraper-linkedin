ALTER TABLE public.kpi_tracker
ADD COLUMN IF NOT EXISTS is_failed BOOLEAN DEFAULT FALSE;

-- Ten cot la reason_not_met (khop code assign_kpi trong supabase_kpi_service.py
-- va cot da ton tai san tren production) -- KHONG phai failure_reason.
ALTER TABLE public.kpi_tracker
ADD COLUMN IF NOT EXISTS reason_not_met TEXT;