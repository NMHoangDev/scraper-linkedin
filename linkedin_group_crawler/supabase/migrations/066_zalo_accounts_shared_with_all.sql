-- Cho phép đánh dấu 1 tài khoản Zalo là "dùng chung toàn công ty": mọi nhân viên
-- (mọi role, không cần là owner/leader/được share riêng từng hội thoại) đều xem
-- được danh sách hội thoại + tin nhắn + gửi tin qua tài khoản này.
--
-- Dùng cho việc gộp nhiều tài khoản Zalo (mỗi nhân viên 1 số) về lại 1 tài khoản
-- công ty chung (vd MarkeeAI) mà không phải tạo lại toàn bộ RBAC hiện có
-- (owner_id / id_member / leader-team / zalo_conversation_permissions).
ALTER TABLE public.zalo_accounts
  ADD COLUMN IF NOT EXISTS is_shared_with_all boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.zalo_accounts.is_shared_with_all IS
  'true = mọi nhân viên đều xem/gửi được tài khoản Zalo này (bỏ qua kiểm tra owner/leader/share theo hội thoại).';
