ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

ALTER TABLE public.social_accounts
ADD COLUMN IF NOT EXISTS ban_reason TEXT;