"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { AppPlatformProvider, useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { AllPlatformSidebar } from "./AllPlatformSidebar";
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

  return (
    <div className="min-h-screen bg-background text-on-background">
      <AllPlatformSidebar />
      <main className="p-lg lg:ml-64">
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
