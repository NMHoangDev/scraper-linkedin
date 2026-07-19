-- Add max rate so KPI reward rules can match the current bonus sheet.
-- max_rate is a percentage cap against the target reward, for example 200%.

ALTER TABLE public.kpi_reward_rules
    ADD COLUMN IF NOT EXISTS max_rate NUMERIC(8, 2) NOT NULL DEFAULT 200;

CREATE INDEX IF NOT EXISTS idx_kpi_reward_rules_max_rate
    ON public.kpi_reward_rules(max_rate);
