-- ============================================================
-- Migration 050: Gan nhan Team len moi deal (customer_leads.team_id).
--
-- Boi canh: Pipeline can hien tag Team tren moi deal + dropdown loc theo
-- Team lay tu database. team_id do NGUOI TAO/SUA DEAL CHON TAY trong form
-- (khong tu suy ra tu nguoi phu trach) - nen la FK don gian toi teams(id),
-- khong can cot "name hint" nhu pattern 045/046 vi team_id luon tro toi 1
-- teams row co that (khong co tinh huong "team chua ton tai").
-- ============================================================

ALTER TABLE customer_leads
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_leads_team_id ON customer_leads(team_id);

COMMENT ON COLUMN customer_leads.team_id IS
    'Migration 050: Team duoc gan cho deal nay (chon tay trong form deal) - dung de hien tag team tren Pipeline va loc theo team.';
