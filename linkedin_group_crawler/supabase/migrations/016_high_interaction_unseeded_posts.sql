-- ============================================================
-- Migration 016: Phase 7 — High-Interaction Unseeded Posts RPC
--
-- Mục tiêu: Lấy các bài post có tương tác cao (reactions + comments)
-- nhưng chưa được seeding. Dùng cho admin dashboard widget
-- "Bài post có lượt tương tác cao chưa seeding".
--
-- Logic:
--   1. Lấy posts từ facebook_posts + linkedin_posts có score >= 60
--   2. Lọc bỏ posts đã có trong seeding_content_kpi (đã seeding rồi)
--   3. Sắp xếp theo total_interactions DESC, limit N (mặc định 10)
--   4. Trả về: post_id, post_url, content, group_name, score,
--      interactions, time_ago, platform
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_high_interaction_unseeded_posts(
    p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_today TIMESTAMPTZ := (CURRENT_DATE + INTERVAL '1 day') AT TIME ZONE 'Asia/Ho_Chi_Minh';
    v_week_start TIMESTAMPTZ := (CURRENT_DATE - INTERVAL '7 days') AT TIME ZONE 'Asia/Ho_Chi_Minh';
    v_result JSONB;
BEGIN
    -- Trả về posts từ facebook_posts: score >= 60, chưa seeding, lấy theo tương tác cao
    WITH fb_posts AS (
        SELECT
            p.id::text AS post_id,
            p.post_url,
            COALESCE(p.content, '') AS content,
            COALESCE(g.group_name, '') AS group_name,
            p.score,
            COALESCE(p.reactions, 0)::int + COALESCE(p.comments, 0)::int AS interactions,
            p.crawl_date,
            'facebook' AS platform,
            p.created_at,
            CASE
                WHEN p.crawl_date >= (CURRENT_DATE::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                    THEN 'Hôm nay'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '1 day')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN 'Hôm qua'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '2 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '2 ngày trước'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '3 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '3 ngày trước'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '7 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '1 tuần trước'
                ELSE
                    EXTRACT(DAY FROM (CURRENT_DATE::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' - p.crawl_date))::int || ' ngày trước'
            END AS time_ago
        FROM public.facebook_posts p
        LEFT JOIN public.facebook_groups g ON g.id = p.group_id
        WHERE p.score >= 60
          AND p.crawl_date >= v_week_start
          AND p.id NOT IN (
              SELECT DISTINCT id_post::text FROM public.seeding_content_kpi
              WHERE id_post IS NOT NULL
          )
    ),
    li_posts AS (
        SELECT
            p.id::text AS post_id,
            p.post_url,
            COALESCE(p.content, '') AS content,
            COALESCE(g.group_name, '') AS group_name,
            p.score,
            COALESCE(p.reactions, 0)::int + COALESCE(p.comments, 0)::int AS interactions,
            p.crawl_date,
            'linkedin' AS platform,
            p.created_at,
            CASE
                WHEN p.crawl_date >= (CURRENT_DATE::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
                    THEN 'Hôm nay'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '1 day')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN 'Hôm qua'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '2 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '2 ngày trước'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '3 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '3 ngày trước'
                WHEN p.crawl_date >= (CURRENT_DATE - INTERVAL '7 days')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
                    THEN '1 tuần trước'
                ELSE
                    EXTRACT(DAY FROM (CURRENT_DATE::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' - p.crawl_date))::int || ' ngày trước'
            END AS time_ago
        FROM public.linkedin_posts p
        LEFT JOIN public.linkedin_groups g ON g.id = p.group_id
        WHERE p.score >= 60
          AND p.crawl_date >= v_week_start
          AND p.id NOT IN (
              SELECT DISTINCT id_post::text FROM public.seeding_content_kpi
              WHERE id_post IS NOT NULL
          )
    ),
    combined AS (
        SELECT * FROM fb_posts
        UNION ALL
        SELECT * FROM li_posts
    )
    SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.interactions DESC), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT post_id, post_url, content, group_name, score, interactions, time_ago, platform
        FROM combined
        ORDER BY interactions DESC
        LIMIT p_limit
    ) t;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_high_interaction_unseeded_posts IS
    'Phase 7: Returns high-interaction posts (score>=60) that have not been seeded yet, ordered by total interactions (reactions+comments). Used for admin dashboard widget.';


-- ============================================================
-- Phase 7b: Groups Health Stats RPC
--
-- Trả về thống kê sức khoẻ của groups:
--   - alive: groups có score >= 60
--   - low_activity: groups có score 20-59
--   - dead: groups có score < 20
--   - no_taxonomy: groups chưa được gắn taxonomy/icp
--   - by_tier: thống kê theo tier (từ taxonomy)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_groups_health_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH fb_stats AS (
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE score >= 60)::int AS alive,
            COUNT(*) FILTER (WHERE score >= 20 AND score < 60)::int AS low_activity,
            COUNT(*) FILTER (WHERE score < 20 OR score IS NULL)::int AS dead,
            COUNT(*) FILTER (WHERE icp IS NULL AND icp_name IS NULL AND icp_category IS NULL)::int AS no_taxonomy
        FROM public.facebook_groups
    ),
    li_stats AS (
        SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE score >= 60)::int AS alive,
            COUNT(*) FILTER (WHERE score >= 20 AND score < 60)::int AS low_activity,
            COUNT(*) FILTER (WHERE score < 20 OR score IS NULL)::int AS dead,
            COUNT(*) FILTER (WHERE icp IS NULL AND icp_name IS NULL AND icp_category IS NULL)::int AS no_taxonomy
        FROM public.linkedin_groups
    ),
    combined AS (
        SELECT
            (fb.total + li.total)::int AS total,
            (fb.alive + li.alive)::int AS alive,
            (fb.low_activity + li.low_activity)::int AS low_activity,
            (fb.dead + li.dead)::int AS dead,
            (fb.no_taxonomy + li.no_taxonomy)::int AS no_taxonomy
        FROM fb_stats fb, li_stats li
    )
    SELECT jsonb_build_object(
        'total_groups',  (SELECT total FROM combined),
        'alive',         (SELECT alive FROM combined),
        'low_activity', (SELECT low_activity FROM combined),
        'dead',         (SELECT dead FROM combined),
        'no_taxonomy',  (SELECT no_taxonomy FROM combined),
        'by_tier', COALESCE((
            SELECT jsonb_agg(row_to_json(t))
            FROM (
                SELECT
                    COALESCE(icp_name, icp, icp_category, 'Khác') AS tier_name,
                    COUNT(*)::int AS count
                FROM (
                    SELECT icp_name, icp, icp_category FROM public.facebook_groups
                    UNION ALL
                    SELECT icp_name, icp, icp_category FROM public.linkedin_groups
                ) all_groups
                WHERE COALESCE(icp_name, icp, icp_category) IS NOT NULL
                GROUP BY COALESCE(icp_name, icp, icp_category)
                ORDER BY count DESC
                LIMIT 10
            ) t
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM combined;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_groups_health_stats IS
    'Phase 7b: Returns groups health statistics (alive/low_activity/dead/no_taxonomy counts) and tier breakdown. Used for admin dashboard Groups Health widget.';
