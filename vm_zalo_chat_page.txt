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
    if (user.role === "leader" || user.role === "admin") {
      // Leader thì dùng flow team-management (đã có nút "Xem Inbox")
      router.replace("/all-platform/leader/team");
    }
  }, [user, isLoading, router]);

  function handleBack() {
    router.push("/all-platform/tai-khoan");
  }

  if (isLoading || !user || user.role === "leader" || user.role === "admin") {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#E3000F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 overflow-hidden">
      <ZaloChatView flow={flow} onBackToDashboard={handleBack} />
    </div>
  );
}
