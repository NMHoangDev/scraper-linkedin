-- ============================================================
-- Migration 077: CRM customer master records.
--
-- Main currently ends at 076_customer_leads_next_step.sql. This migration is
-- intentionally additive:
--   - customer_leads remains the deal table and keeps contact snapshots.
--   - quotes.deal_id / contracts.deal_id continue to point at customer_leads.
--   - no hard unique index is created on email/phone until staging data is
--     reviewed.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    company_name TEXT,
    position TEXT,
    phone TEXT,
    phone_normalized TEXT,
    email TEXT,
    email_normalized TEXT,
    zalo TEXT,
    facebook TEXT,
    telegram TEXT,
    website TEXT,
    tax_code TEXT,
    address TEXT,
    city TEXT,
    industry TEXT,
    source TEXT,
    status TEXT NOT NULL DEFAULT 'new_lead'
        CHECK (status IN ('new_lead', 'following', 'current_customer', 'not_fit')),
    owner_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customers_email_normalized
    ON public.crm_customers(email_normalized)
    WHERE email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customers_phone_normalized
    ON public.crm_customers(phone_normalized)
    WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customers_owner_status
    ON public.crm_customers(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_crm_customers_source
    ON public.crm_customers(source)
    WHERE source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customers_updated_at
    ON public.crm_customers(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_leads_customer_id
    ON public.customer_leads(customer_id);

-- Rollback/audit tables for data migration. A batch owns every decision made
-- by the migration script, including rows intentionally kept separate or sent
-- to manual review.
CREATE TABLE IF NOT EXISTS public.crm_customer_migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_key TEXT NOT NULL UNIQUE,
    mode TEXT NOT NULL CHECK (mode IN ('dry_run', 'migrate')),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'rolled_back', 'failed')),
    source_table TEXT NOT NULL DEFAULT 'customer_leads',
    report JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_customer_migration_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.crm_customer_migration_batches(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.customer_leads(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
    match_type TEXT NOT NULL CHECK (match_type IN ('email', 'phone', 'single', 'review', 'empty_contact')),
    action TEXT NOT NULL CHECK (action IN ('created_customer', 'linked_existing', 'review_required', 'kept_separate')),
    match_key TEXT,
    review_reason TEXT,
    source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (batch_id, deal_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_customer_migration_map_batch
    ON public.crm_customer_migration_map(batch_id);

CREATE INDEX IF NOT EXISTS idx_crm_customer_migration_map_customer
    ON public.crm_customer_migration_map(customer_id)
    WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_customer_migration_map_action
    ON public.crm_customer_migration_map(batch_id, action);

-- Idempotency for business endpoints such as "create customer + create deal".
-- This is not a customer uniqueness rule; it only prevents double-submit.
CREATE TABLE IF NOT EXISTS public.crm_request_idempotency (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key TEXT NOT NULL UNIQUE,
    actor_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    request_hash TEXT,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_request_idempotency_actor
    ON public.crm_request_idempotency(actor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.crm_customers_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_customers_updated_at ON public.crm_customers;
CREATE TRIGGER trg_crm_customers_updated_at
BEFORE UPDATE ON public.crm_customers
FOR EACH ROW
EXECUTE FUNCTION public.crm_customers_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_customer_migration_batches_updated_at ON public.crm_customer_migration_batches;
CREATE TRIGGER trg_crm_customer_migration_batches_updated_at
BEFORE UPDATE ON public.crm_customer_migration_batches
FOR EACH ROW
EXECUTE FUNCTION public.crm_customers_touch_updated_at();

DROP TRIGGER IF EXISTS trg_crm_request_idempotency_updated_at ON public.crm_request_idempotency;
CREATE TRIGGER trg_crm_request_idempotency_updated_at
BEFORE UPDATE ON public.crm_request_idempotency
FOR EACH ROW
EXECUTE FUNCTION public.crm_customers_touch_updated_at();

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_migration_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_request_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to crm_customers" ON public.crm_customers;
CREATE POLICY "Allow authenticated full access to crm_customers"
ON public.crm_customers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to crm_customer_migration_batches" ON public.crm_customer_migration_batches;
CREATE POLICY "Allow authenticated full access to crm_customer_migration_batches"
ON public.crm_customer_migration_batches
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to crm_customer_migration_map" ON public.crm_customer_migration_map;
CREATE POLICY "Allow authenticated full access to crm_customer_migration_map"
ON public.crm_customer_migration_map
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated full access to crm_request_idempotency" ON public.crm_request_idempotency;
CREATE POLICY "Allow authenticated full access to crm_request_idempotency"
ON public.crm_request_idempotency
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.crm_create_customer_with_deal(
    p_customer JSONB,
    p_deal JSONB,
    p_actor_id UUID,
    p_idempotency_key TEXT DEFAULT NULL,
    p_update_customer BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_deal public.customer_leads;
    v_customer public.crm_customers;
    v_email TEXT;
    v_phone TEXT;
    v_response JSONB;
    v_existing_response JSONB;
    v_inserted_key UUID;
BEGIN
    IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
        INSERT INTO public.crm_request_idempotency (idempotency_key, actor_id, request_hash)
        VALUES (p_idempotency_key, p_actor_id, md5(COALESCE(p_customer::text, '') || '|' || COALESCE(p_deal::text, '')))
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_inserted_key;

        IF v_inserted_key IS NULL THEN
            SELECT response INTO v_existing_response
            FROM public.crm_request_idempotency
            WHERE idempotency_key = p_idempotency_key;

            IF v_existing_response IS NOT NULL THEN
                RETURN v_existing_response;
            END IF;

            RAISE EXCEPTION 'crm_request_in_progress';
        END IF;
    END IF;

    v_customer_id := NULLIF(p_deal->>'customer_id', '')::uuid;
    v_email := NULLIF(btrim(COALESCE(p_customer->>'email_normalized', '')), '');
    v_phone := NULLIF(btrim(COALESCE(p_customer->>'phone_normalized', '')), '');

    IF v_customer_id IS NULL AND (v_email IS NOT NULL OR v_phone IS NOT NULL) THEN
        PERFORM pg_advisory_xact_lock(
            hashtextextended('crm_customer|' || COALESCE(v_email, '') || '|' || COALESCE(v_phone, ''), 0)
        );

        SELECT id INTO v_customer_id
        FROM public.crm_customers
        WHERE (v_email IS NOT NULL AND email_normalized = v_email)
           OR (v_phone IS NOT NULL AND phone_normalized = v_phone)
        ORDER BY updated_at DESC
        LIMIT 1;
    END IF;

    IF v_customer_id IS NULL THEN
        INSERT INTO public.crm_customers (
            customer_name, company_name, position, phone, phone_normalized,
            email, email_normalized, zalo, facebook, telegram, website,
            tax_code, address, city, industry, source, status, owner_id,
            created_by, note
        ) VALUES (
            COALESCE(NULLIF(p_customer->>'customer_name', ''), 'Khach hang chua ten'),
            NULLIF(p_customer->>'company_name', ''),
            NULLIF(p_customer->>'position', ''),
            NULLIF(p_customer->>'phone', ''),
            v_phone,
            NULLIF(p_customer->>'email', ''),
            v_email,
            NULLIF(p_customer->>'zalo', ''),
            NULLIF(p_customer->>'facebook', ''),
            NULLIF(p_customer->>'telegram', ''),
            NULLIF(p_customer->>'website', ''),
            NULLIF(p_customer->>'tax_code', ''),
            NULLIF(p_customer->>'address', ''),
            NULLIF(p_customer->>'city', ''),
            NULLIF(p_customer->>'industry', ''),
            NULLIF(p_customer->>'source', ''),
            COALESCE(NULLIF(p_customer->>'status', ''), 'new_lead'),
            COALESCE(NULLIF(p_customer->>'owner_id', '')::uuid, p_actor_id),
            COALESCE(NULLIF(p_customer->>'created_by', '')::uuid, p_actor_id),
            NULLIF(p_customer->>'note', '')
        )
        RETURNING * INTO v_customer;
        v_customer_id := v_customer.id;
    ELSE
        SELECT * INTO v_customer FROM public.crm_customers WHERE id = v_customer_id FOR UPDATE;

        IF p_update_customer THEN
            UPDATE public.crm_customers
            SET
                customer_name = COALESCE(NULLIF(p_customer->>'customer_name', ''), customer_name),
                company_name = COALESCE(NULLIF(p_customer->>'company_name', ''), company_name),
                position = COALESCE(NULLIF(p_customer->>'position', ''), position),
                phone = COALESCE(NULLIF(p_customer->>'phone', ''), phone),
                phone_normalized = COALESCE(v_phone, phone_normalized),
                email = COALESCE(NULLIF(p_customer->>'email', ''), email),
                email_normalized = COALESCE(v_email, email_normalized),
                zalo = COALESCE(NULLIF(p_customer->>'zalo', ''), zalo),
                facebook = COALESCE(NULLIF(p_customer->>'facebook', ''), facebook),
                telegram = COALESCE(NULLIF(p_customer->>'telegram', ''), telegram),
                website = COALESCE(NULLIF(p_customer->>'website', ''), website),
                tax_code = COALESCE(NULLIF(p_customer->>'tax_code', ''), tax_code),
                address = COALESCE(NULLIF(p_customer->>'address', ''), address),
                city = COALESCE(NULLIF(p_customer->>'city', ''), city),
                industry = COALESCE(NULLIF(p_customer->>'industry', ''), industry),
                source = COALESCE(NULLIF(p_customer->>'source', ''), source),
                status = COALESCE(NULLIF(p_customer->>'status', ''), status),
                owner_id = COALESCE(NULLIF(p_customer->>'owner_id', '')::uuid, owner_id),
                note = COALESCE(NULLIF(p_customer->>'note', ''), note)
            WHERE id = v_customer_id
            RETURNING * INTO v_customer;
        END IF;
    END IF;

    INSERT INTO public.customer_leads (
        customer_id, customer_name, company_name, phone, email, address, city,
        website, industry, tax_code, source_platform, status, activity_status,
        deal_stage, follow_up_date, decision_maker, estimated_budget,
        service_package, crm_package, position, zalo, facebook, telegram,
        billing_type, contract_status, payment_status, note, next_step,
        pause_reason, leaded_by, sdr_id, team_id, has_budget, stage_entered_at
    ) VALUES (
        v_customer_id,
        COALESCE(NULLIF(p_deal->>'customer_name', ''), NULLIF(p_customer->>'customer_name', ''), 'Khach hang chua ten'),
        NULLIF(p_deal->>'company_name', ''),
        NULLIF(p_deal->>'phone', ''),
        NULLIF(p_deal->>'email', ''),
        NULLIF(p_deal->>'address', ''),
        NULLIF(p_deal->>'city', ''),
        NULLIF(p_deal->>'website', ''),
        NULLIF(p_deal->>'industry', ''),
        NULLIF(p_deal->>'tax_code', ''),
        COALESCE(NULLIF(p_deal->>'source_platform', ''), 'Manual'),
        COALESCE(NULLIF(p_deal->>'status', ''), 'pending'),
        COALESCE(NULLIF(p_deal->>'activity_status', ''), 'active'),
        COALESCE(NULLIF(p_deal->>'deal_stage', ''), 'new_lead'),
        NULLIF(p_deal->>'follow_up_date', '')::timestamptz,
        NULLIF(p_deal->>'decision_maker', ''),
        COALESCE(NULLIF(p_deal->>'estimated_budget', '')::numeric, 0),
        NULLIF(p_deal->>'service_package', ''),
        NULLIF(p_deal->>'crm_package', ''),
        NULLIF(p_deal->>'position', ''),
        NULLIF(p_deal->>'zalo', ''),
        NULLIF(p_deal->>'facebook', ''),
        NULLIF(p_deal->>'telegram', ''),
        COALESCE(NULLIF(p_deal->>'billing_type', ''), 'one_time'),
        COALESCE(NULLIF(p_deal->>'contract_status', ''), 'active'),
        COALESCE(NULLIF(p_deal->>'payment_status', ''), 'unpaid'),
        NULLIF(p_deal->>'note', ''),
        NULLIF(p_deal->>'next_step', ''),
        NULLIF(p_deal->>'pause_reason', ''),
        COALESCE(NULLIF(p_deal->>'leaded_by', '')::uuid, p_actor_id),
        NULLIF(p_deal->>'sdr_id', '')::uuid,
        NULLIF(p_deal->>'team_id', '')::uuid,
        COALESCE(NULLIF(p_deal->>'has_budget', '')::boolean, false),
        now()
    )
    RETURNING * INTO v_deal;

    INSERT INTO public.customer_lead_activity_log (
        customer_id, action, to_stage, actor_id, note
    ) VALUES (
        v_deal.id, 'created', v_deal.deal_stage, p_actor_id, v_deal.note
    );

    SELECT * INTO v_customer FROM public.crm_customers WHERE id = v_customer_id;

    v_response := jsonb_build_object(
        'customer', to_jsonb(v_customer),
        'deal', to_jsonb(v_deal),
        'partial', false
    );

    IF p_idempotency_key IS NOT NULL AND btrim(p_idempotency_key) <> '' THEN
        UPDATE public.crm_request_idempotency
        SET response = v_response
        WHERE idempotency_key = p_idempotency_key;
    END IF;

    RETURN v_response;
END;
$$;

COMMENT ON TABLE public.crm_customers IS
    'Master customer profile. customer_leads remains deal-centric and stores snapshots.';
COMMENT ON COLUMN public.customer_leads.customer_id IS
    'FK to crm_customers master profile. Existing contact fields on customer_leads are immutable deal snapshots unless explicitly updated.';
COMMENT ON COLUMN public.crm_customers.email_normalized IS
    'Lowercase trimmed email generated by backend/migration. Empty email is stored as NULL.';
COMMENT ON COLUMN public.crm_customers.phone_normalized IS
    'Vietnam phone normalized by backend/migration to E.164 when valid. Empty or invalid phone is stored as NULL.';
COMMENT ON INDEX public.idx_crm_customers_email_normalized IS
    'Non-unique by design. Decide partial unique strategy only after staging duplicate review.';
COMMENT ON INDEX public.idx_crm_customers_phone_normalized IS
    'Non-unique by design. Decide partial unique strategy only after staging duplicate review.';
