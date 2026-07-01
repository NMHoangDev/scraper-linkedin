-- ============================================================
-- Migration 015: Phase 6 — Unified Feed Overview RPC
--
-- Mục tiêu: thay thế 3+ round-trips hiện tại mỗi khi load
-- /all-platform/post-feed:
--   1. /unified/posts/filter (list + pagination + all_seedings)
--   2. /unified/stats (dashboard KPIs)
--   3. N × kpi get-by-email (member personal KPI)
--   4. (admin/leader) /teams + leader-view inbox-share
-- bằng 1 RPC duy nhất `get_unified_feed_overview()`.
--
-- Lý do tạo RPC thay vì chỉ gộp stats vào filter response
-- (đã làm ở Phase A1): FE còn cần:
--   • "Member hàng đầu seeding hôm nay" cho admin/leader
--   • "Bài được nhiều người seeding nhất" (top-N)
--   • My KPI target/progress/remaining (đã có trong stats nhưng
--     cần tách để hiển thị rõ ràng trên dashboard)
--   • Team overview cho leader
-- Tất cả đều query cùng 1 nhóm bảng seeding_content_kpi +
-- seeding verify → 1 RPC gộp sẽ tận dụng được connection +
-- planner cache + tránh N+1 fan-out.
--
-- Output JSON shape (tương thích ngược với response hiện tại
-- của /unified/posts/filter, chỉ thêm các field mới):
-- {
--   posts: [...],                -- 15 bài (page_size hiện tại)
--   total: 1234,
--   page: 1, page_size: 15, total_pages: 83,
--   quick_stats: {...},          -- giống /unified/stats
--   my_kpi: {                    -- chỉ member (không admin/leader)
--     kpi_comment_target, kpi_comment_current, remaining, percent
--   } | null,
--   team_kpi: {                  -- chỉ leader (team của họ)
--     team_id, team_name,
--     total_seeded_today, total_verified_today, total_members,
--     active_members_today
--   } | null,
--   top_seeding_today: [         -- chỉ admin/leader
--     { post_id, post_url, content, group_name, seeding_count,
--       verified_count, unique_members }
--   ] | null,
--   top_seeders_today: [         -- chỉ admin/leader
--     { member_id, member_email, member_name, team_name,
--       seeding_count, verified_count }
--   ] | null,
--   range: { start, end }
-- }
--
-- Phạm vi: RPC này KHÔNG thay thế /unified/posts/filter (vẫn cần
-- trả full posts list + all_seedings). Nó chỉ bổ sung các KPI
-- aggregation mà FE Phase 6 cần. Tổng payload ~50KB JSONB.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_unified_feed_overview(
    p_email        TEXT,
    p_platform     TEXT DEFAULT 'all',
    p_date_from    DATE DEFAULT NULL,
    p_date_to      DATE DEFAULT NULL,
    p_limit        INT DEFAULT 15,
    p_offset       INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_user_id       UUID;
    v_user_role     TEXT;
    v_today         DATE := CURRENT_DATE;
    v_start         DATE := COALESCE(p_date_from, v_today - INTERVAL '30 days');
    v_end           DATE := COALESCE(p_date_to, v_today);
    v_tables        TEXT[];
    v_all_posts     JSONB := '[]'::jsonb;
    v_total         INT   := 0;
    v_stats         JSONB;
    v_my_kpi        JSONB;
    v_team_kpi      JSONB;
    v_top_seeding   JSONB;
    v_top_seeders   JSONB;
    v_result        JSONB;
BEGIN
    -- 1. Resolve user identity
    IF p_email IS NOT NULL AND p_email <> '' THEN
        SELECT id, role INTO v_user_id, v_user_role
        FROM public.app_users
        WHERE email = LOWER(TRIM(p_email))
        LIMIT 1;
    END IF;

    v_user_role := COALESCE(v_user_role, 'member');

    -- 2. Resolve tables from platform token
    IF LOWER(p_platform) IN ('facebook', 'fb') THEN
        v_tables := ARRAY['facebook_posts'];
    ELSIF LOWER(p_platform) IN ('linkedin', 'li') THEN
        v_tables := ARRAY['linkedin_posts'];
    ELSE
        v_tables := ARRAY['facebook_posts', 'linkedin_posts'];
    END IF;

    -- 3. Quick stats — global dashboard KPIs (giống _fetch_stats)
    --    Compute inline; giữ behavior tương đương /unified/stats để
    --    FE fallback hoạt động khi backend chưa gộp quick_stats vào
    --    /posts/filter.
    SELECT jsonb_build_object(
        'totalPostsToday', (
            SELECT COUNT(*)::int FROM public.facebook_posts
            WHERE crawl_date >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND crawl_date <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ) + (
            SELECT COUNT(*)::int FROM public.linkedin_posts
            WHERE crawl_date >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND crawl_date <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        ),
        'totalPosts', (
            SELECT COUNT(*)::int FROM public.facebook_posts
        ) + (
            SELECT COUNT(*)::int FROM public.linkedin_posts
        ),
        'highScoreCount', (
            SELECT COUNT(*)::int FROM public.facebook_posts WHERE score >= 70
        ) + (
            SELECT COUNT(*)::int FROM public.linkedin_posts WHERE score >= 70
        ),
        'seededToday', (
            SELECT COUNT(DISTINCT id_post)::int
            FROM public.seeding_content_kpi
            WHERE verify IN ('yes', 'đã seeding', 'xác minh', 'verified')
              AND created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
        )
    ) INTO v_stats;

    v_stats := v_stats || jsonb_build_object(
        'postsYesterday', 0, -- simplified; FE sẽ dùng /unified/stats cho delta
        'totalVisible', (v_stats->>'totalPosts')::int,
        'highScorePercent', CASE
            WHEN (v_stats->>'totalPosts')::int > 0
            THEN ROUND(((v_stats->>'highScoreCount')::numeric / (v_stats->>'totalPosts')::numeric) * 100, 1)
            ELSE 0
        END,
        'kpiProgress', 0,
        'kpiTarget', 0,
        'kpiProgressPercent', 0
    );

    -- 4. My KPI (member + leader self-KPI)
    -- Leaders are also members of their own team — show them their personal KPI too.
    IF v_user_role IN ('member', 'leader') AND v_user_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'kpi_comment_target', COALESCE(SUM(kt.kpi_comment), 0)::int,
            'kpi_comment_current', COALESCE(SUM(s.verified_count), 0)::int,
            'remaining', GREATEST(
                COALESCE(SUM(kt.kpi_comment), 0)::int - COALESCE(SUM(s.verified_count), 0)::int,
                0
            ),
            'percent', CASE
                WHEN COALESCE(SUM(kt.kpi_comment), 0) > 0
                THEN ROUND(
                    (COALESCE(SUM(s.verified_count), 0)::numeric / SUM(kt.kpi_comment)) * 100,
                    1
                )
                ELSE 0
            END
        )
        INTO v_my_kpi
        FROM public.kpi_tracker kt
        LEFT JOIN (
            SELECT id_member, SUM(verified_count)::int AS verified_count
            FROM public.v_member_daily_seeding
            WHERE day BETWEEN v_start AND v_end
            GROUP BY id_member
        ) s ON s.id_member = kt.id_member
        WHERE kt.id_member = v_user_id
          AND kt.status = 'active'
          AND kt.start_date <= v_end
          AND kt.end_date >= v_start;
    END IF;

    -- 5. Team KPI (leader)
    IF v_user_role = 'leader' AND v_user_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'team_id', t.id::text,
            'team_name', t.name_team,
            'total_members', COALESCE((
                SELECT COUNT(*)::int FROM public.member_of_teams
                WHERE id_teams = t.id
            ), 0),
            'total_seeded_today', COALESCE((
                SELECT COUNT(DISTINCT sk.id_post)::int
                FROM public.seeding_content_kpi sk
                JOIN public.member_of_teams mot ON mot.id_member = sk.id_member
                WHERE mot.id_teams = t.id
                  AND sk.verify IN ('yes', 'đã seeding', 'xác minh', 'verified')
                  AND sk.created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND sk.created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            ), 0),
            'total_verified_today', COALESCE((
                SELECT COUNT(*)::int
                FROM public.seeding_content_kpi sk
                JOIN public.member_of_teams mot ON mot.id_member = sk.id_member
                WHERE mot.id_teams = t.id
                  AND sk.verify IN ('yes', 'đã seeding', 'xác minh', 'verified')
                  AND sk.created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND sk.created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            ), 0),
            'active_members_today', COALESCE((
                SELECT COUNT(DISTINCT sk.id_member)::int
                FROM public.seeding_content_kpi sk
                JOIN public.member_of_teams mot ON mot.id_member = sk.id_member
                WHERE mot.id_teams = t.id
                  AND sk.created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND sk.created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            ), 0)
        )
        INTO v_team_kpi
        FROM public.teams t
        WHERE t.id_leader = v_user_id
        LIMIT 1;
    END IF;

    -- 6. Top seeding posts today (admin/leader) — kèm danh sách seeders chi tiết
    IF v_user_role IN ('admin', 'leader') THEN
        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.seeding_count DESC), '[]'::jsonb)
        INTO v_top_seeding
        FROM (
            WITH post_seeders AS (
                SELECT
                    sk.id_post,
                    u.id::text AS member_id,
                    COALESCE(u.name, u.email) AS member_name,
                    u.email AS member_email,
                    COALESCE(tm.name_team, '') AS team_name,
                    sk.verify,
                    sk.link_comment,
                    sk.created_at
                FROM public.seeding_content_kpi sk
                JOIN public.app_users u ON u.id = sk.id_member
                LEFT JOIN public.member_of_teams mot ON mot.id_member = u.id
                LEFT JOIN public.teams tm ON tm.id = mot.id_teams
                WHERE sk.created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                  AND sk.created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            )
            SELECT
                p.id::text AS post_id,
                p.post_url,
                COALESCE(p.content, '') AS content,
                COALESCE(g.group_name, '') AS group_name,
                COUNT(*)::int AS seeding_count,
                COUNT(*) FILTER (WHERE sk.verify IN ('yes', 'đã seeding', 'xác minh', 'verified'))::int
                    AS verified_count,
                COUNT(DISTINCT sk.member_id)::int AS unique_members,
                -- Danh sách chi tiết seeders cho mỗi post
                COALESCE(jsonb_agg(
                    jsonb_build_object(
                        'member_id', sk.member_id,
                        'member_name', sk.member_name,
                        'member_email', sk.member_email,
                        'team_name', sk.team_name,
                        'verify', sk.verify,
                        'comment_url', sk.link_comment,
                        'seeding_time', sk.created_at
                    ) ORDER BY sk.created_at DESC
                ), '[]'::jsonb) AS seeders
            FROM post_seeders sk
            JOIN public.facebook_posts p ON p.id = sk.id_post
            LEFT JOIN public.facebook_groups g ON g.id = p.group_id
            GROUP BY p.id, p.post_url, p.content, g.group_name
            ORDER BY seeding_count DESC
            LIMIT 5
        ) t;

        SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.seeding_count DESC), '[]'::jsonb)
        INTO v_top_seeders
        FROM (
            SELECT
                u.id::text AS member_id,
                u.email AS member_email,
                COALESCE(u.name, u.email) AS member_name,
                COALESCE(tm.name_team, '') AS team_name,
                COUNT(*)::int AS seeding_count,
                COUNT(*) FILTER (WHERE sk.verify IN ('yes', 'đã seeding', 'xác minh', 'verified'))::int
                    AS verified_count
            FROM public.seeding_content_kpi sk
            JOIN public.app_users u ON u.id = sk.id_member
            LEFT JOIN public.member_of_teams mot ON mot.id_member = u.id
            LEFT JOIN public.teams tm ON tm.id = mot.id_teams
            WHERE sk.created_at >= (v_today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND sk.created_at <  ((v_today + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            GROUP BY u.id, u.email, u.name, tm.name_team
            ORDER BY seeding_count DESC
            LIMIT 5
        ) t;
    END IF;

    -- Note: posts list + all_seedings vẫn do backend Python compute
    -- (qua /unified/posts/filter) vì RPC không thể dễ dàng emulate
    -- supabase-py queries với complex joins + dynamic filters.
    -- RPC này chỉ trả các KPI aggregation ở trên.
    -- FE sẽ gọi song song RPC này + /posts/filter và merge response.

    v_result := jsonb_build_object(
        'quick_stats', v_stats,
        'my_kpi',      v_my_kpi,
        'team_kpi',    v_team_kpi,
        'top_seeding_today', v_top_seeding,
        'top_seeders_today', v_top_seeders,
        'range',       jsonb_build_object('start', v_start, 'end', v_end)
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_unified_feed_overview IS
    'Phase 6: Single RPC for unified feed overview. Returns dashboard KPIs (quick_stats), member KPI, leader team KPI, and admin/leader top-seeders/top-posts aggregations. Frontend calls this in parallel with /unified/posts/filter to save N round-trips.';