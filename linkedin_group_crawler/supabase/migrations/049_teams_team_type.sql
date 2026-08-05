-- ============================================================
-- Migration 049: Them "Loai team" (team_type) cho bang teams.
--
-- Boi canh: can 1 nhom quyen moi "Sale" duoc nang len ngang Leader cho
-- rieng Pipeline + Phan tich CRM, dua tren LOAI team (khong dua theo TEN
-- team - ten team hien tai la text tu do, khong dang tin cay de phan
-- quyen). team_type la nguon that duy nhat cho viec nay.
--
-- 9 gia tri co dinh theo yeu cau nghiep vu: Dev, Marketing, Sale,
-- Presales, Technical, Back Office, Intern, Freelancer, Khac.
-- ============================================================

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS team_type TEXT NOT NULL DEFAULT 'khac';

ALTER TABLE teams
    DROP CONSTRAINT IF EXISTS teams_team_type_check,
    ADD CONSTRAINT teams_team_type_check CHECK (
        team_type IN (
            'dev', 'marketing', 'sale', 'presales', 'technical',
            'back_office', 'intern', 'freelancer', 'khac'
        )
    );

CREATE INDEX IF NOT EXISTS idx_teams_team_type ON teams(team_type);

COMMENT ON COLUMN teams.team_type IS
    'Migration 049: loai team (dev/marketing/sale/presales/technical/back_office/intern/freelancer/khac). Dung de phan quyen theo LOAI, khong theo TEN team - vd team_type=sale duoc xem full Pipeline + Phan tich CRM ngang Leader.';
