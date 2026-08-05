-- Nhat ky chinh sua rule KPI & thuong: ai sua, sua field nao, gia tri cu -> moi.
-- Dung de hien thi log ngay duoi bang "Cai dat Bonus KPI" tren web.

CREATE TABLE IF NOT EXISTS public.kpi_reward_rule_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    changed_by UUID,
    changed_by_name TEXT,
    changed_by_email TEXT,
    changes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_reward_rule_logs_team_week
    ON public.kpi_reward_rule_logs(team_id, start_date, end_date, created_at DESC);
