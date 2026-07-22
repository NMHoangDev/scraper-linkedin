-- ============================================================
-- Migration 048: get_admin_teams_kpi_overview() RPC (dung boi
-- /teams/with-kpi - man "Quan ly Team" cua Admin) chua biet gi ve
-- teams.leader_member_id (migration 047).
--
-- Trieu chung: Team tao thanh cong voi Leader CHUA lien ket tai khoan
-- (id_leader = NULL, leader_member_id = <member.id>) VAN xuat hien trong
-- response cua RPC nay (LEFT JOIN app_users khong loai bo no), NHUNG
-- leader_name/leader_email deu tra ve CHUOI RONG - vi RPC chi lay ten tu
-- app_users (lu.name), khong biet fallback ve members.display_name qua
-- leader_member_id nhu ham Python _load_all_teams() da duoc sua o
-- migration 047. UI hien "Chua dat ten" cho team nay, trong khi endpoint
-- /teams (khong dung RPC) da hien dung ten - day la nguyen nhan that su
-- khien Admin nghi team "khong len danh sach" (thuc ra co len, chi mat ten
-- leader nen nhin nham la loi/mat du lieu).
--
-- Fix: CREATE OR REPLACE giu nguyen 100% logic cu, chi doi phan 'teams':
--   - Them LEFT JOIN public.members lm ON lm.id = tm.leader_member_id
--   - leader_name/leader_email fallback qua members khi chua lien ket
--   - Tra them leader_member_id de FE biet chinh xac ai la leader
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
                    tm.leader_member_id::text          AS leader_member_id,
                    COALESCE(lu.email, '')            AS leader_email,
                    -- 048: fallback ve members.display_name khi Leader chua
                    -- lien ket tai khoan dang nhap (lu.name la NULL vi
                    -- LEFT JOIN app_users khong khop duoc).
                    COALESCE(lu.name, lm.display_name, lm.full_name, '') AS leader_name,
                    (tm.id_leader IS NOT NULL)        AS leader_linked,
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
                LEFT JOIN public.members lm ON lm.id = tm.leader_member_id
            ) t
        ), '[]'::jsonb),

        'kpi_data', COALESCE((
            SELECT jsonb_agg(row_to_json(t) ORDER BY t.team_name, t.is_leader DESC, t.member_email)
            FROM (
                SELECT
                    p.team_id                                         AS team_id,
                    p.team_name                                       AS team_name,
                    p.leader_email                                    AS leader_email,
                    p.person_id::text                                 AS member_id,
                    p.person_email                                    AS member_email,
                    p.person_name                                     AS member_name,
                    p.is_leader                                       AS is_leader,
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
                FROM (
                    SELECT
                        tm.id                              AS team_id_raw,
                        tm.id::text                         AS team_id,
                        tm.name_team                        AS team_name,
                        COALESCE(leader.email, '')          AS leader_email,
                        mu.id                                AS person_id,
                        mu.email                             AS person_email,
                        COALESCE(mu.name, mu.email)          AS person_name,
                        false                                AS is_leader
                    FROM public.teams tm
                    LEFT JOIN public.app_users leader ON leader.id = tm.id_leader
                    JOIN public.member_of_teams mot ON mot.id_teams = tm.id
                    JOIN public.app_users mu ON mu.id = mot.id_member

                    UNION ALL

                    SELECT
                        tm.id                              AS team_id_raw,
                        tm.id::text                         AS team_id,
                        tm.name_team                        AS team_name,
                        leader.email                         AS leader_email,
                        leader.id                            AS person_id,
                        leader.email                         AS person_email,
                        COALESCE(leader.name, leader.email)  AS person_name,
                        true                                 AS is_leader
                    FROM public.teams tm
                    JOIN public.app_users leader ON leader.id = tm.id_leader
                ) p
                LEFT JOIN LATERAL (
                    SELECT kt2.kpi_post, kt2.kpi_lead, kt2.kpi_inbox, kt2.kpi_comment
                    FROM public.kpi_tracker kt2
                    WHERE kt2.id_member = p.person_id
                      AND kt2.status = 'active'
                      AND kt2.start_date::date <= v_end
                      AND kt2.end_date::date   >= v_start
                    ORDER BY
                        (kt2.id_team = p.team_id_raw) DESC NULLS LAST,
                        kt2.updated_at DESC
                    LIMIT 1
                ) kt ON TRUE
                LEFT JOIN (
                    SELECT id_member, SUM(verified_count)::int AS verified_count
                    FROM public.v_member_daily_seeding
                    WHERE day BETWEEN v_start AND v_end
                    GROUP BY id_member
                ) s ON s.id_member = p.person_id
                LEFT JOIN (
                    SELECT id_member,
                           SUM(inbox_count)::int AS inbox_count,
                           SUM(lead_count)::int  AS lead_count,
                           SUM(post_count)::int  AS post_count
                    FROM (
                        SELECT id_member, inbox_count, 0 AS lead_count, 0 AS post_count
                        FROM public.v_member_daily_fb_inbox
                        WHERE day_vn BETWEEN v_start AND v_end
                        UNION ALL
                        SELECT id_member, 0 AS inbox_count, lead_count, 0 AS post_count
                        FROM public.v_member_daily_fb_lead
                        WHERE day_vn BETWEEN v_start AND v_end
                        UNION ALL
                        SELECT id_member, 0, 0, post_count
                        FROM public.v_member_daily_fb_post
                        WHERE day_vn BETWEEN v_start AND v_end
                        UNION ALL
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
                ) fb ON fb.id_member = p.person_id
            ) t
        ), '[]'::jsonb),

        'range', jsonb_build_object('start', v_start, 'end', v_end)
    );
END;
$$;

COMMENT ON FUNCTION public.get_admin_teams_kpi_overview IS
    'Admin teams-management RPC. 018: LATERAL+LIMIT 1 chong dem KPI 2 lan. 019: cong them Zalo lead/inbox vao actual. 020: them dong KPI rieng cho chinh leader. 042: tach nguon lead_count (v_member_daily_fb_lead, theo synced_at - tuan XAC NHAN) khoi inbox_count (v_member_daily_fb_inbox, theo created_at - tuan tin nhan). 048: tra leader_member_id + fallback leader_name qua members.display_name khi Leader chua lien ket tai khoan dang nhap (teams.id_leader NULL).';
