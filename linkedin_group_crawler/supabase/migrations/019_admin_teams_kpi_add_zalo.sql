-- ============================================================
-- Migration 019: Cong them Zalo lead/inbox vao RPC
-- get_admin_teams_kpi_overview (trang /admin/teams-management).
--
-- Boi canh: migration 014/018 chi tinh actual inbox/lead tu nguon
-- Facebook (v_member_daily_fb_inbox). Logic KPI cu o
-- supabase_kpi_service.py va RPC leader (migration 012) van cong
-- ca Zalo (zalo_conversation_permissions da verify boi leader).
-- Neu member lam lead/inbox qua Zalo thi trang admin teams se
-- thieu so — fix bang cach them nhanh UNION ALL dem Zalo, dung
-- DUNG dieu kien nhu migration 012 (shared_role='leader',
-- is_active, is_verify, verified_at trong khoang, mui gio VN).
--
-- CHAY SAU migration 018 (file nay bao gom ca fix LATERAL cua 018,
-- nen chay 018 roi 019, hoac chi can chay 019 la du ca 2 fix).
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
                    -- Actuals (FB + Zalo)
                    COALESCE(s.verified_count, 0)                     AS verified_count,
                    COALESCE(fb.post_count, 0)                        AS post_count,
                    COALESCE(fb.inbox_count, 0)                       AS inbox_count,
                    COALESCE(fb.lead_count, 0)                        AS lead_count,
                    -- Computed convenience (alias de tuong thich FE cu)
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
                -- LATERAL + LIMIT 1 (fix migration 018): toi da 1 row kpi_tracker/member
                LEFT JOIN LATERAL (
                    SELECT kt2.kpi_post, kt2.kpi_lead, kt2.kpi_inbox, kt2.kpi_comment
                    FROM public.kpi_tracker kt2
                    WHERE kt2.id_member = mu.id
                      AND kt2.status = 'active'
                      AND kt2.start_date::date <= v_end
                      AND kt2.end_date::date   >= v_start
                    ORDER BY
                        (kt2.id_team = tm.id) DESC NULLS LAST,
                        kt2.updated_at DESC
                    LIMIT 1
                ) kt ON TRUE
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
                        UNION ALL
                        -- 019: Zalo inbox/lead — dem hoi thoai da duoc leader verify,
                        -- dieu kien va mui gio giong het RPC leader (migration 012)
                        SELECT z.id_member,
                               1                                        AS inbox_count,
                               CASE WHEN z.is_lead THEN 1 ELSE 0 END    AS lead_count,
                               0                                        AS post_count
                        FROM public.zalo_conversation_permissions z
                        WHERE z.shared_role = 'leader'
                          AND z.is_active = true
                          AND z.is_verify = true
                          AND z.verified_at IS NOT NULL
                          AND z.verified_at >= (v_start::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                          AND z.verified_at <  ((v_end + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
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
    'Admin teams-management RPC. 018: LATERAL+LIMIT 1 chong dem KPI 2 lan. 019: cong them Zalo lead/inbox (zalo_conversation_permissions da verify) vao actual, khop logic supabase_kpi_service.py + RPC leader (012).';
