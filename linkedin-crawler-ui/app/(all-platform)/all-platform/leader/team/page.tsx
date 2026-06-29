"use client";

import { useAppAuth } from "@/contexts/AppAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TeamManagement } from "@/components/all-platform/leader/team-management";

export default function TeamManagementPage() {
  const { user, isLoading } = useAppAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "leader") {
      setAuthorized(true);
    } else {
      // Member hoặc chưa đăng nhập → redirect
      router.replace("/all-platform/post-feed");
    }
  }, [user, isLoading, router]);

  if (authorized === null) {
    return (
      <div className="p-6 text-center text-gray-500 h-64 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#E3000F] rounded-full animate-spin mb-3" />
        <p>Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <TeamManagement />
    </div>
  );
}
