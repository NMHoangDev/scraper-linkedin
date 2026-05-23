"use client";

import { useState } from "react";
import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { MaterialIcon } from "@/components/ui";
import type { MaterialSymbolName } from "@/components/ui";
import { DashboardPosts } from "@/components/nguyen/modules/crawldFB/components/dashboardPost";
import { CrawlResultsSection } from "@/components/features/linkedin/dashboard/LinkedIn-CrawlResultsSection";
import { sessionLatestDateLabel } from "@/components/features/linkedin/dashboard/LinkedIn-n8n-sheet-helpers";
import {
  PlatformStatCard,
  PlatformStatsRow,
} from "@/components/features/shared/PlatformStatCard";
import { useDashboard } from "@/components/features/dashboard/dashboard-context";
import { cn } from "@/lib/utils";
import { useGroupIntentMap } from "@/hooks/useGroupIntentMap";

// ─── Types ───────────────────────────────────────────────────────────────────
type FeedPlatform = "facebook" | "linkedin";

interface PlatformConfig {
  label: string;
  icon: React.ReactNode;
  description: string;
  accentClass: string;
  badgeClass: string;
  viewModeLabel: string;
  viewModeIcon: MaterialSymbolName;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<FeedPlatform, PlatformConfig> = {
  facebook: {
    label: "Facebook",
    icon: <FaFacebook className="text-[15px] text-blue-600" />,
    description:
      "Xem bài viết đã crawl từ các nhóm Facebook — hiển thị theo từng post với AI score.",
    accentClass: "border-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    viewModeLabel: "Card từng bài viết · Lọc theo intent, platform, score",
    viewModeIcon: "article",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <FaLinkedin className="text-[15px] text-blue-700" />,
    description:
      "Xem kết quả crawl LinkedIn — nhóm theo phiên cào, click phiên để xem chi tiết bài.",
    accentClass: "border-blue-700",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    viewModeLabel: "Bảng phiên cào · Click phiên để xem danh sách bài trong modal",
    viewModeIcon: "dataset",
  },
};

// ─── Sub-component: Stats row cho LinkedIn ──────────────────────────────────
/**
 * Hiển thị 4 stat cards cho LinkedIn — đồng bộ layout với DashboardPosts (Facebook).
 * Dùng `crawlSessionsForTable` từ dashboard context, không fetch thêm API.
 */
function LinkedInStatsRow() {
  const d = useDashboard();

  const sessions = d.crawlSessionsForTable ?? [];
  const isFiltered = d.crawlTableViewMode === "filtered";

  // Tổng phiên & bài từ context (đã tính sẵn, kể cả chế độ filtered)
  const totalSessions = d.displayedCrawlSessionCount;
  const totalPosts = d.displayedCrawlPostCount;

  // Tính phiên hôm nay dựa trên sessionLatestDateLabel
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todaySessions = sessions.filter(
    (s) => sessionLatestDateLabel(s).slice(0, 10) === todayStr,
  );
  const todayPosts = todaySessions.reduce((sum, s) => sum + (s.posts_count ?? 0), 0);

  // Tổng bài / phiên overall (từ allPostsResult, không bị ảnh hưởng filter)
  const overallSessionCount = d.allPostsResult?.length ?? 0;

  return (
    <PlatformStatsRow>
      <PlatformStatCard
        label="Tổng phiên cào"
        value={totalSessions}
        hint={isFiltered ? "Trong khoảng lọc" : `${overallSessionCount} phiên tất cả`}
        accent="primary"
      />
      <PlatformStatCard
        label="Tổng bài đã crawl"
        value={totalPosts}
        hint={isFiltered ? "Trong khoảng lọc" : "Gộp từ tất cả phiên"}
        hintTone={totalPosts > 0 ? "up" : "neutral"}
        accent="success"
      />
      <PlatformStatCard
        label="Phiên hôm nay"
        value={todaySessions.length}
        hint={
          todayPosts > 0
            ? `${todayPosts.toLocaleString("vi-VN")} bài trong ngày`
            : "Chưa có phiên hôm nay"
        }
        hintTone={todaySessions.length > 0 ? "up" : "neutral"}
        accent="warning"
      />
      <PlatformStatCard
        label="Trạng thái xem"
        value={isFiltered ? "Đã lọc" : "Tất cả"}
        hint={
          d.crawlSessionsTableBusy
            ? "Đang tải dữ liệu…"
            : isFiltered
              ? d.filterAppliedLabel || "Điều kiện lọc đang áp dụng"
              : "Nhấn phiên để xem bài chi tiết"
        }
        accent="primary"
      />
    </PlatformStatsRow>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
/**
 * Nền tảng «Chung» — platform switcher nội bộ:
 * - Facebook → per-post card feed (DashboardPosts)
 * - LinkedIn → stats row + session table (CrawlResultsSection)
 *
 * Switcher này độc lập với sidebar DashboardPlatformSwitcher,
 * không thay đổi AppPlatform context toàn cục.
 */
export function UnifiedDashboardHomeContent({ hideHeader }: { hideHeader?: boolean }) {
  const [feedPlatform, setFeedPlatform] = useState<FeedPlatform>("facebook");
  const d = useDashboard();
  const { isLoading: isIntentLoading } = useGroupIntentMap(d.email);
  const isDataLoading = isIntentLoading || d.crawlSessionsForTable === null;

  const cfg = PLATFORM_CONFIG[feedPlatform];

  return (
    <>
      {/* ── HEADER ──────────────────────────────────────────── */}
      {!hideHeader && (
        <div className="mb-xl">
          <h1 className="text-h1 text-on-surface mb-xs font-semibold">Post Feed</h1>
          
        </div>
      )}

      {/* ── PLATFORM SWITCHER CARD ──────────────────────────── */}
      <div
        className={cn(
          "border-outline-variant bg-surface mb-xl flex flex-col gap-sm rounded-xl border border-l-4 p-md shadow-sm transition-all duration-300",
          cfg.accentClass,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-sm">
          {/* Platform icon + description */}
          <div className="flex items-center gap-sm">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                cfg.badgeClass,
              )}
            >
              {cfg.icon}
            </div>
            <div>
              <p className="text-on-surface text-sm font-bold leading-tight">
                Đang xem: {cfg.label}
              </p>
              <p className="text-on-surface-variant text-[11px] leading-snug">
                {cfg.description}
              </p>
            </div>
          </div>

          {/* Toggle pill buttons */}
          <div
            className="border-outline-variant bg-surface-container-low flex rounded-lg border p-0.5"
            role="group"
            aria-label="Chọn nền tảng hiển thị"
          >
            {(Object.keys(PLATFORM_CONFIG) as FeedPlatform[]).map((p) => {
              const c = PLATFORM_CONFIG[p];
              const isActive = feedPlatform === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFeedPlatform(p)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-md py-sm font-sans text-[11px] font-bold tracking-wide uppercase transition-all",
                    isActive
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high/80",
                  )}
                  aria-pressed={isActive}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View mode indicator */}
        <div className="border-outline-variant flex items-center gap-xs border-t pt-sm">
          <MaterialIcon
            name={cfg.viewModeIcon}
            className="text-on-surface-variant text-[15px]"
          />
          <span className="text-on-surface-variant text-[11px] font-medium">
            Hiển thị: {cfg.viewModeLabel}
          </span>
        </div>
      </div>

      {/* ── CONTENT AREA ─────────────────────────────────────── */}
      {feedPlatform === "facebook" ? (
        <DashboardPosts forcedPlatform="facebook" />
      ) : isDataLoading ? (
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-lg shadow-sm">
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-on-surface-variant text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats row — đồng bộ style với Facebook DashboardPosts */}
          <LinkedInStatsRow />
          {/* Session table (filter controls + bảng phiên + modal chi tiết) */}
          <CrawlResultsSection />
        </>
      )}
    </>
  );
}
