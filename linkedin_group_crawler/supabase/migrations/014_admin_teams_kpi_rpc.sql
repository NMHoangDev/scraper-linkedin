-- ============================================================
-- Migration 014: Phase 5 — Admin Teams Management combined RPC
--
-- Mục tiêu: thay thế 2 kiểu fan-out query khi admin load
-- trang /admin/teams-management:
--   • teamsService.getAll()  → 1 endpoint /teams (~600ms lần đầu)
--   • N × allPlatformKpiService.getAll(t.leader_email, …)
--     với N = số team → N RPC + 1 fallback batch mỗi cái
--     (với 10 team × ~400ms = tổng 2-3s)
-- bằng 1 RPC duy nhất `get_admin_teams_kpi_overview()` →
-- 1 round-trip tới Postgres, aggregate hoàn toàn server-side.
--
-- Tác động ước tính: trang teams-management load lần đầu
-- từ ~2-3s xuống <500ms; lần 2 trong cache TTL <50ms.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_teams_kpi_overview(
    p_start DATE DEFAULT NULL,
    p_end   DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_start DATE := COALESCE(
        p_start,
        (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int)
    );
    v_end DATE := COALESCE(p_end, v_start + 6);
BEGIN
    RETURN jsonb_build_object(
        'teams', COALESCE((
            -- 1. Teams + leader + members (gộp từ teams + member_of_teams + app_users)
            SELECT jsonb_agg(row_to_json(t) ORDER BY t.name_team)
            FROM (
                SELECT
                    tm.id::text                       AS id,
                    tm.name_team,
                    tm.id_leader::text                AS id_leader,
                    COALESCE(lu.email, '')            AS leader_email,
                    COALESCE(lu.name, '')             AS leader_name,
                    COALESCE((
                        SELECT jsonb_agg(jsonb_build_object(
                            'id',    mu.id::text,
                            'email', mu.email,
                            'name',  COALESCE(mu.name, '')
                        ) ORDER BY mu.email)
                        FROM public.member_of_teams mot2
                        JOIN public.app_users mu ON mu.id = mot2.id_member
                        WHERE mot2.id_teams = tm.id
                    ), '[]'::jsonb)                   AS members,
                    COALESCE((
                        SELECT COUNT(*)
                        FROM public.member_of_teams mot3
                        WHERE mot3.id_teams = tm.id
                    ), 0)                             AS number_of_member
                FROM public.teams tm
                LEFT JOIN public.app_users lu ON lu.id = tm.id_leader
            ) t
        ), '[]'::jsonb),

        'kpi_data', COALESCE((
            -- 2. KPI aggregate theo team × member trong [v_start, v_end]
            --    Dùng các VIEW từ Phase 2 để đã pre-aggregate.
            SELECT jsonb_agg(row_to_json(t) ORDER BY t.team_name, t.member_email)
            FROM (
                SELECT
                    tm.id::text                                       AS team_id,
                    tm.name_team                                      AS team_name,
                    COALESCE(lu.email, '')                            AS leader_email,
                    mu.id::text                                       AS member_id,
                    mu.email                                          AS member_email,
                    COALESCE(mu.name, mu.email)                       AS member_name,
                    COALESCE(kt.kpi_post, 0)                          AS kpi_post,
                    COALESCE(kt.kpi_lead, 0)                          AS kpi_lead,
                    COALESCE(kt.kpi_inbox, 0)                         AS kpi_inbox,
                    COALESCE(kt.kpi_comment, 0)                       AS kpi_comment,
                    -- Actuals
                    COALESCE(s.verified_count, 0)                     AS verified_count,
                    COALESCE(fb.post_count, 0)                        AS post_count,
                    COALESCE(fb.inbox_count, 0)                       AS inbox_count,
                    COALESCE(fb.lead_count, 0)                        AS lead_count,
                    -- Computed convenience (alias để tương thích FE cũ)
                    COALESCE(fb.post_count, 0)                        AS kpi_post_current,
                    COALESCE(fb.inbox_count, 0)                       AS kpi_inbox_current,
                    COALESCE(fb.lead_count, 0)                        AS kpi_lead_current,
                    jsonb_build_object(
                        'start', v_start,
                        'end',   v_end
                    )                                                 AS kpi_inbox_range
                FROM public.teams tm
                LEFT JOIN public.app_users lu ON lu.id = tm.id_leader
                JOIN public.member_of_teams mot ON mot.id_teams = tm.id
                JOIN public.app_users mu ON mu.id = mot.id_member
                LEFT JOIN public.kpi_tracker kt
                       ON kt.id_member = mu.id
                      AND kt.status = 'active'
                      AND kt.start_date::date <= v_end
                      AND kt.end_date::date   >= v_start
                LEFT JOIN (
                    SELECT id_member, SUM(verified_count)::int AS verified_count
                    FROM public.v_member_daily_seeding
                    WHERE day BETWEEN v_start AND v_end
                    GROUP BY id_member
                ) s ON s.id_member = mu.id
                LEFT JOIN (
                    SELECT id_member,
                           SUM(inbox_count)::int AS inbox_count,
                           SUM(lead_count)::int  AS lead_count,
                           SUM(post_count)::int  AS post_count
                    FROM (
                        SELECT id_member, inbox_count, lead_count, 0 AS post_count
                        FROM public.v_member_daily_fb_inbox
                        WHERE day_vn BETWEEN v_start AND v_end
                        UNION ALL
                        SELECT id_member, 0, 0, post_count
                        FROM public.v_member_daily_fb_post
                        WHERE day_vn BETWEEN v_start AND v_end
                    ) x
                    GROUP BY id_member
                ) fb ON fb.id_member = mu.id
            ) t
        ), '[]'::jsonb),

        'range', jsonb_build_object('start', v_start, 'end', v_end)
    );
END;
$$;

COMMENT ON FUNCTION public.get_admin_teams_kpi_overview IS
    'Phase 5: Single RPC for admin teams-management page — replaces 1 + N HTTP requests with 1 round-trip.';