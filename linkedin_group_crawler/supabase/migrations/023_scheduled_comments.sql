CREATE TABLE IF NOT EXISTS scheduled_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_post_fb UUID REFERENCES facebook_posts(id) ON DELETE SET NULL,
    id_post_li UUID REFERENCES linkedin_posts(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'linkedin')),
    post_url TEXT NOT NULL,
    group_name TEXT,
    post_content TEXT,
    id_member UUID NOT NULL REFERENCES app_users(id),
    id_social_account UUID REFERENCES social_accounts(id),
    comment_content TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'posted', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    posted_at TIMESTAMPTZ,
    error_message TEXT,
    link_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sc_status_scheduled
    ON scheduled_comments(status, scheduled_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sc_member ON scheduled_comments(id_member);
