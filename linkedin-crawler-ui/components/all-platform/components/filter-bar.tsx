"use client";

import { useState } from "react";
import { FaSearch } from "react-icons/fa";

import type { Category } from "@/types/unified.types";

export type SortOption =
  | "latest"
  | "score_high"
  | "score_low"
  | "comments_high"
  | "crawler";

interface FilterBarProps {
  intents: Category[];
  industries: Category[];
  teams: Category[];
  tiers: Category[];
  icps: Category[];
  contentTypes?: Category[];
  productSeedings?: Category[];
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
  content_type: string;
  product_seeding: string;
  sort: SortOption;
  dateRange: string;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "latest", label: "Mới nhất" },
  { value: "score_high", label: "Score cao nhất" },
  { value: "score_low", label: "Score thấp nhất" },
  { value: "comments_high", label: "Bình luận nhiều nhất" },
  { value: "crawler", label: "Theo người cào (team & tên)" },
];

const DATE_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7days", label: "7 ngày" },
  { value: "30days", label: "30 ngày" },
];

const selectClassName =
  "w-full rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none transition focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20";

export function FilterBar({
  intents,
  industries,
  teams,
  tiers,
  icps,
  contentTypes = [],
  productSeedings = [],
  onFilter,
}: FilterBarProps) {
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState("");
  const [industry, setIndustry] = useState("");
  const [team, setTeam] = useState("");
  const [tier, setTier] = useState("");
  const [icp, setIcp] = useState("");
  const [contentType, setContentType] = useState("");
  const [productSeeding, setProductSeeding] = useState("");
  const [sort, setSort] = useState<SortOption>("latest");
  const [dateRange, setDateRange] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasActiveFilters =
    search !== "" ||
    intent !== "" ||
    industry !== "" ||
    team !== "" ||
    tier !== "" ||
    icp !== "" ||
    contentType !== "" ||
    productSeeding !== "" ||
    sort !== "latest" ||
    dateRange !== "";

  const handleChange = (updates: Partial<FilterState>) => {
    onFilter({
      search: updates.search ?? search,
      intent: updates.intent ?? intent,
      industry: updates.industry ?? industry,
      team: updates.team ?? team,
      tier: updates.tier ?? tier,
      icp: updates.icp ?? icp,
      content_type: updates.content_type ?? contentType,
      product_seeding: updates.product_seeding ?? productSeeding,
      sort: updates.sort ?? sort,
      dateRange: updates.dateRange ?? dateRange,
    });
  };

  const clearFilters = () => {
    setSearch("");
    setIntent("");
    setIndustry("");
    setTeam("");
    setTier("");
    setIcp("");
    setContentType("");
    setProductSeeding("");
    setSort("latest");
    setDateRange("");
    onFilter({
      search: "",
      intent: "",
      industry: "",
      team: "",
      tier: "",
      icp: "",
      content_type: "",
      product_seeding: "",
      sort: "latest",
      dateRange: "",
    });
  };

  return (
    <div className="relative mb-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm nội dung, tên nhóm..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              handleChange({ search: event.target.value });
            }}
            className="w-full rounded-lg border border-slate-100 bg-white py-1.5 pl-9 pr-4 text-xs text-slate-900 outline-none transition focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
          >
            <span>🎛️</span>
            <span>Lọc nâng cao</span>
          </button>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-100 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      {showAdvancedFilters ? (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3 sm:absolute sm:left-4 sm:right-4 sm:top-full sm:z-20 sm:mt-2 sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <select
              value={dateRange}
              onChange={(event) => {
                setDateRange(event.target.value);
                handleChange({ dateRange: event.target.value });
              }}
              className={selectClassName}
            >
              {DATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortOption);
                handleChange({ sort: event.target.value as SortOption });
              }}
              className={selectClassName}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={intent}
              onChange={(event) => {
                setIntent(event.target.value);
                handleChange({ intent: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Tất cả lĩnh vực</option>
              {intents.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={industry}
              onChange={(event) => {
                setIndustry(event.target.value);
                handleChange({ industry: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Tất cả ngành</option>
              {industries.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={team}
              onChange={(event) => {
                setTeam(event.target.value);
                handleChange({ team: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Tất cả team</option>
              {teams.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={tier}
              onChange={(event) => {
                setTier(event.target.value);
                handleChange({ tier: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Tất cả tier</option>
              {tiers.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={icp}
              onChange={(event) => {
                setIcp(event.target.value);
                handleChange({ icp: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Tất cả ICP</option>
              {icps.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={contentType}
              onChange={(event) => {
                setContentType(event.target.value);
                handleChange({ content_type: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Loại nội dung</option>
              {contentTypes.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>

            <select
              value={productSeeding}
              onChange={(event) => {
                setProductSeeding(event.target.value);
                handleChange({ product_seeding: event.target.value });
              }}
              className={selectClassName}
            >
              <option value="">Sản phẩm seeding</option>
              {productSeedings.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.name || option.code}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
