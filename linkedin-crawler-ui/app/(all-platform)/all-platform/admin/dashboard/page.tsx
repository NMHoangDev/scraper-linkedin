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
import { AdminKpiPerformanceChart } from "@/components/all-platform/admin/dashboard/AdminKpiPerformanceChart";
import { AdminLeaderboards } from "@/components/all-platform/admin/dashboard/AdminLeaderboards";
import { AdminKpiHistoryTable } from "@/components/all-platform/admin/dashboard/AdminKpiHistoryTable";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <MaterialIcon name="dashboard" className="text-[#E3000F]" />
            Dashboard Quản Trị (Admin)
          </h2>
          
        </div>
        
        <button
          onClick={loadDashboardData}
          disabled={loadingSummary || loadingPerformance || loadingLeaderboards}
          className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <FaSyncAlt className={loadingSummary || loadingPerformance || loadingLeaderboards ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-100">
          <MaterialIcon name="error" className="text-[16px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Top Summary Stats */}
      <AdminDashboardSummary 
        data={summaryData} 
        isLoading={loadingSummary} 
      />

      {/* 2. KPI Performance Chart */}
      <AdminKpiPerformanceChart 
        data={kpiPerformance} 
        isLoading={loadingPerformance} 
      />

      {/* 3. Leaderboards */}
      <AdminLeaderboards 
        data={leaderboards} 
        isLoading={loadingLeaderboards} 
      />

      {/* 4. Weekly KPI History Table (Google Sheets Style) */}
      <AdminKpiHistoryTable />
    </div>
  );
}
