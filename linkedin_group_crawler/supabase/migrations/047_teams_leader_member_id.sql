-- ============================================================
-- Migration 047: Cho phep Leader cua team la BAT KY member nao trong
-- danh ba (140 nguoi), khong bat buoc phai co tai khoan dang nhap
-- (app_users) truoc.
--
-- Boi canh: teams.id_leader la FK bat buoc (NOT NULL) toi app_users(id) -
-- nghia la truoc day KHONG THE tao/sua team voi 1 Leader chua tung dang
-- nhap. Day la vi pham nguyen tac "members (danh ba nhan su) va app_users
-- (tai khoan dang nhap) la 2 nghiep vu doc lap" da ap dung cho moi dropdown
-- nhan su khac (CRM, group assignee...).
--
-- Giai phap:
--   1. Bo NOT NULL tren id_leader - cho phep NULL khi Leader duoc chon
--      chua lien ket tai khoan dang nhap.
--   2. Them cot leader_member_id (FK toi members.id) - LUON luu ID cua
--      member duoc chon lam Leader trong danh ba, bat ke da lien ket
--      tai khoan hay chua. Day la nguon THAT de biet "ai la leader",
--      id_leader chi la optional convenience (dung khi can quyen loi
--      role=leader trong app_users, vd promote-to-leader).
-- ============================================================

ALTER TABLE teams
    ALTER COLUMN id_leader DROP NOT NULL;

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS leader_member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_leader_member_id ON teams(leader_member_id);

COMMENT ON COLUMN teams.leader_member_id IS
    'Migration 047: ID cua member (danh ba 140 nguoi) duoc chon lam Leader - nguon that, khong phu thuoc app_users. id_leader (co the NULL) chi dung khi Leader do da lien ket tai khoan dang nhap.';
