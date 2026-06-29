"use client";

import { PlatformStatsRow } from "@/components/features/shared/PlatformStatCard";

interface StatsRowProps {
  totalPostsToday: number;
  postsYesterday: number;
  highScoreCount?: number;
  seededToday: number;
  totalVisible: number;
  highScorePercent?: number;
  kpiProgress?: number;
  kpiProgressPercent?: number;
}

export function StatsRow({
  totalPostsToday,
  postsYesterday,
  highScoreCount,
  seededToday,
  totalVisible,
  highScorePercent,
  kpiProgress,
  kpiProgressPercent,
}: StatsRowProps) {
  const diff = totalPostsToday - postsYesterday;
  const hint =
    diff === 0
      ? "Không thay đổi so với hôm qua"
      : diff > 0
        ? `+${diff} so với hôm qua`
        : `${diff} so với hôm qua`;

  return (
    <PlatformStatsRow>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
            Tổng bài hôm nay
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{totalPostsToday}</p>
          <p className="mt-0.5 text-xs text-[#A0A0A0]">{hint}</p>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
            Tiến độ KPI
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">{kpiProgress !== undefined ? kpiProgress : (highScoreCount || 0)}</p>
          <p className="mt-0.5 text-xs text-[#A0A0A0]">
            {kpiProgressPercent !== undefined
              ? `${kpiProgressPercent}% hoàn thành`
              : highScorePercent !== undefined
                ? `${highScorePercent}% bài đạt`
                : "hoàn thành"}
          </p>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
            Đã seeded hôm nay
          </p>
          <p className="mt-1 text-2xl font-bold text-[#E3000F]">{seededToday}</p>
          <p className="mt-0.5 text-xs text-[#A0A0A0]">bài đã xác minh</p>
        </div>

        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
            Tổng bài đang hiển thị
          </p>
          <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{totalVisible}</p>
          <p className="mt-0.5 text-xs text-[#A0A0A0]">trên tổng bài</p>
        </div>
      </div>
    </PlatformStatsRow>
  );
}
