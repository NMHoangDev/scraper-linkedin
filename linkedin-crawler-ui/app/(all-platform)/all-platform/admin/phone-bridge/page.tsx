"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PhoneBridgeWorkspace } from "@/components/all-platform/admin/phone-bridge/PhoneBridgeWorkspace";
import { useAppAuth } from "@/contexts/AppAuthContext";

export default function AdminPhoneBridgePage() {
  const { user, isLoading } = useAppAuth();
  const router = useRouter();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/all-platform/crm/my-dashboard");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        <p>
          {isLoading
            ? "Đang kiểm tra quyền quản trị..."
            : "Đang chuyển hướng khỏi khu vực quản trị..."}
        </p>
      </div>
    );
  }

  return <PhoneBridgeWorkspace />;
}
