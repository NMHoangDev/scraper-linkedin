"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/contexts/AppAuthContext";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAppAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/all-platform/post-feed" : "/auth/login");
  }, [isLoading, router, user]);

  return (
    <main className="min-h-screen bg-[#F6F8FB] flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#E3000F]">
        <span className="h-6 w-6 rounded-full border-2 border-[#E3000F]/20 border-t-[#E3000F] animate-spin" />
        Đang mở MarkeeAI...
      </div>
    </main>
  );
}
