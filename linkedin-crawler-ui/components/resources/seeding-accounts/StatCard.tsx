"use client";

import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  meta?: string;
  metaColor?: "good" | "bad" | "warn" | "normal";
  iconBg: string;
  iconColor: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, meta, metaColor = "normal", iconBg, iconColor, icon: Icon }: StatCardProps) {
  const metaCls = metaColor === "good" ? "text-[#16a26a]" : metaColor === "bad" ? "text-[#dc2626]" : metaColor === "warn" ? "text-[#f59e0b]" : "text-[#737785]";

  return (
    <div
      className="relative overflow-hidden rounded-[14px] border border-[#e7e9ef] bg-white p-[14px]"
      style={{ boxShadow: "0 1px 3px rgba(20,25,40,.08), 0 8px 24px rgba(20,25,40,.04)" }}
    >
      <div
        className="absolute right-3 top-3 flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
        style={{ background: iconBg, color: iconColor }}
      >
        {Icon && <Icon className="h-[18px] w-[18px]" />}
      </div>
      <div className="text-[12px] font-bold text-[#737785]">{label}</div>
      <div className="mt-1 text-[24px] font-extrabold text-[#252733]">
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </div>
      {meta ? (
        <div className={`mt-[7px] text-[11px] font-semibold ${metaCls}`}>{meta}</div>
      ) : null}
    </div>
  );
}

