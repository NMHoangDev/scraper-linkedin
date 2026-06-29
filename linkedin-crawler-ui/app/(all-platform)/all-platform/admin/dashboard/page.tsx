"use client";

import { useState, useEffect, useCallback } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { adminDashboardService } from "@/services/all-platform.service";
import type { 
  AdminDashboardSummaryData, 
  AdminKpiPerformanceData, 
  AdminLeaderboardsData 
} from "@/services/all-platform.service";
import { AdminDashboardSummary } from "@/components/all-platform/admin/dashboard/AdminDashboardSummary";
import { AdminBentoWidgets } from "@/components/all-platform/admin/dashboard/AdminBentoWidgets";
import { AdminKpiHistoryTable } from "@/components/all-platform/admin/dashboard/AdminKpiHistoryTable";
import { AdminKpiPerformanceChart } from "@/components/all-platform/admin/dashboard/AdminKpiPerformanceChart";
import { AdminUnassignedPosts } from "@/components/all-platform/admin/dashboard/AdminUnassignedPosts";
import { FaSyncAlt } from "react-icons/fa";

export default function AdminDashboardPage() {
  const { user } = useAppAuth();
  const isAdmin = user?.role === "admin";

  const [summaryData, setSummaryData] = useState<AdminDashboardSummaryData | null>(null);
  const [kpiPerformance, setKpiPerformance] = useState<AdminKpiPerformanceData[]>([]);
  const [leaderboards, setLeaderboards] = useState<AdminLeaderboardsData | null>(null);

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);

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
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin, loadDashboardData]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#666666] space-y-2">
        <MaterialIcon name="block" className="text-5xl text-[#FF3344]" />
        <p className="font-bold text-base text-[#1A1A1A]">Quyền truy cập bị từ chối</p>
        <p className="text-sm">Trang này chỉ dành riêng cho tài khoản Admin quản trị.</p>
      </div>
    );
  }

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
          onClick={loadDashboardData}
          disabled={loadingSummary || loadingPerformance || loadingLeaderboards}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-[#DC2626] text-[#DC2626] rounded-xl text-sm transition shrink-0 cursor-pointer shadow-none active:scale-95 disabled:opacity-50 w-10 h-10 lg:w-auto lg:px-4 lg:py-1.5 lg:font-medium"
        >
          <FaSyncAlt className={loadingSummary || loadingPerformance || loadingLeaderboards ? "animate-spin" : ""} />
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
        isLoading={loadingSummary} 
      />

      {/* 2. Main Content Grid - Bento Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Block - Table/Accordion */}
        <div className="lg:col-span-2 flex flex-col gap-6 min-w-0">
          <AdminKpiHistoryTable />
          <AdminUnassignedPosts />
        </div>

        {/* Right Block - Widgets */}
        <div className="lg:col-span-1">
          <AdminBentoWidgets 
            leaderboardsData={leaderboards} 
            isLoading={loadingLeaderboards} 
          />
        </div>
      </div>

      {/* 3. KPI Performance Chart (Full width) */}
      <AdminKpiPerformanceChart 
        data={kpiPerformance} 
        isLoading={loadingPerformance} 
      />
    </div>
  );
}
