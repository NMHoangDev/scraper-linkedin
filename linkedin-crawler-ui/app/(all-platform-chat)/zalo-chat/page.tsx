"use client";

import { useZaloCrawlerFlow } from "@/hooks/useZaloCrawlerFlow";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/ui";
import { ZaloChatView } from "@/components/all-platform/zalo/dashboard/ZaloChatView";
import { useEffect, useState } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";

/**
 * Trang chat Zalo FULL-SCREEN dành cho member.
 *
 * Khác với /zalo-crawl (trang trong AllPlatformShell có sidebar):
 *   - Full viewport (h-screen, không padding)
 *   - Không có menu sidebar
 *   - Có top bar với nút "← Quay lại" → /all-platform/tai-khoan
 *   - Kích thước UI phóng to (text-base thay vì text-xs, etc.)
 */
export default function ZaloChatFullScreenPage() {
  const flow = useZaloCrawlerFlow();
  const router = useRouter();
  const { user } = useAppAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Chỉ member/staff mới vào được (leader đã có flow riêng)
  useEffect(() => {
    if (!user) return;
    if (user.role === "leader" || user.role === "admin") {
      // Leader thì dùng flow team-management (đã có nút "Xem Inbox")
      router.replace("/all-platform/leader/team");
      return;
    }
    setAuthorized(true);
  }, [user, router]);

  function handleBack() {
    router.push("/all-platform/tai-khoan");
  }

  if (authorized === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#E3000F] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Top bar với nút quay lại */}
      <header className="h-14 px-4 flex items-center gap-3 border-b border-slate-200 bg-white shadow-sm shrink-0">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Quay lại trang quản lý tài khoản"
        >
          <MaterialIcon name="arrow_back" className="text-[20px]" />
          <span className="text-sm font-semibold">Quay lại</span>
        </button>
        <div className="h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <MaterialIcon name="chat" className="text-[#E3000F] text-[22px]" />
          <h1 className="text-base font-bold text-slate-800">Zalo Chat</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            Full Screen
          </span>
        </div>
        <div className="flex-1" />
        {flow.userId && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold">Đang chat với tài khoản:</span>
            <span className="font-bold text-slate-800 font-mono">{flow.userId}</span>
          </div>
        )}
      </header>

      {/* Full-screen chat view */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <ZaloChatView flow={flow} onBackToDashboard={handleBack} fullScreen />
      </main>
    </div>
  );
}
