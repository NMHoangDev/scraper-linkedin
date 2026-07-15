"use client";

import { useZaloCrawlerFlow } from "@/hooks/useZaloCrawlerFlow";
import { useRouter } from "next/navigation";
import { ZaloChatView } from "@/components/all-platform/zalo/dashboard/ZaloChatView";
import { useEffect } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";

/**
 * Trang chat Zalo dành cho member, tích hợp sidebar.
 */
export default function ZaloChatFullScreenPage() {
  const flow = useZaloCrawlerFlow();
  const router = useRouter();
  const { user, isLoading } = useAppAuth();

  // Chỉ member/staff mới vào được (leader đã có flow riêng)
  useEffect(() => {
    if (isLoading || !user) return;
    if (user.role === "leader") {
      // Leader dùng trang Zalo Inbox Admin (xem/chat được TOÀN BỘ tài khoản
      // trong team + nút tải extension đăng nhập Zalo), không phải trang
      // Quản lý Team (chỉ có bảng KPI, không có ô chat) — trước đây đẩy nhầm
      // về đó khiến leader bấm "Mở chat" nhưng lại thấy trang KPI team.
      router.replace("/all-platform/zalo-inbox");
    }
  }, [user, isLoading, router]);

  function handleBack() {
    router.push("/all-platform/tai-khoan");
  }

  if (isLoading || !user || user.role === "leader") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 overflow-hidden">
      <ZaloChatView flow={flow} onBackToDashboard={handleBack} />
    </div>
  );
}
