-- Gắn chủ sở hữu (nhân viên) cho từng acc trong pool crawl_fb_accounts, để VPS worker
-- claim ĐÚNG acc của đúng nhân viên sở hữu nhóm đang cào (nhóm Facebook là nhóm kín,
-- chỉ acc là thành viên mới xem được bài viết) -- thay vì lấy acc bất kỳ trong pool.

ALTER TABLE crawl_fb_accounts
    ADD COLUMN IF NOT EXISTS id_member UUID;

CREATE INDEX IF NOT EXISTS idx_crawl_fb_accounts_owner_available
    ON crawl_fb_accounts(id_member, status) WHERE status = 'available';

-- Claim atomic 1 acc 'available' ĐÚNG CHỦ p_id_member. Nếu job không yêu cầu chủ cụ thể
-- (p_id_member IS NULL -- job cũ/không gắn owner) thì vẫn cho lấy acc bất kỳ, giữ hành vi
-- cũ cho case này. Dùng "p_id_member IS NULL OR id_member = p_id_member" thay vì so sánh
-- "=" trần, vì SQL "=" với NULL luôn là unknown -- sẽ khiến acc chưa backfill id_member
-- (đang NULL) không bao giờ claim được khi job có yêu cầu chủ cụ thể.
DROP FUNCTION IF EXISTS claim_next_fb_account(TEXT);
CREATE OR REPLACE FUNCTION claim_next_fb_account(p_worker_id TEXT, p_id_member UUID)
RETURNS SETOF crawl_fb_accounts AS $$
BEGIN
    RETURN QUERY
    UPDATE crawl_fb_accounts
    SET status = 'assigned',
        assigned_worker_id = p_worker_id,
        assigned_at = now(),
        last_used_at = now()
    WHERE id = (
        SELECT id FROM crawl_fb_accounts
        WHERE status = 'available'
          AND (p_id_member IS NULL OR id_member = p_id_member)
        ORDER BY last_used_at ASC NULLS FIRST, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Claim job kế tiếp, ƯU TIÊN (không bắt buộc) job cùng chủ với acc worker đang cầm --
-- tránh đổi acc liên tục khi hàng đợi có job xen kẽ nhiều nhân viên. Việc đảm bảo ĐÚNG
-- acc cho ĐÚNG job vẫn nằm ở claim_next_fb_account phía trên, không phải ở đây.
DROP FUNCTION IF EXISTS claim_next_crawl_job(TEXT);
CREATE OR REPLACE FUNCTION claim_next_crawl_job(p_worker_id TEXT, p_current_id_member UUID DEFAULT NULL)
RETURNS SETOF crawl_jobs AS $$
BEGIN
    RETURN QUERY
    UPDATE crawl_jobs
    SET status = 'assigned',
        assigned_worker_id = p_worker_id,
        assigned_at = now()
    WHERE id = (
        SELECT id FROM crawl_jobs
        WHERE status = 'pending'
        ORDER BY (id_member IS NOT DISTINCT FROM p_current_id_member) DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;
