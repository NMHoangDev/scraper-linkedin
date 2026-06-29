"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { useState } from "react";
import { FaBars } from "react-icons/fa";
import { AppPlatformProvider, useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { AllPlatformSidebar } from "./AllPlatformSidebar";
import { MaterialIcon } from "@/components/ui";
import { GlobalCrawlNotification } from "../components/global-crawl-notification";

/**
 * AllPlatformShell — Layout shell dành riêng cho module All-Platform.
 * 
 * - Tự động redirect về /auth/login nếu chưa đăng nhập.
 * - Không phụ thuộc vào DashboardProvider, useDashboardCrawler, hay
 *   bất kỳ context cũ nào của Facebook/LinkedIn.
 * - Role check lấy trực tiếp từ Supabase thông qua useAppAuth().
 * - Bọc AppPlatformProvider và tự động set platform = "general".
 */
function AllPlatformShellInner({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAppAuth();
  const { platform, setPlatform } = useAppPlatform();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Force platform to "general" for all-platform routes
  useEffect(() => {
    if (platform !== "general") {
      setPlatform("general");
    }
  }, [platform, setPlatform]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="border-primary h-10 w-10 rounded-full border-4 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not authenticated — will redirect, render nothing
  if (!isAuthenticated) return null;

  const isChatPage = pathname === "/zalo-chat" || pathname.startsWith("/zalo-chat");

  return (
    <div className="min-h-screen bg-white text-on-background flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="https://markeeai.com/logo.svg" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-black text-slate-900 text-lg">MarkeeAi</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(true)} 
          className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <FaBars size={20} />
        </button>
      </div>

      <AllPlatformSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className={`min-w-0 max-w-full flex-1 w-full transition-all flex flex-col lg:ml-64 lg:w-[calc(100%-16rem)] ${
        isChatPage ? "h-screen p-0 overflow-hidden" : "overflow-x-hidden p-3 sm:p-5 lg:p-8"
      }`}>
        <GlobalCrawlNotification />
        {children}
      </main>
    </div>
  );
}

export function AllPlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <AppPlatformProvider>
      <AllPlatformShellInner>{children}</AllPlatformShellInner>
    </AppPlatformProvider>
  );
}
