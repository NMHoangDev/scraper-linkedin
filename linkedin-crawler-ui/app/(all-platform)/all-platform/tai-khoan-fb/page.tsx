"use client";

/**
 * Trang TÀI KHOẢN FACEBOOK (seeding) — trung tâm quản lý acc FB.
 * Dùng chung component FbInboxAccountsTab với tab "Tài khoản FB & KPI" trong
 * trang Quản lý tài khoản (/all-platform/quan-ly-tai-khoan) — trước đây 2 nơi
 * có 2 bản code riêng làm cùng 1 việc, gộp lại còn 1 nguồn duy nhất.
 */

import { MaterialIcon } from "@/components/ui";
import { FbInboxAccountsTab } from "@/components/all-platform/accounts/FbInboxAccountsTab";

export default function TaiKhoanFbPage() {
  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-1">
        <MaterialIcon name="account_circle" className="text-primary" />
        <h1 className="text-xl font-bold text-on-surface">Tài khoản Facebook</h1>
      </div>
      <p className="text-sm text-on-surface-variant mb-6">Mỗi tài khoản chỉ cần đăng nhập 1 lần. Tài khoản đã thêm dùng chung cho Đăng bài, Inbox và Cào dữ liệu.</p>
      <FbInboxAccountsTab />
    </div>
  );
}
