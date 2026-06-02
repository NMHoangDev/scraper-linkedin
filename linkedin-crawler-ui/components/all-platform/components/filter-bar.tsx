"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/unified.types";

export type SortOption = "latest" | "score_high" | "score_low" | "comments_high";

interface FilterBarProps {
  intents: Category[];
  industries: Category[];
  teams: Category[];
  tiers: Category[];
  icps: Category[];
  onFilter: (filters: FilterState) => void;
  isLoading?: boolean;
}

export interface FilterState {
  search: string;
  intent: string;
  industry: string;
  team: string;
  tier: string;
  icp: string;
  sort: SortOption;
  dateRange: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "score_high", label: "Score cao nhất" },
  { value: "score_low", label: "Score thấp nhất" },
  { value: "comments_high", label: "Bình luận nhiều nhất" },
];

const DATE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7days", label: "7 ngày" },
  { value: "30days", label: "30 ngày" },
];

export function FilterBar({ intents, industries, teams, tiers, icps, onFilter, isLoading }: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("");
  const [industry, setIndustry] = useState("");
  const [team, setTeam] = useState("");
  const [tier, setTier] = useState("");
  const [icp, setIcp] = useState("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [dateRange, setDateRange] = useState("");

  const handleChange = (updates: Partial<FilterState>) => {
    const s = updates.search !== undefined ? updates.search : search;
    const i = updates.intent !== undefined ? updates.intent : intent;
    const ind = updates.industry !== undefined ? updates.industry : industry;
    const t = updates.team !== undefined ? updates.team : team;
    const ti = updates.tier !== undefined ? updates.tier : tier;
    const ic = updates.icp !== undefined ? updates.icp : icp;
    const so = updates.sort !== undefined ? updates.sort : sort;
    const dr = updates.dateRange !== undefined ? updates.dateRange : dateRange;

    onFilter({
      search: s,
      intent: i,
      industry: ind,
      team: t,
      tier: ti,
      icp: ic,
      sort: so,
      dateRange: dr,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setIntent("");
    setIndustry("");
    setTeam("");
    setTier("");
    setIcp("");
    setSort("latest");
    setDateRange("");
    onFilter({
      search: "",
      intent: "",
      industry: "",
      team: "",
      tier: "",
      icp: "",
      sort: "latest",
      dateRange: "",
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {/* Row 1: Search + Date range */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Tìm kiếm nội dung, tên nhóm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              handleChange({ search: e.target.value });
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={dateRange}
          onChange={(e) => {
            setDateRange(e.target.value);
            handleChange({ dateRange: e.target.value });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortOption);
            handleChange({ sort: e.target.value as SortOption });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Taxonomy filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={intent}
          onChange={(e) => {
            setIntent(e.target.value);
            handleChange({ intent: e.target.value });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả Intent</option>
          {intents.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name || i.code}
            </option>
          ))}
        </select>

        <select
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            handleChange({ industry: e.target.value });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả Ngành</option>
          {industries.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name || i.code}
            </option>
          ))}
        </select>

        <select
          value={team}
          onChange={(e) => {
            setTeam(e.target.value);
            handleChange({ team: e.target.value });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả Team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.code}
            </option>
          ))}
        </select>

        <select
          value={tier}
          onChange={(e) => {
            setTier(e.target.value);
            handleChange({ tier: e.target.value });
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">Tất cả Tier</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name || t.code}
            </option>
          ))}
        </select>

        {icps.length > 0 && (
          <select
            value={icp}
            onChange={(e) => {
              setIcp(e.target.value);
              handleChange({ icp: e.target.value });
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Tất cả ICP</option>
            {icps.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.code}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={clearFilters}
          disabled={isLoading}
          className="ml-auto rounded-lg border border-[#E3000F]/20 bg-[#E3000F]/5 px-4 py-2 text-sm font-medium text-[#E3000F] transition-colors hover:bg-[#E3000F]/10 hover:border-[#E3000F]/40 disabled:opacity-50 cursor-pointer"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
}
