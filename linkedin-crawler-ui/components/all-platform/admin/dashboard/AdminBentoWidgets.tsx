"use client";

import { MaterialIcon } from "@/components/ui";
import Link from "next/link";
import type { AdminLeaderboardsData } from "@/services/all-platform.service";

interface AdminBentoWidgetsProps {
  leaderboardsData: AdminLeaderboardsData | null;
  isLoading: boolean;
}

export function AdminBentoWidgets({ leaderboardsData, isLoading }: AdminBentoWidgetsProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Widget 2: Top Performers */}
      <div className="bg-surface border border-outline-variant rounded-xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <MaterialIcon name="star" className="text-primary text-[18px]" />
          Top Performers (Seeding)
        </h3>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-surface rounded-xl p-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : !leaderboardsData || !leaderboardsData.top_seeders || leaderboardsData.top_seeders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-surface rounded-xl p-4">
            <MaterialIcon name="warning" className="text-3xl opacity-30" />
            <span className="text-[11px] font-medium">Chưa có dữ liệu</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-surface rounded-xl p-4">
            {leaderboardsData.top_seeders.slice(0, 5).map((user, idx) => {
              const maxVal = leaderboardsData.top_seeders[0]?.count || 1;
              const percent = Math.min(100, Math.round((user.count / maxVal) * 100));
              return (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[11px] gap-2">
                    <span className="font-bold text-on-surface truncate flex-1 min-w-0">{user.name || user.email}</span>
                    <span className="font-black text-on-surface shrink-0">{user.count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
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
      <div className="bg-surface border border-outline-variant rounded-xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <MaterialIcon name="groups" className="text-primary text-[18px]" />
          Top Group Tương Tác
        </h3>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-surface rounded-xl p-4">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Đang tải...</span>
          </div>
        ) : !leaderboardsData || !leaderboardsData.top_groups || leaderboardsData.top_groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-surface rounded-xl p-4">
            <MaterialIcon name="warning" className="text-3xl opacity-30" />
            <span className="text-[11px] font-medium">Chưa có dữ liệu</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 bg-surface rounded-xl p-4">
            {leaderboardsData.top_groups.slice(0, 5).map((group, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px] py-1.5 border-b border-outline-variant last:border-0 gap-2">
                <a
                  href={group.url || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-on-surface hover:text-primary transition-colors line-clamp-2 flex-1 min-w-0"
                >
                  {group.name}
                </a>
                <span className="font-bold text-primary bg-red-50 px-2 py-0.5 rounded-md shrink-0 mt-0.5">
                  {typeof group.interactions === 'number' ? group.interactions.toLocaleString("vi-VN") : group.interactions}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Widget 4: Tổng quan Tài Nguyên Groups */}
      <div className="bg-surface border border-outline-variant rounded-xl p-5 flex flex-col lg:flex-1 min-h-[220px]">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <MaterialIcon name="analytics" className="text-primary text-[18px]" />
          Tổng quan Tài Nguyên Groups
        </h3>

        <div className="flex flex-col gap-4 bg-surface rounded-xl p-4">
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1.5">
              <span className="font-medium text-on-surface">Tier 1 (Ưu tiên cao)</span>
              <span className="font-black text-on-surface">45%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: '45%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center text-[11px] mb-1.5">
              <span className="font-medium text-on-surface">Tier 2 (Theo dõi)</span>
              <span className="font-black text-on-surface">35%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full opacity-70" style={{ width: '35%' }} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">Bất động sản: 120</span>
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">Marketing: 85</span>
            <span className="text-[10px] font-medium text-on-surface-variant bg-surface-container-low px-2 py-1 rounded-md">IT/Code: 64</span>
          </div>
        </div>
      </div>

      {/* Widget 5: Groups Health */}
      <div className="bg-surface border border-outline-variant rounded-xl p-5 flex flex-col lg:flex-1 min-h-[160px]">
        <h3 className="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
          <MaterialIcon name="folder" className="text-primary text-[18px]" />
          Groups Health
        </h3>

        <div className="flex flex-col gap-3 flex-1 mb-4 bg-surface rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Đang sống (score ≥60)</span>
            <span className="text-[10px] font-bold bg-surface-container-low text-on-surface px-2.5 py-0.5 rounded-md">19 groups</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Ít hoạt động</span>
            <span className="text-[10px] font-bold bg-surface-container-low text-on-surface px-2.5 py-0.5 rounded-md">4 groups</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Đã chết (&lt;20)</span>
            <span className="text-[10px] font-bold bg-red-50 text-primary px-2.5 py-0.5 rounded-md">1 group</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-medium">Chưa gắn taxonomy</span>
            <span className="text-[10px] font-bold bg-surface-container-low text-on-surface px-2.5 py-0.5 rounded-md">3 groups</span>
          </div>
        </div>

        <Link
          href="/all-platform/quan-ly-nhom"
          className="w-full rounded-xl bg-primary px-4 py-2.5 text-center text-[11px] font-semibold text-white transition-colors hover:bg-on-primary-fixed-variant"
        >
          Quản lý Groups &rarr;
        </Link>
      </div>
    </div>
  );
}
