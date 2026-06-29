"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppAuth } from "@/contexts/AppAuthContext";
import { LeaderDashboardContent } from "@/components/all-platform/leader/LeaderDashboardContent";

export default function LeaderDashboardPage() {
  const { user, isLoading } = useAppAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (user?.role === "leader") {
      setAuthorized(true);
    } else {
      router.replace("/all-platform/post-feed");
    }
  }, [isLoading, router, user?.role]);

  if (authorized === null) {
    return (
      <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-on-surface-variant">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
        <p>Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <LeaderDashboardContent />
    </div>
  );
}
