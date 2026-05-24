"use client";

import { useState, useEffect } from "react";
import { INDUSTRY_OPTIONS, TEAM_OPTIONS, TIER_OPTIONS } from "@/lib/group-taxonomy";
import { cn } from "@/lib/utils";

const LABEL =
  "text-label-md text-on-surface-variant font-semibold tracking-wide uppercase";
const INPUT =
  "border-outline-variant bg-surface focus:border-primary focus:ring-primary w-full rounded-lg border px-md py-sm text-sm outline-none focus:ring-1";

export interface GroupTaxonomyFieldsProps {
  industry: string;
  tier: number | "";
  team: string;
  icp: string;
  icp_desc: string;
  onIndustryChange: (v: string) => void;
  onTierChange: (v: number | "") => void;
  onTeamChange: (v: string) => void;
  onIcpChange: (v: string) => void;
  onIcpDescChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}

export function GroupTaxonomyFields({
  industry,
  tier,
  team,
  icp,
  icp_desc,
  onIndustryChange,
  onTierChange,
  onTeamChange,
  onIcpChange,
  onIcpDescChange,
  disabled = false,
  className,
}: GroupTaxonomyFieldsProps) {
  const [showCustomIndustry, setShowCustomIndustry] = useState(() => {
    return industry !== "" && !INDUSTRY_OPTIONS.some((o) => o.value === industry);
  });

  const [showCustomTeam, setShowCustomTeam] = useState(() => {
    return team !== "" && !TEAM_OPTIONS.includes(team as any);
  });

  useEffect(() => {
    if (industry !== "" && INDUSTRY_OPTIONS.some((o) => o.value === industry)) {
      setShowCustomIndustry(false);
    } else if (industry !== "" && !INDUSTRY_OPTIONS.some((o) => o.value === industry)) {
      setShowCustomIndustry(true);
    }
  }, [industry]);

  useEffect(() => {
    if (team !== "" && TEAM_OPTIONS.includes(team as any)) {
      setShowCustomTeam(false);
    } else if (team !== "" && !TEAM_OPTIONS.includes(team as any)) {
      setShowCustomTeam(true);
    }
  }, [team]);

  return (
    <div className={cn("space-y-md", className)}>
      <p className={LABEL}>Phân loại & ICP (Taxonomy)</p>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={LABEL}>Ngành</label>
          <select
            className={INPUT}
            value={showCustomIndustry ? "__custom__" : industry}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom__") {
                setShowCustomIndustry(true);
                onIndustryChange("");
              } else {
                setShowCustomIndustry(false);
                onIndustryChange(val);
              }
            }}
            disabled={disabled}
          >
            <option value="">— Chọn ngành —</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.id} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value="__custom__">✍️ Khác (tự nhập)...</option>
          </select>
          {showCustomIndustry && (
            <input
              type="text"
              className={cn(INPUT, "mt-2")}
              value={industry}
              onChange={(e) => onIndustryChange(e.target.value)}
              placeholder="Nhập tên ngành tự định nghĩa..."
              disabled={disabled}
            />
          )}
        </div>
        <div>
          <label className={LABEL}>Team phụ trách</label>
          <select
            className={INPUT}
            value={showCustomTeam ? "__custom__" : team}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__custom__") {
                setShowCustomTeam(true);
                onTeamChange("");
              } else {
                setShowCustomTeam(false);
                onTeamChange(val);
              }
            }}
            disabled={disabled}
          >
            <option value="">— Chọn team —</option>
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="__custom__">✍️ Khác (tự nhập)...</option>
          </select>
          {showCustomTeam && (
            <input
              type="text"
              className={cn(INPUT, "mt-2")}
              value={team}
              onChange={(e) => onTeamChange(e.target.value)}
              placeholder="Nhập tên team tự định nghĩa..."
              disabled={disabled}
            />
          )}
        </div>
      </div>

      <div>
        <span className={LABEL}>Tier ưu tiên</span>
        <div className="mt-sm grid grid-cols-3 gap-sm">
          {TIER_OPTIONS.map((t) => (
            <button
              key={t.tier}
              type="button"
              disabled={disabled}
              onClick={() => onTierChange(t.tier)}
              className={cn(
                "rounded-lg border px-sm py-sm text-center transition-colors",
                tier === t.tier
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-outline-variant bg-surface hover:border-primary/40",
              )}
            >
              <div className="text-base">{t.icon}</div>
              <div className="text-[11px] font-bold">{t.title}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={LABEL}>ICP (phân cách dấu phẩy nếu nhiều)</label>
        <input
          className={INPUT}
          value={icp}
          onChange={(e) => onIcpChange(e.target.value)}
          placeholder="Marketing Mgr, CMO"
          disabled={disabled}
        />
      </div>
      <div>
        <label className={LABEL}>Mô tả ICP</label>
        <textarea
          className={`${INPUT} min-h-[72px] resize-y`}
          value={icp_desc}
          onChange={(e) => onIcpDescChange(e.target.value)}
          placeholder="Mô tả đối tượng mục tiêu…"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
