"use client";

import { useState, useEffect, useCallback } from "react";
import { MaterialIcon } from "@/components/ui";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { adminDashboardService } from "@/services/all-platform.service";
import type {
  AdminDashboardSummaryData,
  AdminKpiPerformanceData,
  AdminLeaderboardsData,
} from "@/services/all-platform.service";
import { AdminDashboardSummary } from "@/components/all-platform/admin/dashboard/AdminDashboardSummary";
import { AdminKpiPerformanceChart } from "@/components/all-platform/admin/dashboard/AdminKpiPerformanceChart";
import { AdminLeaderboards } from "@/components/all-platform/admin/dashboard/AdminLeaderboards";
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
    setLoadingSummary(true);
    setLoadingPerformance(true);
    setLoadingLeaderboards(true);

    const [summaryResult, kpiResult, leaderResult] = await Promise.allSettled([
      adminDashboardService.getSummary(),
      adminDashboardService.getKpiPerformance(),
      adminDashboardService.getLeaderboards(),
    ]);

    if (summaryResult.status === "fulfilled") {
      const summaryRes = summaryResult.value;
      if (summaryRes.success && summaryRes.data) {
        setSummaryData(summaryRes.data);
      } else {
        setError(summaryRes.message || "Không thể tải số liệu tổng quan");
      }
    } else {
      setError("Lỗi kết nối máy chủ khi tải số liệu tổng quan");
    }

    if (kpiResult.status === "fulfilled") {
      const kpiRes = kpiResult.value;
      if (kpiRes.success && kpiRes.data) setKpiPerformance(kpiRes.data);
    } else {
      console.error("Failed to load KPI performance");
    }

    if (leaderResult.status === "fulfilled") {
      const leaderRes = leaderResult.value;
      if (leaderRes.success && leaderRes.data) setLeaderboards(leaderRes.data);
    } else {
      console.error("Failed to load leaderboards");
    }

    setLoadingSummary(false);
    setLoadingPerformance(false);
    setLoadingLeaderboards(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = window.setTimeout(() => {
      void loadDashboardData();
    }, 0);
    return () => window.clearTimeout(timer);
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

  const isLoadingAny = loadingSummary || loadingPerformance || loadingLeaderboards;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <MaterialIcon name="dashboard" className="text-[#E3000F]" />
            Dashboard Quản Trị (Admin)
          </h2>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={isLoadingAny}
          className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <FaSyncAlt className={isLoadingAny ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-red-100">
          <MaterialIcon name="error" className="text-[16px] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <AdminDashboardSummary data={summaryData} isLoading={loadingSummary} />
      <AdminKpiPerformanceChart data={kpiPerformance} isLoading={loadingPerformance} />
      <AdminLeaderboards data={leaderboards} isLoading={loadingLeaderboards} />
    </div>
  );
}
