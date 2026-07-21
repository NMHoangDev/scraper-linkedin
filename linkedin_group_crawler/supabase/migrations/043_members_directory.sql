-- ============================================================
-- Migration 043: Bang "members" - danh ba nhan su noi bo (HR roster),
-- doc lap voi app_users (bang tai khoan dang nhap).
--
-- Boi canh: app_users chi co id/email/name/role... phuc vu dang nhap,
-- khong co cac truong HR (phone, birth_date, department, skills...).
-- Trang "Quan ly thanh vien" moi + Excel import can mot bang rieng.
--
-- members la bang DOC LAP (khong dung chung id voi app_users) theo
-- quyet dinh cua user. Cot linked_user_id (nullable) la cau noi: khi
-- 1 member co tai khoan dang nhap that, linked_user_id tro toi
-- app_users.id de cac dropdown dung chung API GET /members van luu
-- dung gia tri vao cac cot FK cu dang tro toi app_users.id (vd
-- customer_leads.leaded_by/sdr_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    telegram_username TEXT,
    phone TEXT,
    birth_date DATE,
    gender TEXT,
    team TEXT,
    position TEXT,
    department TEXT,
    experience_year INTEGER DEFAULT 0,
    linked_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_linked_user ON members(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_members_team ON members(team);

COMMENT ON TABLE members IS
    'Migration 043: danh ba nhan su noi bo (HR roster), doc lap voi app_users. linked_user_id noi toi app_users.id khi nguoi nay co tai khoan dang nhap that.';

-- category: nhom hien thi dang "Cha > Con" (vd "Network Solutions > Switching & Routing")
-- de form Them/Sua thanh vien hien checkbox ky nang gom theo nhom, giong mau UI tham khao.
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category, name)
);

CREATE TABLE IF NOT EXISTS member_skills (
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, skill_id)
);
