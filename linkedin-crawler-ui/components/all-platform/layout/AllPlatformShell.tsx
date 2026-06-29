"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { useState } from "react";
import Image from "next/image";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className="min-h-screen bg-background text-on-background flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-outline-variant bg-surface/95 px-md py-sm shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-outline-variant bg-surface">
            <Image
              src="/markeeai_logo.svg"
              alt="Marketing Agents"
              fill
              sizes="32px"
              className="object-contain p-1"
              priority
            />
          </div>
          <span className="text-h3 text-primary">Marketing Agents</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface-variant transition hover:border-primary hover:text-primary"
          aria-label="Mở menu"
        >
          <MaterialIcon name="menu" className="text-[22px]" />
        </button>
      </div>

      <AllPlatformSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main className={`min-w-0 max-w-full flex-1 w-full transition-all duration-300 flex flex-col ${
        sidebarCollapsed ? "lg:ml-[70px] lg:w-[calc(100%-70px)]" : "lg:ml-[280px] lg:w-[calc(100%-280px)]"
      } ${
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
