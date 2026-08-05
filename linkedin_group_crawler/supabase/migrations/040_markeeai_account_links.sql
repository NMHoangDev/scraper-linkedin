-- Maps our own app_users to their real MarkeeAI login, so that when someone
-- opens Tương tác nội bộ, the backend fetches posts using THEIR OWN MarkeeAI
-- identity (and whatever campaigns they're actually a member of there)
-- instead of always going through one shared service account.
--
-- Password is stored plaintext (same convention as social_accounts.account_password
-- in migration 001) because the backend must actively re-send it to log in as
-- that person later — this is an auto-generated credential we provisioned
-- ourselves, not the person's real MarkeeAI/Google password.

CREATE TABLE IF NOT EXISTS public.markeeai_account_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_member UUID NOT NULL UNIQUE REFERENCES public.app_users(id) ON DELETE CASCADE,
    markeeai_email TEXT NOT NULL,
    markeeai_password TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_markeeai_account_links_member
    ON public.markeeai_account_links(id_member);

CREATE OR REPLACE FUNCTION update_markeeai_account_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_markeeai_account_links_updated_at ON public.markeeai_account_links;
CREATE TRIGGER trg_markeeai_account_links_updated_at
BEFORE UPDATE ON public.markeeai_account_links
FOR EACH ROW
EXECUTE FUNCTION update_markeeai_account_links_updated_at();

ALTER TABLE public.markeeai_account_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to markeeai_account_links" ON public.markeeai_account_links;
CREATE POLICY "Allow authenticated full access to markeeai_account_links"
ON public.markeeai_account_links
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
