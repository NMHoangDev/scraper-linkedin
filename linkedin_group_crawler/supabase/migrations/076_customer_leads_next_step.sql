-- "Next step" cho popup Them deal moi (form gon nhe, ep Sale ghi ro buoc tiep theo can
-- lam thay vi de trong) - text don gian, khong default, khong bat buoc o tang DB (validate
-- bat buoc nam o frontend luc tao moi, giong cach pause_reason dang lam).
ALTER TABLE public.customer_leads
    ADD COLUMN IF NOT EXISTS next_step TEXT;
