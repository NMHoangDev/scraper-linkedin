"use client";

import { cn } from "@/lib/utils";

export interface PlatformStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  hintTone?: "up" | "down" | "neutral";
  accent?: "primary" | "secondary" | "success" | "warning" | "error";
}

const accentTone: Record<NonNullable<PlatformStatCardProps["accent"]>, string> = {
  primary: "text-[#DC2626]",
  secondary: "text-slate-500",
  success: "text-emerald-600",
  warning: "text-amber-600",
  error: "text-rose-600",
};

const hintCls: Record<NonNullable<PlatformStatCardProps["hintTone"]>, string> = {
  up: "text-[var(--color-success,#16a34a)]",
  down: "text-error",
  neutral: "text-on-surface-variant",
};

export function PlatformStatCard({
  label,
  value,
  hint,
  hintTone = "neutral",
  accent = "primary",
}: PlatformStatCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-100 rounded-xl p-4 shadow-none flex flex-col relative overflow-hidden",
      )}
    >
      <p className="text-slate-500 text-xs font-semibold">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-extrabold tabular-nums leading-none", accentTone[accent])}>
        {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
      </p>
      {hint ? (
        <p className={cn("mt-1.5 text-[11px] font-semibold", hintCls[hintTone])}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PlatformStatsRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-lg grid grid-cols-2 gap-sm xl:grid-cols-4">
      {children}
    </div>
  );
}
