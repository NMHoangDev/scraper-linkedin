-- Cho phep nhap tay ten khach hang khi tao/soan hop dong khong gan CRM deal
-- (yeu cau: "hop dong thi ko lien quan crm lam" - van muon co ten khach hang
-- de hien thi trong danh sach/chi tiet khi khong chon deal).
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS manual_customer_name TEXT;
