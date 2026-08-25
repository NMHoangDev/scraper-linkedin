-- Nhiều tài khoản Zalo trong công ty đều do NHIỀU người cùng quản lý (không phải
-- 1 người sở hữu riêng) — theo yêu cầu, mọi tài khoản Zalo THÊM MỚI từ giờ nên tự
-- động "dùng chung toàn công ty" (is_shared_with_all=true) mà không cần admin vào
-- tick tay từng cái như trước (migration 066 tạo cột với default false).
--
-- Chỉ đổi DEFAULT của cột — không UPDATE các row đã có sẵn, để không âm thầm mở
-- quyền truy cập cho các tài khoản Zalo private hiện tại (nếu có) mà chưa được
-- admin xác nhận muốn chia sẻ.
ALTER TABLE public.zalo_accounts
  ALTER COLUMN is_shared_with_all SET DEFAULT true;

COMMENT ON COLUMN public.zalo_accounts.is_shared_with_all IS
  'true = mọi nhân viên đều xem/gửi được tài khoản Zalo này (bỏ qua kiểm tra owner/leader/share theo hội thoại). Default true từ 068 vì hầu hết tài khoản Zalo mới đều do nhiều người cùng quản lý; account cũ giữ nguyên giá trị đã có.';
