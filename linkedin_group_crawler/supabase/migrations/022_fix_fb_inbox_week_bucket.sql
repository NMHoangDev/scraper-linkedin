-- ============================================================
-- Migration 022: Fix v_member_daily_fb_inbox dung created_at thay vi
-- synced_at de xac dinh "tuan nao" 1 hoi thoai FB duoc tinh KPI.
--
-- Boi canh: user phan anh KPI Inbox cua 1 member (Thuong) "hoi nhieu",
-- con 1 member khac (Lanh, dang offline/can dang nhap lai) thi "khong co".
-- Doc lai 2 endpoint dang song (/kpi/fb-inbox-sync, /kpi/fb-inbox-bulk-verify
-- trong routers/kpi.py) xac nhan: ca 2 deu GHI DE synced_at = now() moi lan
-- xac nhan/xac nhan lai CUNG 1 conv_id (vd leader bam xac nhan hang loat
-- nhieu lan, hoac 1 hoi thoai duoc suggest lai va confirm lai sau). Vi
-- v_member_daily_fb_inbox (migration 012) group theo ngay cua synced_at,
-- 1 hoi thoai CU van co the "troi" vao tuan HIEN TAI moi lan duoc dong lai -
-- gay dem sai tuan (member hoat dong/duoc leader xac nhan thuong xuyen thi
-- so lieu tuan nay bi phinh len tu hoi thoai cu, member it duoc dong lai thi
-- so lieu dung im/khong len).
--
-- created_at (theo schema 006_fb_inbox_kpi.sql) duoc set 1 LAN DUY NHAT luc
-- insert va KHONG bao gio bi cap nhat lai boi bat ky code path nao dang
-- hoat dong - la moc thoi gian on dinh hon de xac dinh tuan thuc su.
-- ============================================================

CREATE OR REPLACE VIEW public.v_member_daily_fb_inbox AS
SELECT
    f.id_member,
    (f.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day_vn,
    COUNT(*) FILTER (WHERE f.is_confirmed)::int AS inbox_count,
    COUNT(*) FILTER (WHERE f.is_confirmed AND f.is_lead)::int AS lead_count
FROM public.fb_inbox_kpi f
WHERE f.id_member IS NOT NULL
  AND f.created_at IS NOT NULL
GROUP BY f.id_member, (f.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

COMMENT ON VIEW public.v_member_daily_fb_inbox IS
    'Migration 022: group theo created_at (on dinh, set 1 lan luc insert) thay vi synced_at (bi ghi de moi lan xac nhan lai), tranh hoi thoai cu troi sang tuan hien tai. FB inbox + lead count per member per VN-day (only confirmed).';
