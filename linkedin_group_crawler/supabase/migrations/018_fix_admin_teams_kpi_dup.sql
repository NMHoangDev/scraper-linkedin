-- ============================================================
-- Migration 018: Fix duplicate kpi_tracker fan-out in
-- get_admin_teams_kpi_overview (migration 014).
--
-- Bug: kpi_tracker khong co unique constraint 1 member = 1 row
-- active/date-range. LEFT JOIN thuong (khong LIMIT) fan-out khi
-- 1 member co >=2 row "active" trung/giao khoang ngay (vd 1 row
-- moi coc id_team dung, 1 row cu/mo coi id_team=null con sot lai
-- tu truoc). Ket qua: kpi_data tra ve 2 dong cho cung 1 member,
-- FE cong don lam sai lech target/actual cua ca team.
--
-- Fix: thay LEFT JOIN thuong bang LEFT JOIN LATERAL ... LIMIT 1,
-- uu tien row dung id_team hien tai, fallback row moi cap nhat
-- nhat neu khong co row nao gan dung team (vd KPI gan rieng le
-- khong qua team). Dam bao luon toi da 1 row kpi_tracker/member.
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
                    -- Actuals
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
                -- LATERAL + LIMIT 1: dam bao toi da 1 row kpi_tracker/member, tranh
                -- fan-out khi co du lieu mo coi/trung khoang ngay. Uu tien row dung
                -- id_team hien tai; fallback row moi cap nhat nhat (KPI gan rieng le
                -- khong qua team van hien dung, giu tuong thich nguoc).
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
    'Phase 5: Single RPC for admin teams-management page — replaces 1 + N HTTP requests with 1 round-trip. Fixed in migration 018: LATERAL+LIMIT 1 join on kpi_tracker to prevent duplicate-row fan-out from orphaned/overlapping active rows.';
