-- Hàng đợi job cào bài cho các VPS worker chạy Chrome extension.
-- Main VPS chỉ enqueue job; mỗi worker tự poll GET /next-job để nhận việc
-- (mô hình PULL, tránh việc main phải giữ kết nối/broadcast tới từng worker).

CREATE TABLE IF NOT EXISTS crawl_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT NOT NULL UNIQUE,
    name TEXT,
    status TEXT NOT NULL DEFAULT 'offline'
        CHECK (status IN ('idle', 'busy', 'offline')),
    current_job_id UUID,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL DEFAULT 'facebook' CHECK (platform IN ('facebook', 'linkedin')),
    group_url TEXT NOT NULL,
    group_name TEXT,
    group_id UUID,
    id_member UUID,
    keywords JSONB,
    post_limit INT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'assigned', 'processing', 'done', 'failed')),
    assigned_worker_id TEXT,
    result_count INT,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_created
    ON crawl_jobs(status, created_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_processing_worker
    ON crawl_jobs(assigned_worker_id, status) WHERE status IN ('assigned', 'processing');

-- Claim atomic 1 job pending, tránh 2 worker cùng lấy 1 job khi gọi đồng thời.
CREATE OR REPLACE FUNCTION claim_next_crawl_job(p_worker_id TEXT)
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
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;
