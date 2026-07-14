-- Pool tài khoản Facebook "seeding" dùng chung cho các VPS worker.
-- Cookie được Playwright tạo ra qua flow /auth/login (facebook_auth.py) sẽ tự
-- được đẩy vào đây; mỗi VPS worker (extension) claim atomic 1 acc chưa ai dùng,
-- backend convert cookie sang format chrome.cookies.set() ngay khi trả về.
-- Mô hình claim giống hệt claim_next_crawl_job (FOR UPDATE SKIP LOCKED).

CREATE TABLE IF NOT EXISTS crawl_fb_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    cookie_playwright JSONB NOT NULL,   -- storage_state() gốc từ Playwright, giữ lại để tiện debug/re-login tay
    status TEXT NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'assigned', 'invalid')),
    assigned_worker_id TEXT,
    assigned_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    error_message TEXT,
    fail_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_fb_accounts_available
    ON crawl_fb_accounts(status, last_used_at) WHERE status = 'available';

CREATE INDEX IF NOT EXISTS idx_crawl_fb_accounts_assigned_worker
    ON crawl_fb_accounts(assigned_worker_id) WHERE status = 'assigned';

-- Claim atomic 1 acc 'available', ưu tiên acc lâu chưa dùng nhất (round-robin thô)
-- để dàn tải qua nhiều acc, tránh dồn hết vào 1 acc dễ bị Facebook khoá.
CREATE OR REPLACE FUNCTION claim_next_fb_account(p_worker_id TEXT)
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
        ORDER BY last_used_at ASC NULLS FIRST, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;
