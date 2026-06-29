"use client";

import type { AdminDashboardSummaryData } from "@/services/all-platform.service";

interface AdminDashboardSummaryProps {
  data: AdminDashboardSummaryData | null;
  isLoading: boolean;
}

export function AdminDashboardSummary({ data, isLoading }: AdminDashboardSummaryProps) {
  const cards = [
    {
      title: "TỔNG BÀI VIẾT",
      value: isLoading || !data ? "..." : data.total_crawled_posts,
    },
    {
      title: "TỔNG SEEDING",
      value: isLoading || !data ? "..." : data.total_seeding_comments,
    },
    {
      title: "TỶ LỆ DUYỆT",
      value: isLoading || !data ? "..." : `${data.approval_rate}%`,
    },
    {
      title: "HIỆU SUẤT KPI",
      value: isLoading || !data ? "..." : `${data.kpi_rate}%`,
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div 
            key={idx}
            className="bg-white border border-slate-100 border-l-4 border-l-[#DC2626] rounded-xl p-4 shadow-none flex flex-col relative overflow-hidden"
          >
            <p className="text-slate-500 text-[10px] sm:text-xs font-medium tracking-wide capitalize">
              {card.title}
            </p>
            <p className="text-slate-900 mt-2 text-2xl sm:text-3xl font-black tabular-nums leading-none">
              {typeof card.value === "number" ? card.value.toLocaleString("vi-VN") : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
