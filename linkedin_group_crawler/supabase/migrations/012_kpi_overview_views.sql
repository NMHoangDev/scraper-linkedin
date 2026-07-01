-- ============================================================
-- Migration 012: Phase 2 — KPI aggregation VIEWs + RPC
--
-- Mục tiêu: chuyển các phép aggregate (seeding/inbox/post) từ Python
-- sang PostgreSQL để giảm round-trips giữa backend ↔ Supabase.
--
-- An toàn:
--   • Chỉ tạo VIEW + FUNCTION mới, KHÔNG thay đổi schema bảng gốc.
--   • Endpoint backend cũ /kpi/get-all vẫn hoạt động.
--   • Endpoint mới /kpi/get-team-overview-v2 dùng các VIEW này qua RPC.
-- ============================================================

-- ── View 1: verified seeding theo member × ngày ─────────────────────────────
-- Thay thế đoạn filter verify IN (...) + group trong Python.
CREATE OR REPLACE VIEW public.v_member_daily_seeding AS
SELECT
    s.id_member,
    s.current_day::date AS day,
    COUNT(*) FILTER (
        WHERE LOWER(TRIM(COALESCE(s.verify, ''))) IN
              ('yes', 'đã seeding', 'xác minh', 'verified')
    )::int AS verified_count,
    COUNT(*)::int AS total_count
FROM public.seeding_content_kpi s
WHERE s.id_member IS NOT NULL
  AND s.current_day IS NOT NULL
GROUP BY s.id_member, s.current_day::date;

COMMENT ON VIEW public.v_member_daily_seeding IS
    'Phase 2: Seeding verified count per member per day (pre-aggregated for KPI)';

-- ── View 2: FB inbox KPI theo member × ngày VN ──────────────────────────────
-- Chỉ tính inbox đã được leader confirm.
CREATE OR REPLACE VIEW public.v_member_daily_fb_inbox AS
SELECT
    f.id_member,
    (f.synced_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day_vn,
    COUNT(*) FILTER (WHERE f.is_confirmed)::int AS inbox_count,
    COUNT(*) FILTER (WHERE f.is_confirmed AND f.is_lead)::int AS lead_count
FROM public.fb_inbox_kpi f
WHERE f.id_member IS NOT NULL
  AND f.synced_at IS NOT NULL
GROUP BY f.id_member, (f.synced_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

COMMENT ON VIEW public.v_member_daily_fb_inbox IS
    'Phase 2: FB inbox + lead count per member per VN-day (only confirmed)';

-- ── View 3: FB post KPI theo member × ngày VN ───────────────────────────────
CREATE OR REPLACE VIEW public.v_member_daily_fb_post AS
SELECT
    p.id_member,
    (p.posted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day_vn,
    COUNT(*)::int AS post_count
FROM public.fb_post_kpi p
WHERE p.id_member IS NOT NULL
  AND p.posted_at IS NOT NULL
GROUP BY p.id_member, (p.posted_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

COMMENT ON VIEW public.v_member_daily_fb_post IS
    'Phase 2: FB post count per member per VN-day';

-- ── Indexes gợi ý (idempotent) ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS seeding_content_kpi_member_day_idx
    ON public.seeding_content_kpi (id_member, current_day)
    WHERE id_member IS NOT NULL AND current_day IS NOT NULL;

CREATE INDEX IF NOT EXISTS fb_inbox_kpi_member_confirmed_synced_idx
    ON public.fb_inbox_kpi (id_member, is_confirmed, synced_at DESC)
    WHERE id_member IS NOT NULL;

CREATE INDEX IF NOT EXISTS fb_post_kpi_member_posted_idx
    ON public.fb_post_kpi (id_member, posted_at DESC)
    WHERE id_member IS NOT NULL;

-- ── RPC: get_team_kpi_overview ──────────────────────────────────────────────
-- Trả về JSON tổng hợp KPI cho 1 team trong khoảng tuần.
-- Tham số:
--   p_leader_email: email leader (NULL = admin, lấy tất cả team)
--   p_id_team: UUID team cụ thể (NULL = tất cả team của leader)
--   p_start: ISO date (YYYY-MM-DD)
--   p_end:   ISO date (YYYY-MM-DD)
-- Trả về:
--   {
--     "totals": {inbox_target, lead_target, post_target, comment_target,
--                inbox_actual, lead_actual, post_actual, comment_actual,
--                member_count},
--     "members": [
--       {id, email, name, role,
--        kpi: {kpi_post, kpi_lead, kpi_inbox, kpi_comment, start_date, end_date},
--        actuals: {post, lead, inbox_zalo, inbox_fb_kpi, comment}}, ...
--     ]
--   }
--
-- Lưu ý về schema app_users (migration 001):
--   Cột thực tế chỉ có: id, email, password, name, role, is_active,
--                        created_at, updated_at.
--   KHÔNG có: slug, profile_id, facebook_name → KHÔNG select các cột này.
CREATE OR REPLACE FUNCTION public.get_team_kpi_overview(
    p_leader_email TEXT DEFAULT NULL,
    p_id_team      TEXT DEFAULT NULL,
    p_start        TEXT DEFAULT NULL,
    p_end          TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_leader_id UUID;
    v_start DATE := COALESCE(p_start::date, (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int));
    v_end   DATE := COALESCE(p_end::date,   v_start + 6);
    v_team_ids UUID[];
    v_member_ids UUID[];
    v_result JSONB;
BEGIN
    -- 1. Resolve leader
    IF p_leader_email IS NOT NULL AND p_leader_email <> '' THEN
        SELECT id INTO v_leader_id FROM public.app_users
        WHERE LOWER(email) = LOWER(TRIM(p_leader_email))
        LIMIT 1;
    END IF;

    -- 2. Resolve teams
    IF p_id_team IS NOT NULL AND p_id_team <> '' THEN
        v_team_ids := ARRAY[p_id_team::uuid];
    ELSIF v_leader_id IS NOT NULL THEN
        SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::uuid[])
        INTO v_team_ids
        FROM public.teams
        WHERE id_leader = v_leader_id;
    ELSE
        SELECT COALESCE(ARRAY_AGG(id), ARRAY[]::uuid[])
        INTO v_team_ids
        FROM public.teams;
    END IF;

    IF v_team_ids IS NULL OR array_length(v_team_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('totals', '{}'::jsonb, 'members', '[]'::jsonb);
    END IF;

    -- 3. Resolve member IDs
    SELECT COALESCE(ARRAY_AGG(DISTINCT id_member), ARRAY[]::uuid[])
    INTO v_member_ids
    FROM public.member_of_teams
    WHERE id_teams = ANY(v_team_ids);

    -- Include leader as member of own team
    IF v_leader_id IS NOT NULL AND NOT (v_leader_id = ANY(v_member_ids)) THEN
        v_member_ids := array_append(v_member_ids, v_leader_id);
    END IF;

    IF array_length(v_member_ids, 1) IS NULL THEN
        RETURN jsonb_build_object('totals', '{}'::jsonb, 'members', '[]'::jsonb);
    END IF;

    -- 4. Aggregate via VIEWs (server-side).
    --    Tách riêng 2 phần: 'totals' (CTE) và 'members' (subquery) để tránh
    --    alias scope bug ('k', 's', 'f', 'p', 'z' bị shadow khi share FROM).
    SELECT jsonb_build_object(
        'totals', (
            WITH kpi_agg AS (
                SELECT
                    COALESCE(SUM(kpi_inbox)::numeric,   0) AS inbox_target,
                    COALESCE(SUM(kpi_lead)::numeric,    0) AS lead_target,
                    COALESCE(SUM(kpi_post)::numeric,    0) AS post_target,
                    COALESCE(SUM(kpi_comment)::numeric, 0) AS comment_target
                FROM public.kpi_tracker
                WHERE id_member = ANY(v_member_ids)
                  AND status = 'active'
                  AND start_date::date = v_start
                  AND end_date::date   = v_end
            ),
            seed_agg AS (
                SELECT COALESCE(SUM(verified_count)::numeric, 0) AS comment_actual
                FROM public.v_member_daily_seeding
                WHERE id_member = ANY(v_member_ids)
                  AND day BETWEEN v_start AND v_end
            ),
            fb_inbox_agg AS (
                SELECT
                    COALESCE(SUM(inbox_count)::numeric, 0) AS inbox_actual_fb,
                    COALESCE(SUM(lead_count)::numeric,  0) AS lead_actual_fb
                FROM public.v_member_daily_fb_inbox
                WHERE id_member = ANY(v_member_ids)
                  AND day_vn BETWEEN v_start AND v_end
            ),
            fb_post_agg AS (
                SELECT COALESCE(SUM(post_count)::numeric, 0) AS post_actual
                FROM public.v_member_daily_fb_post
                WHERE id_member = ANY(v_member_ids)
                  AND day_vn BETWEEN v_start AND v_end
            ),
            zalo_agg AS (
                SELECT
                    COUNT(*)::numeric AS inbox_actual_zalo,
                    COUNT(*) FILTER (WHERE z.is_lead)::numeric AS lead_actual_zalo
                FROM public.zalo_conversation_permissions z
                WHERE z.id_member = ANY(v_member_ids)
                  AND z.shared_role = 'leader'
                  AND z.is_active = true
                  AND z.is_verify = true
                  AND z.verified_at IS NOT NULL
                  AND z.verified_at >= (v_start::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND z.verified_at <  ((v_end + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            )
            SELECT jsonb_build_object(
                'member_count',      array_length(v_member_ids, 1),
                'inbox_target',      kpi_agg.inbox_target,
                'lead_target',       kpi_agg.lead_target,
                'post_target',       kpi_agg.post_target,
                'comment_target',    kpi_agg.comment_target,
                'inbox_actual_zalo', zalo_agg.inbox_actual_zalo,
                'lead_actual_zalo',  zalo_agg.lead_actual_zalo,
                'inbox_actual_fb',   fb_inbox_agg.inbox_actual_fb,
                'lead_actual_fb',    fb_inbox_agg.lead_actual_fb,
                'post_actual',       fb_post_agg.post_actual,
                'comment_actual',    seed_agg.comment_actual
            )
            FROM kpi_agg, seed_agg, fb_inbox_agg, fb_post_agg, zalo_agg
        ),
        'members', COALESCE((
            SELECT jsonb_agg(row_to_json(t))
            FROM (
                SELECT
                    u.id::text AS id,
                    LOWER(u.email) AS email,
                    u.name,
                    COALESCE(u.role, 'member') AS role,
                    jsonb_build_object(
                        'kpi_post',    COALESCE(kt.kpi_post,    0),
                        'kpi_lead',    COALESCE(kt.kpi_lead,    0),
                        'kpi_inbox',   COALESCE(kt.kpi_inbox,   0),
                        'kpi_comment', COALESCE(kt.kpi_comment, 0),
                        'start_date',  kt.start_date,
                        'end_date',    kt.end_date
                    ) AS kpi,
                    jsonb_build_object(
                        'comment',          COALESCE(s.verified_count, 0),
                        'post',             COALESCE(p.post_count, 0),
                        'inbox_zalo',       COALESCE(z.inbox_count, 0),
                        'lead_zalo',        COALESCE(z.lead_count, 0),
                        'inbox_fb_kpi',     COALESCE(f.inbox_count, 0),
                        'lead_fb_kpi',      COALESCE(f.lead_count, 0)
                    ) AS actuals
                FROM public.app_users u
                LEFT JOIN public.kpi_tracker kt
                       ON kt.id_member = u.id AND kt.status = 'active'
                      AND kt.start_date::date = v_start
                      AND kt.end_date::date   = v_end
                LEFT JOIN (
                    SELECT id_member, SUM(verified_count)::int AS verified_count
                    FROM public.v_member_daily_seeding
                    WHERE id_member = ANY(v_member_ids)
                      AND day BETWEEN v_start AND v_end
                    GROUP BY id_member
                ) s ON s.id_member = u.id
                LEFT JOIN (
                    SELECT id_member, SUM(inbox_count)::int AS inbox_count,
                                     SUM(lead_count)::int AS lead_count
                    FROM public.v_member_daily_fb_inbox
                    WHERE id_member = ANY(v_member_ids)
                      AND day_vn BETWEEN v_start AND v_end
                    GROUP BY id_member
                ) f ON f.id_member = u.id
                LEFT JOIN (
                    SELECT id_member, SUM(post_count)::int AS post_count
                    FROM public.v_member_daily_fb_post
                    WHERE id_member = ANY(v_member_ids)
                      AND day_vn BETWEEN v_start AND v_end
                    GROUP BY id_member
                ) p ON p.id_member = u.id
                LEFT JOIN (
                    SELECT z.id_member,
                           COUNT(*)::int AS inbox_count,
                           COUNT(*) FILTER (WHERE z.is_lead)::int AS lead_count
                    FROM public.zalo_conversation_permissions z
                    WHERE z.id_member = ANY(v_member_ids)
                      AND z.shared_role = 'leader'
                      AND z.is_active = true
                      AND z.is_verify = true
                      AND z.verified_at IS NOT NULL
                      AND z.verified_at >= (v_start::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                      AND z.verified_at <  ((v_end + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                    GROUP BY z.id_member
                ) z ON z.id_member = u.id
                WHERE u.id = ANY(v_member_ids)
                ORDER BY u.email NULLS LAST
            ) t
        ), '[]'::jsonb),
        'range', jsonb_build_object('start', v_start, 'end', v_end)
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_team_kpi_overview IS
    'Phase 2 RPC: trả JSON tổng hợp KPI của team. Thay thế ~40 truy vấn Supabase bằng 1 round-trip.';