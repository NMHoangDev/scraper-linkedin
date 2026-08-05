-- ============================================================
-- Migration 044: Cho phep 1 member lien ket TOI DA 2 tai khoan
-- dang nhap (linked_user_id + linked_user_id_2).
--
-- Boi canh: trong qua trinh doi chieu 140 nguoi (RAW_DATA) voi
-- app_users, phat hien nhieu nguoi co 2 tai khoan dang nhap khac
-- nhau (vd dang ky lai, doi email...) cung tro ve 1 member. Ban dau
-- linked_user_id la cot don (1-1), khong du cho truong hop nay.
-- Giai phap tam thoi: them 1 cot linked_user_id_2 nua (chua can
-- thiet ke bang join N-N day du vi so luong truong hop it).
-- ============================================================

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS linked_user_id_2 UUID REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_linked_user_2 ON members(linked_user_id_2);

COMMENT ON COLUMN members.linked_user_id_2 IS
    'Migration 044: tai khoan dang nhap thu 2 (tam thoi) cho truong hop 1 nguoi co 2 email dang nhap khac nhau cung anh xa ve 1 member.';
