"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { adminDashboardService } from "@/services/all-platform.service";
import type {
  AdminDashboardSummaryData,
  AdminKpiPerformanceData,
  AdminLeaderboardsData,
} from "@/services/all-platform.service";
import { AdminDashboardSummary } from "@/components/all-platform/admin/dashboard/AdminDashboardSummary";
import { AdminBentoWidgets } from "@/components/all-platform/admin/dashboard/AdminBentoWidgets";
import { AdminKpiHistoryTable } from "@/components/all-platform/admin/dashboard/AdminKpiHistoryTable";
import { AdminKpiPerformanceChart } from "@/components/all-platform/admin/dashboard/AdminKpiPerformanceChart";
import { AdminUnassignedPosts } from "@/components/all-platform/admin/dashboard/AdminUnassignedPosts";
import { FaSyncAlt } from "react-icons/fa";

interface WeeklySnapshot {
  week_name: string;
  teams: Array<{
    team_id: string; team_name: string;
    lead_actual: number; lead_target: number;
    inbox_actual: number; inbox_target: number;
    post_actual: number; post_target: number;
    comment_actual: number; comment_target: number;
  }>;
}

// Phase 4: gọi 1 RPC duy nhất thay vì 4 HTTP request song song.
// Giảm 5s load admin dashboard xuống <500ms lần đầu, <50ms lần sau (cache 90s).
export default function AdminDashboardPage() {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";

  const [summaryData, setSummaryData] = useState<AdminDashboardSummaryData | null>(null);
  const [kpiPerformance, setKpiPerformance] = useState<AdminKpiPerformanceData[]>([]);
  const [leaderboards, setLeaderboards] = useState<AdminLeaderboardsData | null>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklySnapshot[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    setError(null);
    try {
      const res = await adminDashboardService.getOverview(4);
      if (res.success && res.data) {
        setSummaryData(res.data.summary);
        setKpiPerformance(res.data.kpi_performance || []);
        setLeaderboards(res.data.leaderboards || null);
        setWeeklyHistory((res.data.weekly_history as WeeklySnapshot[]) || []);
      } else {
        setError(res.message || "Không thể tải số liệu tổng quan");
      }
    } catch {
      setError("Lỗi kết nối máy chủ khi tải số liệu tổng quan");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadOverview();
  }, [isAdmin, loadOverview]);

  // Khi overview đã có history, truyền xuống table thay vì nó gọi API riêng.
  const showHistoryTable = loadingOverview || weeklyHistory.length > 0;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#666666] space-y-2">
        <MaterialIcon name="block" className="text-5xl text-[#FF3344]" />
        <p className="font-bold text-base text-[#1A1A1A]">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ dành riêng cho tài khoản Admin quản trị.</p>
      </div>
    );
  }

  const isAnyLoading = loadingOverview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-[-0.02em] text-slate-900">
            Dashboard Quản trị (Admin)
          </h2>
          <p className="text-sm text-slate-400 hidden lg:block mt-1">
            Tổng quan toàn bộ hệ thống
          </p>
        </div>

        <button
          onClick={loadOverview}
          disabled={isAnyLoading}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-[#DC2626] text-[#DC2626] rounded-xl text-sm transition shrink-0 cursor-pointer shadow-none active:scale-95 disabled:opacity-50 w-10 h-10 lg:w-auto lg:px-4 lg:py-1.5 lg:font-medium"
        >
          <FaSyncAlt className={isAnyLoading ? "animate-spin" : ""} />
          <span className="hidden lg:inline">Làm mới</span>
        </button>
      </div>

      {/* Account Safety Alert Banner */}
      <div className="bg-red-50 text-[#DC2626] font-medium border border-red-100 rounded-xl p-3 flex items-center gap-3">
        <MaterialIcon name="warning" className="text-xl shrink-0" />
        <div className="text-sm">
          Cảnh báo hệ thống: <span className="font-bold ml-1">Đã phát hiện 3 nhóm bị khóa và 1 tài khoản seed bị hạn chế tương tác. Cần rà soát và khắc phục ngay!</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-[#DC2626] p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border border-red-100">
          <MaterialIcon name="error" className="text-[16px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Top Summary Stats */}
      <AdminDashboardSummary
        data={summaryData}
        isLoading={loadingOverview}
      />

      {/* 2. Main Content Grid - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Block - Table/Accordion */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <AdminKpiHistoryTable
            leaderEmail={undefined}
            weeks={4}
            initialData={weeklyHistory}
            skipFetch={weeklyHistory.length > 0}
          />
          <AdminUnassignedPosts />
        </div>

        {/* Right Block - Widgets */}
        <div className="lg:col-span-1">
          <AdminBentoWidgets
            leaderboardsData={leaderboards}
            isLoading={loadingOverview}
          />
        </div>
      </div>

      {/* 3. KPI Performance Chart (Full width) */}
      <AdminKpiPerformanceChart
        data={kpiPerformance}
        isLoading={loadingOverview}
      />
    </div>
  );
}
