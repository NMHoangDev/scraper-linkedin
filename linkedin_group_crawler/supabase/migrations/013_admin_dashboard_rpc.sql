-- ============================================================
-- Migration 013: Phase 4 — Admin Dashboard Overview RPC
--
-- Mục tiêu: thay thế 4 HTTP endpoint song song
--   /admin/dashboard/summary
--   /admin/dashboard/kpi-performance
--   /admin/dashboard/leaderboards
--   /kpi/team-history-v2
-- bằng 1 RPC DUY NHẤT, thực hiện mọi aggregate server-side 1 round-trip.
--
-- Tác động: giảm ~20 query Supabase xuống còn 1 RPC → load admin dashboard
-- từ ~5s xuống <0.5s.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_overview(
    p_weeks INT DEFAULT 4
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_monday DATE := v_today - EXTRACT(DOW FROM v_today)::int;
    v_sunday DATE := v_monday + 6;
    v_earliest_start DATE := v_monday - (p_weeks - 1) * 7;
    v_earliest_start_utc TIMESTAMPTZ := (v_earliest_start::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
    v_latest_end_utc TIMESTAMPTZ := ((v_sunday + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');
BEGIN
    RETURN jsonb_build_object(
        -- 1. Summary: tổng bài viết crawl + seeding stats
        'summary', (
            SELECT jsonb_build_object(
                'total_crawled_posts', (
                    (SELECT COUNT(*) FROM public.facebook_posts)
                    + (SELECT COUNT(*) FROM public.linkedin_posts)
                ),
                'total_seeding_comments', (
                    SELECT COUNT(*) FROM public.seeding_content_kpi
                ),
                'approved_count', (
                    SELECT COUNT(*) FROM public.seeding_content_kpi
                    WHERE LOWER(TRIM(COALESCE(verify, ''))) IN
                          ('yes', 'đã seeding', 'xác minh', 'verified')
                ),
                'kpi_rate', COALESCE((
                    WITH kpi_agg AS (
                        SELECT
                            COALESCE(SUM(kpi_inbox)::numeric,   0) AS inbox_target,
                            COALESCE(SUM(kpi_lead)::numeric,    0) AS lead_target,
                            COALESCE(SUM(kpi_post)::numeric,    0) AS post_target,
                            COALESCE(SUM(kpi_comment)::numeric, 0) AS comment_target
                        FROM public.kpi_tracker
                        WHERE status = 'active'
                          AND start_date::date = v_monday
                          AND end_date::date   = v_sunday
                    ),
                    actual_agg AS (
                        SELECT COALESCE(SUM(verified_count)::numeric, 0) AS comment_actual
                        FROM public.v_member_daily_seeding
                        WHERE day BETWEEN v_monday AND v_sunday
                    )
                    SELECT CASE
                        WHEN kpi_agg.inbox_target + kpi_agg.lead_target + kpi_agg.post_target + kpi_agg.comment_target = 0 THEN 0
                        ELSE ROUND(100.0 * actual_agg.comment_actual /
                             (kpi_agg.inbox_target + kpi_agg.lead_target + kpi_agg.post_target + kpi_agg.comment_target), 1)
                    END
                    FROM kpi_agg, actual_agg
                ), 0)
            )
        ),

        -- 2. KPI performance: target/actual cho từng team tuần hiện tại
        'kpi_performance', COALESCE((
            SELECT jsonb_agg(row_to_json(t))
            FROM (
                SELECT
                    t.name_team AS team_name,
                    COALESCE(SUM(k.kpi_inbox)::int,    0)
                       + COALESCE(SUM(k.kpi_lead)::int, 0)
                       + COALESCE(SUM(k.kpi_post)::int, 0)
                       + COALESCE(SUM(k.kpi_comment)::int, 0) AS target,
                    COALESCE(SUM(actual_agg.comment_actual), 0) AS actual
                FROM public.teams t
                LEFT JOIN public.member_of_teams mot ON mot.id_teams = t.id
                LEFT JOIN public.kpi_tracker k
                       ON k.id_member = mot.id_member
                      AND k.status = 'active'
                      AND k.start_date::date = v_monday
                      AND k.end_date::date   = v_sunday
                LEFT JOIN (
                    SELECT s.id_member, SUM(s.verified_count)::int AS comment_actual
                    FROM (
                        SELECT id_member, COUNT(*) FILTER (
                            WHERE LOWER(TRIM(COALESCE(verify, ''))) IN
                                  ('yes', 'đã seeding', 'xác minh', 'verified')
                        )::int AS verified_count
                        FROM public.seeding_content_kpi
                        WHERE current_day BETWEEN v_monday AND v_sunday
                        GROUP BY id_member
                    ) s
                    GROUP BY s.id_member
                ) actual_agg ON actual_agg.id_member = mot.id_member
                GROUP BY t.id, t.name_team
                HAVING COALESCE(SUM(k.kpi_inbox)::int, 0)
                     + COALESCE(SUM(k.kpi_lead)::int, 0)
                     + COALESCE(SUM(k.kpi_post)::int, 0)
                     + COALESCE(SUM(k.kpi_comment)::int, 0) > 0
                ORDER BY t.name_team
            ) t
        ), '[]'::jsonb),

        -- 3. Leaderboards: top 5 seeders + top 5 groups (tuần hiện tại)
        'leaderboards', jsonb_build_object(
            'top_seeders', COALESCE((
                SELECT jsonb_agg(row_to_json(t) ORDER BY t.count DESC)
                FROM (
                    SELECT
                        au.id::text AS id,
                        au.email,
                        au.name,
                        COUNT(*) FILTER (
                            WHERE LOWER(TRIM(COALESCE(s.verify, ''))) IN
                                  ('yes', 'đã seeding', 'xác minh', 'verified')
                        )::int AS count
                    FROM public.seeding_content_kpi s
                    JOIN public.app_users au ON au.id = s.id_member
                    WHERE s.current_day BETWEEN v_monday AND v_sunday
                    GROUP BY au.id, au.email, au.name
                    ORDER BY count DESC
                    LIMIT 5
                ) t
            ), '[]'::jsonb),
            'top_groups', COALESCE((
                SELECT jsonb_agg(row_to_json(t))
                FROM (
                    SELECT
                        g.id::text AS id,
                        g.group_name AS name,
                        g.group_url AS url,
                        (COALESCE(SUM(fb.reactions), 0) + COALESCE(SUM(fb.comments), 0))::int AS interactions
                    FROM public.facebook_groups g
                    JOIN public.facebook_posts fb ON fb.group_id = g.id
                    WHERE fb.created_at >= v_earliest_start_utc
                    GROUP BY g.id, g.group_name, g.group_url
                    ORDER BY interactions DESC
                    LIMIT 5
                ) t
            ), '[]'::jsonb)
        ),

        -- 4. Weekly history: W tuần × all teams
        'weekly_history', COALESCE((
            WITH weeks AS (
                SELECT
                    EXTRACT(ISOYEAR FROM d)::int AS yr,
                    EXTRACT(WEEK FROM d)::int AS wn,
                    d::date AS w_start,
                    d::date + 6 AS w_end
                FROM generate_series(v_earliest_start, v_monday, INTERVAL '7 days') d
            ),
            team_member AS (
                SELECT t.id AS team_id, t.name_team, mot.id_member
                FROM public.teams t
                LEFT JOIN public.member_of_teams mot ON mot.id_teams = t.id
            ),
            -- KPI targets theo tuần
            kpi_weekly AS (
                SELECT
                    w.w_start, w.w_end,
                    tm.team_id, tm.name_team,
                    SUM(k.kpi_inbox)::int    AS inbox_target,
                    SUM(k.kpi_lead)::int     AS lead_target,
                    SUM(k.kpi_post)::int     AS post_target,
                    SUM(k.kpi_comment)::int  AS comment_target
                FROM weeks w
                CROSS JOIN team_member tm
                LEFT JOIN public.kpi_tracker k
                       ON k.id_member = tm.id_member
                      AND k.status = 'active'
                      AND k.start_date::date <= w.w_end
                      AND k.end_date::date   >= w.w_start
                GROUP BY w.w_start, w.w_end, tm.team_id, tm.name_team
            ),
            inbox_weekly AS (
                SELECT
                    w.w_start,
                    tm.team_id,
                    SUM(CASE WHEN f.is_confirmed THEN 1 ELSE 0 END)::int AS inbox_actual,
                    SUM(CASE WHEN f.is_lead     THEN 1 ELSE 0 END)::int AS lead_actual
                FROM weeks w
                JOIN public.fb_inbox_kpi f
                  ON (f.synced_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN w.w_start AND w.w_end
                JOIN team_member tm ON tm.id_member = f.id_member
                GROUP BY w.w_start, tm.team_id
            ),
            post_weekly AS (
                SELECT
                    w.w_start,
                    tm.team_id,
                    COUNT(*)::int AS post_actual
                FROM weeks w
                JOIN public.fb_post_kpi f
                  ON (f.posted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN w.w_start AND w.w_end
                JOIN team_member tm ON tm.id_member = f.id_member
                GROUP BY w.w_start, tm.team_id
            )
            SELECT jsonb_agg(row_to_json(snap) ORDER BY snap.week_name DESC)
            FROM (
                SELECT
                    (EXTRACT(ISOYEAR FROM k.w_start)::int || '-W' ||
                     lpad(EXTRACT(WEEK FROM k.w_start)::int::text, 2, '0')) AS week_name,
                    jsonb_agg(jsonb_build_object(
                        'team_id',        k.team_id::text,
                        'team_name',      k.name_team,
                        'inbox_target',   k.inbox_target,
                        'lead_target',    k.lead_target,
                        'post_target',    k.post_target,
                        'comment_target', k.comment_target,
                        'inbox_actual',   COALESCE(i.inbox_actual, 0),
                        'lead_actual',    COALESCE(i.lead_actual,  0),
                        'post_actual',    COALESCE(p.post_actual,   0),
                        'comment_actual', 0
                    ) ORDER BY k.name_team) AS teams
                FROM kpi_weekly k
                LEFT JOIN inbox_weekly i ON i.w_start = k.w_start AND i.team_id = k.team_id
                LEFT JOIN post_weekly  p ON p.w_start = k.w_start AND p.team_id = k.team_id
                GROUP BY k.w_start
            ) snap
        ), '[]'::jsonb),

        'range', jsonb_build_object('start', v_earliest_start, 'end', v_sunday)
    );
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_overview IS
    'Phase 4: Single RPC for admin dashboard — replaces 4 endpoints with 1 round-trip.';