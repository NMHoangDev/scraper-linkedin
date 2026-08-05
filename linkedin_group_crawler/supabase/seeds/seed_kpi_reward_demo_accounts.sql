-- Demo accounts for checking KPI Reward UI locally.
-- Password for both accounts: 123123
-- Run after the base auth/team migrations and after at least one team exists.

INSERT INTO public.app_users (id, email, password, name, role, is_active)
VALUES
    (
        '22222222-2222-4222-8222-222222222222',
        'leader.kpi@markee.ai',
        '$2b$12$FPwmvaHADfZSmz8nxUALuuzpEEgp/46oPkfaISeeCqO5fmeKkgZFa',
        'KPI Demo Leader',
        'leader',
        true
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'member.kpi@markee.ai',
        '$2b$12$FPwmvaHADfZSmz8nxUALuuzpEEgp/46oPkfaISeeCqO5fmeKkgZFa',
        'KPI Demo Member',
        'member',
        true
    )
ON CONFLICT (email) DO UPDATE SET
    password = EXCLUDED.password,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

WITH picked_team AS (
    SELECT id
    FROM public.teams
    ORDER BY name_team
    LIMIT 1
),
demo_users AS (
    SELECT
        '22222222-2222-4222-8222-222222222222'::uuid AS leader_id,
        '33333333-3333-4333-8333-333333333333'::uuid AS member_id
)
UPDATE public.teams t
SET id_leader = demo_users.leader_id
FROM picked_team, demo_users
WHERE t.id = picked_team.id;

WITH picked_team AS (
    SELECT id
    FROM public.teams
    ORDER BY name_team
    LIMIT 1
),
demo_users AS (
    SELECT '33333333-3333-4333-8333-333333333333'::uuid AS member_id
)
INSERT INTO public.member_of_teams (id_member, id_teams)
SELECT demo_users.member_id, picked_team.id
FROM picked_team, demo_users
ON CONFLICT DO NOTHING;

-- Login:
-- leader.kpi@markee.ai / 123123
-- member.kpi@markee.ai / 123123
