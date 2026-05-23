"use client";

import { useState, useEffect } from "react";
import { MaterialIcon } from "@/components/ui";

import {
  statusBadgeClasses,
  statusLabel,
} from "@/components/features/dashboard/dashboard-helpers";
import { useDashboard } from "@/components/features/dashboard/dashboard-context";
import { CrawlSessionsTableCore } from "@/components/features/linkedin/dashboard/LinkedIn-CrawlSessionsTableCore";
import { useGroupIntentMap } from "@/hooks/useGroupIntentMap";

export function CrawlResultsSection() {
  const d = useDashboard();
  const [filterMode, setFilterMode] = useState<string>("all");
  const { linkedinIntents, isLoading: isIntentLoading } = useGroupIntentMap(d.email);

  const isFiltered = d.crawlTableViewMode === "filtered";
  const isDataLoading = isIntentLoading || d.crawlSessionsForTable === null;

  useEffect(() => {
    if (!isFiltered) {
      setFilterMode("all");
    }
  }, [isFiltered]);

  const busyHint = isFiltered
    ? "Đang lọc dữ liệu (/filter-data)…"
    : "Đang tải dữ liệu phiên (/get-all-posts)…";

  const emptyAll =
    "Chưa có phiên cào từ n8n. Thử «Làm mới» để gọi lại /get-all-posts.";
  const emptyFiltered =
    "Không có phiên nào khớp điều kiện filter. Bấm «Xóa lọc» để quay lại danh sách đầy đủ.";

  if (isDataLoading) {
    return (
      <section className="border-outline-variant bg-surface-container-lowest rounded-xl border p-lg shadow-sm">
        <div className="mb-md">
          <h2 className="text-h2 text-on-surface font-semibold">Kết quả Crawl</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-on-surface-variant text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-outline-variant bg-surface-container-lowest rounded-xl border p-lg shadow-sm">
      <div className="mb-md">
        <h2 className="text-h2 text-on-surface font-semibold">Kết quả Crawl</h2>
      </div>

      <div className="border-outline-variant bg-surface-container-low/50 mb-md flex flex-col gap-md rounded-lg border px-md py-md">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <div className="flex flex-wrap items-center gap-x-md gap-y-sm">
            <span
              className={`rounded-full px-md py-1 text-xs font-bold uppercase tracking-wide ${
                isFiltered
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {isFiltered ? "Đang xem: đã lọc" : "Đang xem: tất cả phiên"}
            </span>
            <span className="text-body-md text-on-surface font-semibold tabular-nums">
              {d.crawlSessionsTableBusy
                ? "…"
                : `${d.displayedCrawlSessionCount.toLocaleString("vi-VN")} phiên · ${d.displayedCrawlPostCount.toLocaleString("vi-VN")} bài`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            {isFiltered ? (
              <>
                <button
                  type="button"
                  className="border-primary text-primary hover:bg-primary/5 rounded-lg border bg-transparent px-md py-sm text-xs font-bold uppercase tracking-wide"
                  onClick={d.showAllCrawlSessions}
                  disabled={d.isGettingAllPosts}
                >
                  Xem tất cả phiên
                </button>
                <button
                  type="button"
                  className="border-outline-variant bg-surface text-on-surface hover:bg-surface-container-high flex items-center gap-2 rounded-lg border px-md py-sm text-xs font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={d.handleClearCrawlFilter}
                  disabled={d.isGettingAllPosts}
                >
                  <MaterialIcon
                    name="filter_alt_off"
                    className="shrink-0 text-[18px]"
                  />
                  Xóa lọc
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="bg-primary text-on-primary hover:bg-primary-container flex items-center gap-2 rounded-lg px-md py-sm text-xs font-bold tracking-wider uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                d.handleGetAllPosts();
              }}
              disabled={d.isGettingAllPosts || d.isSyncingAllProgress}
              title="Lấy danh sách phiên cào mới nhất từ n8n"
            >
              <MaterialIcon name="refresh" className="shrink-0 text-[18px]" />
              Làm mới
            </button>
            <button
              type="button"
              className="border-primary text-primary hover:bg-primary/5 flex items-center gap-2 rounded-lg border bg-transparent px-md py-sm text-xs font-bold tracking-wider uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50"
              onClick={d.handleSyncAllProgress}
              disabled={d.isSyncingAllProgress || d.isGettingAllPosts}
              title="Quét lại toàn bộ bài viết để cập nhật reaction và comment thực tế từ LinkedIn"
            >
              <MaterialIcon
                name="sync"
                className={`shrink-0 text-[18px] ${d.isSyncingAllProgress ? "animate-spin" : ""}`}
              />
              {d.isSyncingAllProgress ? "Đang đồng bộ…" : "Làm mới tiến độ"}
            </button>
          </div>
        </div>

        {/* THÀNH BỘ LỌC ĐỒNG BỘ STYLE VỚI FACEBOOK */}
        <div className="border-outline-variant bg-surface flex flex-wrap items-center gap-sm rounded-xl border p-md">
          {/* Dropdown Chọn kiểu lọc ngày */}
          <select
            value={filterMode}
            onChange={(e) => {
              const val = e.target.value;
              setFilterMode(val);
              if (val === "all") {
                d.handleClearCrawlFilter();
              } else if (val === "today") {
                d.handleFilterToday();
              } else if (val === "yesterday") {
                d.handleFilterYesterday();
              } else if (val === "last_7_days") {
                d.handleFilterLast7Days();
              } else if (val === "last_30_days") {
                d.handleFilterLast30Days();
              }
            }}
            className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
          >
            <option value="all">Thời gian: Tất cả</option>
            <option value="today">Thời gian: Hôm nay</option>
            <option value="yesterday">Thời gian: Hôm qua</option>
            <option value="last_7_days">Thời gian: 7 ngày gần nhất</option>
            <option value="last_30_days">Thời gian: 30 ngày gần nhất</option>
            <option value="custom_range">Thời gian: Khoảng ngày...</option>
            <option value="single_date">Thời gian: Một ngày...</option>
          </select>

          {/* Hiện input khoảng ngày nếu chọn custom_range */}
          {filterMode === "custom_range" && (
            <div className="flex flex-wrap items-center gap-xs">
              <input
                type="date"
                className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
                value={d.filterDateFrom}
                onChange={(e) => d.setFilterDateFrom(e.target.value)}
                placeholder="Từ ngày"
                disabled={d.isFiltering || d.isGettingAllPosts}
              />
              <span className="text-xs text-on-surface-variant">→</span>
              <input
                type="date"
                className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
                value={d.filterDateTo}
                onChange={(e) => d.setFilterDateTo(e.target.value)}
                placeholder="Đến ngày"
                disabled={d.isFiltering || d.isGettingAllPosts}
              />
              <button
                type="button"
                onClick={d.handleFilterDateRange}
                disabled={d.isFiltering}
                className="bg-primary text-on-primary hover:bg-primary-container text-xs rounded-lg px-md py-sm font-semibold transition"
              >
                {d.isFiltering ? "Đang lọc..." : "Lọc"}
              </button>
            </div>
          )}

          {/* Hiện input một ngày nếu chọn single_date */}
          {filterMode === "single_date" && (
            <div className="flex flex-wrap items-center gap-xs">
              <input
                type="date"
                className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
                value={d.filterDate}
                onChange={(e) => d.setFilterDate(e.target.value)}
                disabled={d.isFiltering || d.isGettingAllPosts}
              />
              <button
                type="button"
                onClick={d.handleFilterSingleDate}
                disabled={d.isFiltering}
                className="bg-primary text-on-primary hover:bg-primary-container text-xs rounded-lg px-md py-sm font-semibold transition"
              >
                {d.isFiltering ? "Đang lọc..." : "Lọc"}
              </button>
            </div>
          )}

          {/* Dropdown Chọn Intent (Đồng bộ kiểu Facebook) */}
          <select
            value={d.filterIntent}
            onChange={(e) => d.handleFilterIntent(e.target.value)}
            className="border-outline-variant bg-surface-container-low focus:border-primary rounded-lg border px-md py-sm text-xs outline-none"
            disabled={d.isFiltering || d.isGettingAllPosts}
          >
            <option value="all">Tất cả intent</option>
            {linkedinIntents.map((intentName, idx) => (
              <option key={idx} value={intentName}>
                {intentName}
              </option>
            ))}
          </select>

          {/* Nút Xóa lọc & reload */}
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                d.handleClearCrawlFilter();
              }}
              disabled={d.isFiltering}
              className="border-outline-variant bg-surface hover:bg-surface-container-high flex items-center gap-1 rounded-lg border px-md py-sm text-xs font-medium transition disabled:opacity-50 sm:ml-auto"
              title="Xóa lọc và làm mới"
            >
              <MaterialIcon name="filter_alt_off" className="text-[18px]" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>

        {isFiltered ? (
          <p className="text-body-sm text-on-surface-variant">
            <span className="font-semibold text-on-surface">Điều kiện: </span>
            {d.filterAppliedLabel.trim() || "—"}
          </p>
        ) : null}
      </div>

      {d.filterError ? (
        <div
          className="border-error-container bg-error-container/40 text-error mb-md rounded-lg border px-md py-sm text-body-sm"
          role="alert"
        >
          {d.filterError}
        </div>
      ) : null}

      {d.allPostsError && d.crawlTableViewMode === "all" ? (
        <div
          className="border-error-container bg-error-container/40 text-error mb-md rounded-lg border px-md py-sm text-body-sm"
          role="alert"
        >
          {d.allPostsError}
        </div>
      ) : null}

      {d.allPostsMessage && d.crawlTableViewMode === "all" ? (
        <div
          className="border-secondary-container bg-secondary-container/20 text-on-secondary-container mb-md rounded-lg border px-md py-sm text-body-sm"
          role="status"
        >
          {d.allPostsMessage}
        </div>
      ) : null}

      {d.filterMessage && d.crawlTableViewMode === "filtered" ? (
        <div
          className="border-secondary-container bg-secondary-container/20 text-on-secondary-container mb-md rounded-lg border px-md py-sm text-body-sm"
          role="status"
        >
          {d.filterMessage}
        </div>
      ) : null}

      <CrawlSessionsTableCore
        sessions={d.crawlSessionsForTable}
        busy={d.crawlSessionsTableBusy}
        loadingHint={busyHint}
        emptyHint={isFiltered ? emptyFiltered : emptyAll}
        tableVariant={d.crawlTableViewMode}
        filterAppliedLabel={d.filterAppliedLabel}
        modalTitleSuffix={isFiltered ? "(filter-data)" : "(get-all-posts)"}
        dashboardEmail={d.email?.trim() || null}
        refreshSessionsAfterReaction={d.refreshDashboardData}
        refreshSessionsBusy={d.isGettingAllPosts}
      />
    </section>
  );
}
