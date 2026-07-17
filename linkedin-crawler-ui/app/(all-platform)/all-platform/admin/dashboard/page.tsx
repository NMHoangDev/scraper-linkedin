"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { adminDashboardService } from "@/services/all-platform.service";
import type {
  AdminDashboardSummaryData,
  AdminKpiPerformanceData,
  AdminLeaderboardsData,
  AdminTeamDailyTrendData,
} from "@/services/all-platform.service";
import { AdminDashboardSummary } from "@/components/all-platform/admin/dashboard/AdminDashboardSummary";
import { AdminBentoWidgets } from "@/components/all-platform/admin/dashboard/AdminBentoWidgets";
import { AdminKpiHistoryTable } from "@/components/all-platform/admin/dashboard/AdminKpiHistoryTable";
import { AdminKpiPerformanceChart } from "@/components/all-platform/admin/dashboard/AdminKpiPerformanceChart";
import { AdminTeamTrendChart } from "@/components/all-platform/admin/dashboard/AdminTeamTrendChart";
import { AdminUnassignedPosts } from "@/components/all-platform/admin/dashboard/AdminUnassignedPosts";
import { FaSyncAlt } from "react-icons/fa";

export default function AdminDashboardPage() {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";

  const [summaryData, setSummaryData] =
    useState<AdminDashboardSummaryData | null>(null);
  const [kpiPerformance, setKpiPerformance] = useState<
    AdminKpiPerformanceData[]
  >([]);
  const [leaderboards, setLeaderboards] =
    useState<AdminLeaderboardsData | null>(null);
  const [teamDailyTrend, setTeamDailyTrend] =
    useState<AdminTeamDailyTrendData | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [loadingTeamTrend, setLoadingTeamTrend] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setError(null);

    // 1. Fetch Summary Stats
    setLoadingSummary(true);
    try {
      const summaryRes = await adminDashboardService.getSummary();
      if (summaryRes.success && summaryRes.data) {
        setSummaryData(summaryRes.data);
      } else {
        setError(summaryRes.message || "Không thể tải số liệu tổng quan");
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi tải số liệu tổng quan");
    } finally {
      setLoadingSummary(false);
    }

    // 2. Fetch KPI Performance Charts
    setLoadingPerformance(true);
    try {
      const kpiRes = await adminDashboardService.getKpiPerformance();
      if (kpiRes.success && kpiRes.data) {
        setKpiPerformance(kpiRes.data);
      }
    } catch {
      console.error("Lỗi khi tải biểu đồ kpi");
    } finally {
      setLoadingPerformance(false);
    }

    // 3. Fetch Leaderboards
    setLoadingLeaderboards(true);
    try {
      const leaderRes = await adminDashboardService.getLeaderboards();
      if (leaderRes.success && leaderRes.data) {
        setLeaderboards(leaderRes.data);
      }
    } catch {
      console.error("Lỗi khi tải bảng xếp hạng");
    } finally {
      setLoadingLeaderboards(false);
    }

    setLoadingTeamTrend(true);
    try {
      const trendRes = await adminDashboardService.getTeamDailyTrend(14);
      if (trendRes.success && trendRes.data) {
        setTeamDailyTrend(trendRes.data);
      }
    } catch {
      console.error("Lá»—i khi táº£i biá»ƒu Ä‘á»“ xu hÆ°á»›ng theo team");
    } finally {
      setLoadingTeamTrend(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, loadDashboardData]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant space-y-2">
        <MaterialIcon
          name="block"
          className="text-5xl text-primary-container"
        />
        <p className="font-bold text-base text-on-surface">
          Quyền truy cập bị từ chối
        </p>
        <p className="text-sm">
          Trang này chỉ dành riêng cho tài khoản Admin quản trị.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">
            Dashboard Quản trị (Admin)
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tổng quan toàn bộ hệ thống
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loadingSummary || loadingPerformance || loadingLeaderboards}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          <FaSyncAlt
            className={
              loadingSummary || loadingPerformance || loadingLeaderboards
                ? "animate-spin"
                : ""
            }
          />
          Làm mới
        </button>
      </div>

      {/* Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-primary">
        <MaterialIcon name="warning" className="text-xl shrink-0" />

        <div className="flex flex-1 flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            Cảnh báo hệ thống:
            <span className="ml-1 font-bold">
              Đã phát hiện 3 nhóm bị khóa và 1 tài khoản seed bị hạn chế tương
              tác. Cần rà soát và khắc phục ngay!
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/all-platform/quan-ly-nhom"
              className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
            >
              Xem nhóm bị khóa
            </Link>
            <Link
              href="/all-platform/quan-ly-tai-khoan"
              className="rounded-lg border border-primary/30 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
            >
              Xem tài khoản hạn chế
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-primary">
          <MaterialIcon name="error" className="text-[16px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AdminDashboardSummary data={summaryData} isLoading={loadingSummary} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 xl:col-span-2">
          <AdminTeamTrendChart
            data={teamDailyTrend}
            isLoading={loadingTeamTrend}
          />
          <AdminUnassignedPosts />
        </div>

        <div className="xl:col-span-1">
          <AdminBentoWidgets
            leaderboardsData={leaderboards}
            isLoading={loadingLeaderboards}
          />
        </div>
      </div>

      <AdminKpiHistoryTable />

      <AdminKpiPerformanceChart
        data={kpiPerformance}
        isLoading={loadingPerformance}
      />
    </div>
  );
}
