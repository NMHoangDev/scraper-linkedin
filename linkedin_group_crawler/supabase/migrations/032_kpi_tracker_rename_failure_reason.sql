-- Migration 031 tạo cột "failure_reason" trên kpi_tracker, nhưng toàn bộ code
-- backend (supabase_kpi_service.py) và frontend (AssignKpiModal.tsx,
-- BulkAssignKpiModal.tsx) đều đọc/ghi field tên "reason_not_met" -> mọi lượt
-- giao KPI (kể cả giao bình thường, không đánh dấu thất bại) đều lỗi vì cột
-- "reason_not_met" không tồn tại. Đổi tên cột cho khớp với code.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'kpi_tracker' AND column_name = 'failure_reason'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'kpi_tracker' AND column_name = 'reason_not_met'
    ) THEN
        ALTER TABLE public.kpi_tracker RENAME COLUMN failure_reason TO reason_not_met;
    END IF;
END $$;

-- Lưới an toàn: đảm bảo cột tồn tại kể cả khi migration 031 chưa từng chạy
-- ở môi trường nào đó (ví dụ tạo DB mới từ đầu).
ALTER TABLE public.kpi_tracker
ADD COLUMN IF NOT EXISTS reason_not_met TEXT;
