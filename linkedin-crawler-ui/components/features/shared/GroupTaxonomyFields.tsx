"use client";

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
  return (
    <div className={cn("space-y-md", className)}>
      <p className={LABEL}>Phân loại & ICP (Taxonomy)</p>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <div>
          <label className={LABEL}>Ngành</label>
          <select
            className={INPUT}
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">— Chọn ngành —</option>
            {INDUSTRY_OPTIONS.map((o) => (
              <option key={o.id} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Team phụ trách</label>
          <select
            className={INPUT}
            value={team}
            onChange={(e) => onTeamChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">— Chọn team —</option>
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
