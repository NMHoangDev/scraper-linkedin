-- ============================================================
-- Migration 045: Them cot "name hint" (chi de hien thi) cho
-- assignee_id/co_assignee_id/id_member trong facebook_groups va
-- linkedin_groups.
--
-- Boi canh: dropdown chon nguoi phu trach/dong phu trach/thanh vien
-- so huu gio lay tu danh ba "members" (140 nguoi), nhung neu chon 1
-- nguoi CHUA lien ket tai khoan dang nhap thi khong co app_users.id
-- that de luu vao cac cot FK do (assignee_id/co_assignee_id/id_member
-- deu la FK toi app_users). Truoc day field do bi bo trong (NULL) va
-- MAT LUON ten nguoi da chon, gay nham la "quen chua gan".
--
-- Giai phap: them cot text thuan hien thi (khong FK) luu ten nguoi
-- duoc chon TAI THOI DIEM luu, du sau nay id that co hay khong. Khi
-- hien thi: uu tien resolve ten qua app_users neu co id that, khong
-- thi fallback qua cot hint nay.
-- ============================================================

ALTER TABLE facebook_groups
    ADD COLUMN IF NOT EXISTS assignee_name_hint TEXT,
    ADD COLUMN IF NOT EXISTS co_assignee_name_hint TEXT,
    ADD COLUMN IF NOT EXISTS id_member_name_hint TEXT;

ALTER TABLE linkedin_groups
    ADD COLUMN IF NOT EXISTS assignee_name_hint TEXT,
    ADD COLUMN IF NOT EXISTS co_assignee_name_hint TEXT,
    ADD COLUMN IF NOT EXISTS id_member_name_hint TEXT;

COMMENT ON COLUMN facebook_groups.assignee_name_hint IS
    'Migration 045: ten hien thi cua nguoi phu trach chinh tai thoi diem chon, dung khi assignee_id la NULL (nguoi do chua lien ket tai khoan dang nhap).';
