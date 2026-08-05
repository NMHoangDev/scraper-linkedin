CREATE TABLE IF NOT EXISTS quick_inbox_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'Khác',
    content TEXT NOT NULL,
    content_with_post TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qit_order
    ON quick_inbox_templates(order_index);
