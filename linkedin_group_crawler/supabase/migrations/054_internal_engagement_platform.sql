-- Thêm cột platform rõ ràng cho internal_engagement_custom_posts và internal_engagement_kpi.
-- Trước đây platform chỉ được set cứng "facebook" ở tầng Python (không lưu DB thật),
-- nên mọi bài/KPI đều hiển thị là Facebook dù nội dung thực tế là gì. Thêm cột này để
-- LinkedIn (và các platform sau) có thể được lưu/đọc đúng, không phá dữ liệu Facebook cũ
-- (DEFAULT 'facebook' tự backfill toàn bộ row hiện có).

ALTER TABLE public.internal_engagement_custom_posts
    ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'facebook'
    CHECK (platform IN ('facebook', 'linkedin'));

ALTER TABLE public.internal_engagement_kpi
    ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'facebook'
    CHECK (platform IN ('facebook', 'linkedin'));

CREATE INDEX IF NOT EXISTS idx_internal_engagement_custom_posts_platform
    ON public.internal_engagement_custom_posts (platform);

CREATE INDEX IF NOT EXISTS idx_internal_engagement_kpi_platform
    ON public.internal_engagement_kpi (platform);
