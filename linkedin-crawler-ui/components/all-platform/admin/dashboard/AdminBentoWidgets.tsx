"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import Link from "next/link";
import { adminDashboardService, type AdminLeaderboardsData, type GroupsHealthStats } from "@/services/all-platform.service";

interface AdminBentoWidgetsProps {
  leaderboardsData: AdminLeaderboardsData | null;
  isLoading: boolean;
}

export function AdminBentoWidgets({ leaderboardsData, isLoading }: AdminBentoWidgetsProps) {
  const [healthStats, setHealthStats] = useState<GroupsHealthStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const lastFetchedRef = useRef<number | null>(null);

  const fetchHealthStats = useCallback(async (force = false) => {
    if (!force && lastFetchedRef.current && Date.now() - lastFetchedRef.current < 60_000) {
      return;
    }
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await adminDashboardService.getGroupsHealth();
      if (res.success && res.data) {
        setHealthStats(res.data as GroupsHealthStats);
        lastFetchedRef.current = Date.now();
      } else {
        setHealthError(res.message || "Không thể tải");
      }
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthStats(true);
  }, [fetchHealthStats]);

  return (
    <div className="flex flex-col gap-6">
      {/* Widget 2: Top Performers */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MaterialIcon name="star" className="text-[#DC2626] text-[18px]" />
          Top Performers (Seeding)
        </h3>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-xl p-4">
            <div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : !leaderboardsData || !leaderboardsData.top_seeders || leaderboardsData.top_seeders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-xl p-4">
            <MaterialIcon name="warning" className="text-3xl opacity-30" />
            <span className="text-[11px] font-medium">Chưa có dữ liệu</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-white rounded-xl p-4">
            {leaderboardsData.top_seeders.slice(0, 5).map((user, idx) => {
              const maxVal = leaderboardsData.top_seeders[0]?.count || 1;
              const percent = Math.min(100, Math.round((user.count / maxVal) * 100));
              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px] gap-2">
                    <span className="font-bold text-slate-700 truncate flex-1 min-w-0">{user.name || user.email}</span>
                    <span className="font-black text-slate-900 shrink-0">{user.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DC2626] rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Widget 3: Top Groups */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MaterialIcon name="groups" className="text-[#DC2626] text-[18px]" />
          Top Group Tương Tác
        </h3>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-xl p-4">
            <div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : !leaderboardsData || !leaderboardsData.top_groups || leaderboardsData.top_groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-xl p-4">
            <MaterialIcon name="warning" className="text-3xl opacity-30" />
            <span className="text-[11px] font-medium">Chưa có dữ liệu</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-white rounded-xl p-4">
            {leaderboardsData.top_groups.slice(0, 5).map((group, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px] py-1.5 border-b border-slate-50 last:border-0 gap-2">
                <a
                  href={group.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-700 hover:text-[#DC2626] transition-colors line-clamp-2 flex-1 min-w-0"
                >
                  {group.name}
                </a>
                <span className="font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                  {typeof group.interactions === 'number' ? group.interactions.toLocaleString("vi-VN") : group.interactions}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widget 4: Groups Health - REAL DATA */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <MaterialIcon name="folder" className="text-[#DC2626] text-[18px]" />
            Groups Health
          </h3>
          <button
            onClick={() => fetchHealthStats(true)}
            disabled={healthLoading}
            className="w-6 h-6 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition"
            title="Làm mới"
          >
            <MaterialIcon
              name="refresh"
              className={`text-[12px] ${healthLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {healthError ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[11px] text-red-500">{healthError}</span>
          </div>
        ) : healthLoading && !healthStats ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-xl p-4">
            <div className="w-5 h-5 border-2 border-[#DC2626] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : healthStats ? (
          <div className="flex flex-col gap-3 flex-1 mb-4 bg-white rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Đang sống (score ≥60)</span>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-md">
                {healthStats.alive} groups
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Ít hoạt động (score 20-59)</span>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-md">
                {healthStats.low_activity} groups
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Chết hoặc không có data</span>
              <span className="text-[10px] font-bold bg-red-50 text-[#DC2626] px-2.5 py-0.5 rounded-md">
                {healthStats.dead} groups
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Chưa gắn ICP/taxonomy</span>
              <span className="text-[10px] font-bold bg-slate-50 text-slate-700 px-2.5 py-0.5 rounded-md">
                {healthStats.no_taxonomy} groups
              </span>
            </div>

            {/* Top categories */}
            {healthStats.by_tier && healthStats.by_tier.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {healthStats.by_tier.slice(0, 4).map((tier, idx) => (
                  <span key={idx} className="text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                    {tier.tier_name}: {tier.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <Link
          href="/all-platform/quan-ly-nhom"
          className="w-full rounded-xl bg-[#DC2626] px-4 py-2.5 text-center text-[11px] font-semibold text-white transition-colors hover:bg-[#B91C1C]"
        >
          Quản lý Groups &rarr;
        </Link>
      </div>
    </div>
  );
}
