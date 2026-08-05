-- Demo data for Phase 3 KPI reward rules.
-- Run after migration 035 and after at least one row exists in public.teams.
-- This uses the first team in local DB so you do not need to paste UUIDs.

WITH picked AS (
    SELECT
        t.id AS team_id,
        COALESCE(
            (SELECT id FROM public.app_users WHERE role = 'admin' ORDER BY created_at LIMIT 1),
            t.id_leader
        ) AS actor_id,
        (date_trunc('week', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date AS start_date,
        ((date_trunc('week', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date + 6) AS end_date
    FROM public.teams t
    ORDER BY t.name_team
    LIMIT 1
),
rules(metric, weight, threshold_value, reward_per_unit, max_reward, max_rate) AS (
    VALUES
        -- threshold_value is percent of target reached.
        -- reward_per_unit is VND per actual unit.
        ('total_bonus', 100.00, 75.00, 100000.00, NULL::numeric, 200.00),
        ('lead',        40.00, 80.00, 10000.00,  NULL::numeric, 200.00),
        ('inbox',       30.00, 80.00, 3000.00,   NULL::numeric, 200.00),
        ('post',        20.00, 80.00, 2000.00,   NULL::numeric, 200.00),
        ('comment',     10.00, 80.00, 1000.00,   NULL::numeric, 200.00)
)
INSERT INTO public.kpi_reward_rules (
    team_id,
    start_date,
    end_date,
    metric,
    weight,
    threshold_value,
    reward_per_unit,
    max_reward,
    max_rate,
    status,
    leader_note,
    admin_note,
    created_by,
    submitted_by,
    reviewed_by,
    submitted_at,
    reviewed_at
)
SELECT
    p.team_id,
    p.start_date,
    p.end_date,
    r.metric,
    r.weight,
    r.threshold_value,
    r.reward_per_unit,
    r.max_reward,
    r.max_rate,
    'approved',
    'Seed demo KPI reward rule',
    'Approved demo data for local testing',
    p.actor_id,
    p.actor_id,
    p.actor_id,
    now(),
    now()
FROM picked p
CROSS JOIN rules r
ON CONFLICT (team_id, start_date, end_date, metric)
DO UPDATE SET
    weight = EXCLUDED.weight,
    threshold_value = EXCLUDED.threshold_value,
    reward_per_unit = EXCLUDED.reward_per_unit,
    max_reward = EXCLUDED.max_reward,
    max_rate = EXCLUDED.max_rate,
    status = EXCLUDED.status,
    leader_note = EXCLUDED.leader_note,
    admin_note = EXCLUDED.admin_note,
    submitted_by = EXCLUDED.submitted_by,
    reviewed_by = EXCLUDED.reviewed_by,
    submitted_at = EXCLUDED.submitted_at,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = now();

-- Quick check:
-- SELECT team_id, start_date, end_date, metric, weight, threshold_value, reward_per_unit, max_reward, max_rate, status
-- FROM public.kpi_reward_rules
-- ORDER BY start_date DESC, metric;
