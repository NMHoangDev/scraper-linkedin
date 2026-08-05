-- Tương tác nội bộ (Internal Engagement): KPI tracking for employee interactions
-- (comment / like / love / care / haha / wow / sad / angry / share) performed via
-- the comment-extension on the company's own MarkeeAI-sourced Facebook Page posts.
-- Separate from seeding_content_kpi (group seeding) since posts here come from
-- MarkeeAI, not our own crawler, and reactions have no equivalent there.

CREATE TABLE IF NOT EXISTS public.internal_engagement_kpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_member UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    fanpage_id TEXT NOT NULL,
    fanpage_name TEXT,
    facebook_post_id TEXT,
    link_post TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (
        action_type IN ('comment', 'like', 'love', 'care', 'haha', 'wow', 'sad', 'angry', 'share')
    ),
    content TEXT,
    reaction_id TEXT,
    id_social_account UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
    profile_id TEXT, -- Facebook numeric uid actually used (fallback when no id_social_account chosen)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_engagement_kpi_member
    ON public.internal_engagement_kpi(id_member);
CREATE INDEX IF NOT EXISTS idx_internal_engagement_kpi_link_post
    ON public.internal_engagement_kpi(link_post);
CREATE INDEX IF NOT EXISTS idx_internal_engagement_kpi_member_link_action
    ON public.internal_engagement_kpi(id_member, link_post, action_type);

CREATE OR REPLACE FUNCTION update_internal_engagement_kpi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_internal_engagement_kpi_updated_at ON public.internal_engagement_kpi;
CREATE TRIGGER trg_internal_engagement_kpi_updated_at
BEFORE UPDATE ON public.internal_engagement_kpi
FOR EACH ROW
EXECUTE FUNCTION update_internal_engagement_kpi_updated_at();

ALTER TABLE public.internal_engagement_kpi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to internal_engagement_kpi" ON public.internal_engagement_kpi;
CREATE POLICY "Allow authenticated full access to internal_engagement_kpi"
ON public.internal_engagement_kpi
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
