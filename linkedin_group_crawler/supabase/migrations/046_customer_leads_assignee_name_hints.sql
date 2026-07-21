-- ============================================================
-- Migration 046: Them cot "name hint" (chi de hien thi) cho
-- leaded_by/sdr_id trong customer_leads.
--
-- Boi canh: dropdown "Quan ly"/"Phu trach" trong form CRM gio chon tu
-- danh ba "members" (140 nguoi) thay vi chi app_users. Nguoi CHUA lien
-- ket tai khoan dang nhap khong co app_users.id that de luu vao
-- leaded_by/sdr_id (deu la FK toi app_users), nen field do phai de
-- NULL - truoc day dan toi MAT LUON ten nguoi da chon (vi leader_name/
-- sdr_name duoc resolve qua JOIN leaded_by(name)/sdr_id(name), khong
-- co id thi khong co gi de join).
--
-- Giai phap: giong migration 045 (groups) - them cot text thuan hien
-- thi luu ten nguoi duoc chon TAI THOI DIEM luu, dung lam fallback khi
-- leaded_by/sdr_id la NULL.
-- ============================================================

ALTER TABLE customer_leads
    ADD COLUMN IF NOT EXISTS leaded_by_name_hint TEXT,
    ADD COLUMN IF NOT EXISTS sdr_name_hint TEXT;

COMMENT ON COLUMN customer_leads.leaded_by_name_hint IS
    'Migration 046: ten hien thi cua nguoi Quan ly duoc chon tai thoi diem luu, dung khi leaded_by la NULL (nguoi do chua lien ket tai khoan dang nhap).';
