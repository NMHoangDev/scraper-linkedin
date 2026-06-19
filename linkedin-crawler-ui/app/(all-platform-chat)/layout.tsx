/**
 * Layout riêng cho trang Zalo chat FULL-SCREEN (member view).
 *
 * Khác với layout mặc định của (all-platform):
 *   - KHÔNG dùng AllPlatformShell (bỏ sidebar menu)
 *   - Tràn viewport, chiếm 100vh để chat rộng rãi
 *   - Có thêm top bar với nút "← Quay lại" tới trang quản lý tài khoản
 *
 * URL: /zalo-chat (route group (all-platform-chat) ẩn tên group)
 */

import { AllPlatformShell } from "@/components/all-platform/layout/AllPlatformShell";

export default function AllPlatformChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AllPlatformShell>{children}</AllPlatformShell>;
}
