-- Phase 3: KPI reward rules per team/week.
-- Keep existing member KPI tables untouched. Reward rules live in a separate
-- table and are used to calculate bonus summaries from real KPI actuals.

CREATE TABLE IF NOT EXISTS public.kpi_reward_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    metric TEXT NOT NULL CHECK (metric IN ('lead', 'inbox', 'post', 'comment', 'total_bonus')),
    weight NUMERIC(8, 2) NOT NULL DEFAULT 1,
    threshold_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reward_per_unit NUMERIC(14, 2) NOT NULL DEFAULT 0,
    max_reward NUMERIC(14, 2),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    leader_note TEXT,
    admin_note TEXT,
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (team_id, start_date, end_date, metric)
);

CREATE INDEX IF NOT EXISTS idx_kpi_reward_rules_team_week
    ON public.kpi_reward_rules(team_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_kpi_reward_rules_status
    ON public.kpi_reward_rules(status);
CREATE INDEX IF NOT EXISTS idx_kpi_reward_rules_review_queue
    ON public.kpi_reward_rules(status, start_date DESC, end_date DESC);

CREATE OR REPLACE FUNCTION update_kpi_reward_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kpi_reward_rules_updated_at ON public.kpi_reward_rules;
CREATE TRIGGER trg_kpi_reward_rules_updated_at
BEFORE UPDATE ON public.kpi_reward_rules
FOR EACH ROW
EXECUTE FUNCTION update_kpi_reward_rules_updated_at();

ALTER TABLE public.kpi_reward_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to kpi_reward_rules" ON public.kpi_reward_rules;
CREATE POLICY "Allow authenticated full access to kpi_reward_rules"
ON public.kpi_reward_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
