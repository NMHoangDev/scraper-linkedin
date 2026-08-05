-- ============================================================
-- BẢNG: internal_engagement_custom_posts
-- Lưu các bài viết được nhân viên thêm thủ công bằng link
-- ============================================================

CREATE TABLE IF NOT EXISTS public.internal_engagement_custom_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

-- Link bài viết Facebook
link_post TEXT NOT NULL,

-- Người đã thêm bài viết
id_member UUID REFERENCES public.app_users (id) ON DELETE SET NULL,

-- Nội dung bài viết
content TEXT,

-- Danh sách media của bài viết (image/video...)
media_urls JSONB DEFAULT '[]'::jsonb,

-- Tên Fanpage
fanpage_name TEXT,

-- Thời gian bài viết được đăng
published_at TIMESTAMPTZ,

-- Thời gian tạo/cập nhật record
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_internal_engagement_custom_posts_link ON public.internal_engagement_custom_posts (link_post);

-- ============================================================
-- TRIGGER: Tự động cập nhật updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_internal_engagement_custom_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_internal_engagement_custom_posts_updated_at ON public.internal_engagement_custom_posts;

CREATE TRIGGER trg_internal_engagement_custom_posts_updated_at
BEFORE UPDATE ON public.internal_engagement_custom_posts
FOR EACH ROW
EXECUTE FUNCTION update_internal_engagement_custom_posts_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.internal_engagement_custom_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to internal_engagement_custom_posts" ON public.internal_engagement_custom_posts;

CREATE POLICY "Allow authenticated full access to internal_engagement_custom_posts" ON public.internal_engagement_custom_posts FOR ALL TO authenticated USING (true)
WITH
    CHECK (true);