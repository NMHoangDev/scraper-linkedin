"use client";

import { useState } from "react";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { FacebookDashboardHomeContent } from "@/components/features/facebook/FacebookDashboardHomeContent";
import { LinkedInDashboardHomeContent } from "@/components/features/linkedin/dashboard";
import { UnifiedDashboardHomeContent } from "@/components/features/dashboard/UnifiedDashboardHomeContent";
import CombinedCrawlForm from "@/components/nguyen/modules/crawldFB/components/CombinedCrawlForm";
import { MaterialIcon } from "@/components/ui";

export function DashboardHomeContent() {
  const { platform } = useAppPlatform();
  const [isCrawlModalOpen, setIsCrawlModalOpen] = useState(false);

  // Cấu hình tiêu đề theo nền tảng
  let title = "Unified Post Feed";
  let subtitle = "";

  if (platform === "linkedin") {
    title = "LinkedIn Group Crawler";
    subtitle = "Thu thập và phân tích dữ liệu từ nhiều nhóm LinkedIn một cách hiệu quả.";
  } else if (platform === "facebook") {
    title = "Facebook Post Feed";
    subtitle = "Bài viết đã cào từ các nhóm Facebook — phiên cào, điểm và tương tác theo sheet.";
  }

  return (
    <div className="w-full space-y-lg">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md mb-xl">
        <div className="space-y-xs">
          <h1 className="text-h1 text-on-surface font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-3xl">
            {subtitle}
          </p>
        </div>
        <button
          onClick={() => setIsCrawlModalOpen(true)}
          className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-sm font-bold text-on-primary shadow-md transition-all hover:bg-primary-container active:scale-[0.98] cursor-pointer shrink-0 w-fit"
        >
          <MaterialIcon name="file_download" className="text-[18px]" />
          Cào dữ liệu
        </button>
      </div>

      {/* RENDER CONTENT */}
      {platform === "linkedin" && <LinkedInDashboardHomeContent hideHeader={true} />}
      {platform === "facebook" && <FacebookDashboardHomeContent hideHeader={true} />}
      {platform === "general" && <UnifiedDashboardHomeContent hideHeader={true} />}

      {/* CRAWL MODAL */}
      {isCrawlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          {/* Backdrop click close */}
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-default outline-none bg-transparent"
            onClick={() => setIsCrawlModalOpen(false)}
          />
          
          <div className="relative border-outline-variant bg-surface w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border p-lg shadow-xl animate-scaleUp z-10">
            {/* Close button */}
            <button
              onClick={() => setIsCrawlModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-surface-container-high rounded-full transition-colors cursor-pointer text-on-surface-variant hover:text-on-surface"
              aria-label="Đóng"
            >
              <MaterialIcon name="close" className="text-[20px]" />
            </button>
            <div className="mt-md pr-1">
              <CombinedCrawlForm onSuccess={() => {
                setIsCrawlModalOpen(false);
                window.location.reload();
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
