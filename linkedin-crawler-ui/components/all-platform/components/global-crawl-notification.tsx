"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { API_BASE_URL } from "@/lib/env";

export function GlobalCrawlNotification() {
  const { user } = useAppAuth();
  const [crawlStatus, setCrawlStatus] = useState<{ message: string; isError?: boolean } | null>(null);

  useEffect(() => {
    // Determine the proper WebSocket URL using API_BASE_URL
    const baseUrl = API_BASE_URL || "http://localhost:8000";
    const wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(`${wsUrl}/api/all-platform/ws/crawl-status`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Chỉ thông báo nếu current user có liên quan đến group đang cào
        // hoặc là admin (người có quyền xem mọi thứ)
        if (data.involved_users && user?.id) {
          const isIncluded = data.involved_users.includes(user.id);
          const isAdmin = user?.role === "admin";
          if (!isIncluded && !isAdmin) {
            return; // Bỏ qua nếu không liên quan
          }
        }

        if (data.event === "crawl_started") {
          setCrawlStatus({ message: data.message });
        } else if (data.event === "crawl_success") {
          setCrawlStatus({ message: data.message });
          setTimeout(() => setCrawlStatus(null), 5000); // Hide after 5 seconds
        } else if (data.event === "crawl_error") {
          setCrawlStatus({ message: data.message, isError: true });
          setTimeout(() => setCrawlStatus(null), 5000);
        }
      } catch (e) {
        console.error("WebSocket message parse error", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [user]);

  if (!crawlStatus) return null;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div
        className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium border ${
          crawlStatus.isError
            ? "bg-red-50 text-red-700 border-red-200"
            : "bg-blue-50 text-blue-700 border-blue-200"
        }`}
      >
        {crawlStatus.isError ? (
          <MaterialIcon name="error_outline" className="text-xl" />
        ) : (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {crawlStatus.message}
      </div>
    </div>
  );
}
