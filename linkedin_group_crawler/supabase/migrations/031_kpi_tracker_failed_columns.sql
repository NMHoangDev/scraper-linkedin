ALTER TABLE public.kpi_tracker
ADD COLUMN IF NOT EXISTS is_failed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.kpi_tracker
ADD COLUMN IF NOT EXISTS failure_reason TEXT;