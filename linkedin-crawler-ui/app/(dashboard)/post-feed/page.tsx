"use client";

import { useState, useEffect, useCallback } from "react";
import { FaFacebook, FaLinkedin } from "react-icons/fa";
import { FiExternalLink } from "react-icons/fi";
import { MaterialIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { allPlatformPostsService, allPlatformCategoriesService, teamsService } from "@/services/all-platform.service";
import type { UnifiedPost, FeedPlatform } from "@/types/unified.types";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { useRouter } from "next/navigation";
import { KpiModal } from "@/components/all-platform/components/kpi-modal";
import { useAppPlatform } from "@/components/providers/AppPlatformProvider";
import { ApiExtensionLauncher } from "@/components/all-platform/components/api-extension-launcher";

type ActiveTab = "facebook" | "linkedin";

type SortOption = "newest" | "score_high" | "engagement";

interface Stats {
  totalPostsToday: number;
  postsYesterday: number;
  totalPosts: number;
  highScoreCount: number;
  highScorePercent: number;
  seededToday: number;
  totalVisible: number;
}

interface CategoryItem {
  id: string;
  category_name: string;
  category_type: string;
}

// ─── Score Badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 85
      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
      : score >= 70
        ? "bg-amber-50 text-amber-600 border-amber-200"
        : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex items-center justify-center rounded border w-16 flex-col py-1 text-center", cls)}>
      <span className="text-[28px] font-black leading-none">{score}</span>
      <span className="text-[9px] font-bold tracking-tighter uppercase mt-0.5">AI SCORE</span>
    </span>
  );
}

// ─── Stats Card (Redesigned & Premium & Softer) ─────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  progress,
  trend,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "indigo" | string;
  progress?: { value: number; label: string };
  trend?: { value: number; isUp: boolean; label: string };
}) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;
    setCoords({ x: rotateY, y: rotateX });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCoords({ x: 0, y: 0 });
  };

  const transformStyle = isHovered
    ? { transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg)`, transition: "transform 0.05s ease" }
    : { transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)", transition: "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)" };

  let iconCls = "bg-slate-50 text-slate-500";
  let barColor = "bg-slate-400";

  if (accent === "blue") {
    iconCls = "bg-blue-50/80 text-blue-500 dark:bg-blue-950/20 dark:text-blue-400";
    barColor = "bg-blue-500";
  } else if (accent === "green") {
    iconCls = "bg-emerald-50/80 text-emerald-500 dark:bg-emerald-950/20 dark:text-emerald-400";
    barColor = "bg-emerald-500";
  } else if (accent === "amber") {
    iconCls = "bg-amber-50/80 text-amber-500 dark:bg-amber-950/20 dark:text-amber-400";
    barColor = "bg-amber-500";
  } else if (accent === "indigo") {
    iconCls = "bg-indigo-50/80 text-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-400";
    barColor = "bg-indigo-500";
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={transformStyle}
      className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group select-none"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-1">{value}</h3>
        </div>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105", iconCls)}>
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
        {trend ? (
          <span className={cn(
            "text-[11px] font-bold flex items-center gap-1",
            trend.isUp ? "text-emerald-500" : "text-amber-500"
          )}>
            <span className="material-symbols-outlined text-[14px]">{trend.isUp ? "arrow_upward" : "arrow_downward"}</span>
            {trend.label}
          </span>
        ) : progress ? (
          <div className="flex-1 max-w-[140px]">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${progress.value}%` }} />
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block leading-none">{progress.label}</span>
          </div>
        ) : sub ? (
          <span className="text-[10px] text-slate-400 font-medium leading-none">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Platform Icon ────────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: FeedPlatform }) {
  const bg = platform === "facebook" ? "bg-[#1877F2]" : "bg-[#0077B5]";
  const Icon = platform === "facebook" ? FaFacebook : FaLinkedin;
  return (
    <div className={cn("w-6 h-6 flex items-center justify-center text-white rounded shrink-0", bg)}>
      <Icon className="text-[14px]" />
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function UnifiedPostCard({ post }: { post: UnifiedPost }) {
  const isFb = post.platform === "facebook";
  
  const scoreColor =
    post.score >= 85
      ? "text-emerald-600"
      : post.score >= 70
        ? "text-on-surface"
        : "text-on-surface-variant";

  // Facebook brand changes
  const cardBorderHover = isFb ? "hover:border-[#1877F2]/40" : "hover:border-primary/30";
  const titleHoverColor = isFb ? "group-hover:text-[#1877F2]" : "group-hover:text-primary";
  const detailBtnCls = isFb 
    ? "border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2]/5" 
    : "border-primary text-primary hover:bg-primary/5";
  const verifyBtnCls = isFb 
    ? "bg-[#1877F2] text-white hover:bg-[#1877F2]/90" 
    : "bg-primary text-on-primary hover:brightness-110";

  return (
    <div className={cn(
      "bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden transition-all group",
      cardBorderHover
    )}>
      <div className="flex h-full">
        {/* Score sidebar */}
        <div className={cn(
          "w-24 flex flex-col items-center justify-center border-r border-outline-variant/30 py-lg shrink-0",
          post.score >= 85 ? "bg-emerald-50" : "bg-surface-container"
        )}>
          <span className={cn("text-[32px] font-black leading-none", scoreColor)}>{post.score}</span>
          <span className={cn("text-[10px] font-bold tracking-tighter uppercase mt-1", scoreColor, "opacity-60")}>AI SCORE</span>
        </div>

        {/* Content */}
        <div className="flex-1 p-lg space-y-md min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start gap-md">
            <div className="flex items-center gap-md min-w-0">
              <PlatformBadge platform={post.platform} />
              <div className="min-w-0">
                <h3 className={cn("text-title-lg font-title-lg text-on-surface transition-colors truncate", titleHoverColor)}>
                  {post.group_name}
                </h3>
                <div className="flex gap-xs mt-1 flex-wrap">
                  {post.intent && (
                    <span className={cn(
                      "px-sm py-0.5 bg-surface-container-high text-[10px] font-bold rounded uppercase",
                      isFb ? "text-[#1877F2]" : "text-primary"
                    )}>
                      {post.intent}
                    </span>
                  )}
                  {post.tier !== undefined && (
                    <span className="px-sm py-0.5 bg-surface-container-high text-secondary text-[10px] font-bold rounded uppercase">Tier {post.tier}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-label-sm text-on-surface-variant opacity-60">
                {post.crawl_date ? new Date(post.crawl_date).toLocaleDateString("vi-VN") : ""}
              </p>
            </div>
          </div>

          {/* Content preview */}
          <p className="text-body-md text-on-surface leading-relaxed line-clamp-2">
            {post.content}
          </p>

          {/* Footer */}
          <div className="flex justify-between items-center pt-md border-t border-outline-variant/30">
            {/* Engagement */}
            <div className="flex gap-lg">
              <div className="flex items-center gap-xs text-on-surface-variant">
                <MaterialIcon 
                  name="thumb_up" 
                  className={cn("text-[18px]", isFb ? "text-[#1877F2]" : "text-primary")} 
                  filled={true}
                />
                <span className="text-label-bold">{post.reactions}</span>
              </div>
              <div className="flex items-center gap-xs text-on-surface-variant">
                <MaterialIcon name="chat_bubble" className="text-[18px]" />
                <span className="text-label-bold">{post.comments}</span>
              </div>
              <div className="flex items-center gap-xs text-on-surface-variant">
                <MaterialIcon name="share" className="text-[18px]" />
                <span className="text-label-bold">{post.shares}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-sm items-center">
              <span className="px-lg py-sm rounded-lg bg-surface-container-high text-on-surface-variant text-label-bold">Chưa seeding</span>
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("px-lg py-sm rounded-lg border text-label-bold transition-all", detailBtnCls)}
              >
                Xem chi tiết
              </a>
              <button className={cn("px-lg py-sm rounded-lg text-label-bold flex items-center gap-xs shadow-sm transition-all", verifyBtnCls)}>
                <MaterialIcon name="verified" className="text-[18px]" />
                Xác minh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function PostCardSkeleton() {
  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden animate-pulse">
      <div className="flex h-full">
        <div className="w-24 bg-surface-container flex flex-col items-center justify-center border-r border-outline-variant/30 py-lg shrink-0">
          <div className="w-12 h-8 bg-surface-container-high rounded" />
          <div className="w-16 h-2 bg-surface-container-high rounded mt-2" />
        </div>
        <div className="flex-1 p-lg space-y-md">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="w-48 h-4 bg-surface-container-high rounded" />
              <div className="w-24 h-3 bg-surface-container-high rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 bg-surface-container-high rounded" />
            <div className="w-3/4 h-3 bg-surface-container-high rounded" />
          </div>
          <div className="flex gap-4 pt-md border-t border-outline-variant/30">
            <div className="w-24 h-3 bg-surface-container-high rounded" />
            <div className="flex gap-sm ml-auto">
              <div className="w-24 h-8 bg-surface-container-high rounded-lg" />
              <div className="w-32 h-8 bg-surface-container-high rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PostFeedPage() {
  const { user } = useAppAuth();
  const router = useRouter();
  const { platform: workspacePlatform } = useAppPlatform();
  const [activeTab, setActiveTab] = useState<ActiveTab>("facebook");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [intentFilter, setIntentFilter] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("");
  const [productSeedingFilter, setProductSeedingFilter] = useState("");

  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [intents, setIntents] = useState<CategoryItem[]>([]);
  const [industries, setIndustries] = useState<CategoryItem[]>([]);
  const [teams, setTeams] = useState<CategoryItem[]>([]);
  const [contentTypes, setContentTypes] = useState<CategoryItem[]>([]);
  const [productSeedings, setProductSeedings] = useState<CategoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // KPI modal state
  const [kpiModalOpen, setKpiModalOpen] = useState(false);

  // Sync activeTab with workspacePlatform on mount or when workspacePlatform changes
  useEffect(() => {
    if (workspacePlatform === "facebook" || workspacePlatform === "linkedin") {
      setActiveTab(workspacePlatform);
    }
  }, [workspacePlatform]);

  const platformForApi = activeTab;

  const brandBgClass =
    activeTab === "facebook"
      ? "bg-[#1877F2] text-white hover:bg-[#1877F2]/90"
      : "bg-[#0077B5] text-white hover:bg-[#0077B5]/90";

  const brandFocusClass =
    activeTab === "facebook"
      ? "focus:ring-[#1877F2]/20 focus:border-[#1877F2]"
      : "focus:ring-[#0077B5]/20 focus:border-[#0077B5]";

  const paginationSelectedClass =
    activeTab === "facebook"
      ? "bg-[#1877F2] text-white shadow-sm"
      : "bg-[#0077B5] text-white shadow-sm";

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const [ir, indr, teamRes, ctRes, psRes] = await Promise.all([
        allPlatformCategoriesService.getAll("intent"),
        allPlatformCategoriesService.getAll("industry"),
        teamsService.getAll(),
        allPlatformCategoriesService.getAll("content_type"),
        allPlatformCategoriesService.getAll("product_seeding")
      ]);
      if (ir.success && ir.data) {
        setIntents(
          ir.data.map((c: any) => ({
            id: c.id,
            category_type: c.category_type,
            category_name: c.name || c.code || "",
          }))
        );
      }
      if (indr.success && indr.data) {
        setIndustries(
          indr.data.map((c: any) => ({
            id: c.id,
            category_type: c.category_type,
            category_name: c.name || c.code || "",
          }))
        );
      }
      if (teamRes.success && teamRes.data) {
        setTeams(
          (teamRes.data as any[]).map((t: any) => ({
            id: t.id,
            category_type: "team",
            category_name: t.name_team,
          }))
        );
      }
      if (ctRes.success && ctRes.data) {
        setContentTypes(
          ctRes.data.map((c: any) => ({
            id: c.id,
            category_type: c.category_type,
            category_name: c.name || c.code || "",
          }))
        );
      }
      if (psRes.success && psRes.data) {
        setProductSeedings(
          psRes.data.map((c: any) => ({
            id: c.id,
            category_type: c.category_type,
            category_name: c.name || c.code || "",
          }))
        );
      }
    } catch { /* ignore */ }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await allPlatformPostsService.getStats({ email: user.email, platform: activeTab });
      if (res.success && res.data) setStats(res.data as Stats);
    } catch { /* ignore */ }
  }, [user?.email, activeTab]);

  // Load posts
  const loadPosts = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const res = await allPlatformPostsService.filter({
        email: user.email,
        platform: platformForApi,
        search: search || undefined,
        intent: intentFilter || undefined,
        industry: industryFilter || undefined,
        team: teamFilter || undefined,
        tier: tierFilter || undefined,
        content_type: contentTypeFilter || undefined,
        product_seeding: productSeedingFilter || undefined,
        sort,
        page,
        page_size: pageSize,
      });
      if (res.success && res.data) {
        setPosts(res.data.posts);
        setTotal(res.data.total);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [user?.email, platformForApi, search, intentFilter, industryFilter, teamFilter, tierFilter, contentTypeFilter, productSeedingFilter, sort, page]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);
  useEffect(() => { void loadStats(); }, [loadStats]);
  useEffect(() => { void loadPosts(); }, [loadPosts]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [activeTab, search, intentFilter, industryFilter, teamFilter, tierFilter, contentTypeFilter, productSeedingFilter, sort]);

  const totalPages = Math.ceil(total / pageSize);
  const displayFrom = Math.min((page - 1) * pageSize + 1, total);
  const displayTo = Math.min(page * pageSize, total);

  // Compute trend for Card 1
  const diff = stats ? stats.totalPostsToday - stats.postsYesterday : 0;
  const trend = stats ? {
    value: Math.abs(diff),
    isUp: diff >= 0,
    label: `${diff >= 0 ? "+" : ""}${diff} so với hôm qua`
  } : undefined;

  // KPI member construct
  const member = user ? {
    email: user.email,
    name: user.name || user.email.split("@")[0],
    kpi_target: 10,
    verified_count: stats?.seededToday || 0,
    total_count: stats?.totalVisible || total,
  } : undefined;

  const handleCrawlClick = () => {
    router.push("/crawl-data");
  };

  return (
    <div className="w-full space-y-6">
      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unified Post Feed</h1>
          <p className="text-sm text-slate-500">Quản lý và theo dõi bài viết đa nền tảng với trí tuệ nhân tạo.</p>
        </div>

        {/* Platform Tabs & Crawl Button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-slate-100/80 rounded-xl p-1 border border-slate-200/50 flex">
            {([
              { key: "facebook", label: "Facebook" },
              { key: "linkedin", label: "LinkedIn" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer",
                  activeTab === t.key
                    ? t.key === "facebook"
                      ? "bg-[#1877F2] text-white shadow-sm"
                      : "bg-[#0077B5] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleCrawlClick}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer text-white",
              activeTab === "facebook"
                ? "bg-[#1877F2]"
                : "bg-[#0077B5]"
            )}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Cào dữ liệu
          </button>
        </div>
      </div>

      {activeTab === "facebook" && (
        <ApiExtensionLauncher
          onComplete={() => {
            loadPosts();
            loadStats();
          }}
        />
      )}

      {/* ── STATS BENTO ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="description"
          label="Tổng bài hôm nay"
          value={stats?.totalPostsToday ?? "—"}
          trend={trend}
          accent="blue"
        />
        <StatCard
          icon="trending_up"
          label="Điểm cao (≥70)"
          value={stats?.highScoreCount ?? "—"}
          progress={stats ? { value: stats.highScorePercent, label: `${stats.highScorePercent}% trong tập đang lọc` } : undefined}
          accent="green"
        />
        <StatCard
          icon="rocket_launch"
          label="Đã Seeded hôm nay"
          value={stats?.seededToday ?? "—"}
          sub="Ước tính từ batch hôm nay"
          accent="amber"
        />
        <StatCard
          icon="visibility"
          label="Tổng bài hiển thị"
          value={stats?.totalVisible ?? total}
          sub={`${total} bài trong database`}
          accent="indigo"
        />
      </div>

      {/* ── ADVANCED FILTER ─────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)] space-y-4">
        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-4 relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[20px] pointer-events-none select-none">
              search
            </span>
            <input
              className={cn(
                "w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl focus:ring-2 focus:outline-none text-sm transition-all placeholder:text-slate-400 text-slate-700",
                brandFocusClass
              )}
              placeholder="Tìm kiếm bài viết..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Intent */}
          <div className="md:col-span-3">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
            >
              <option value="">Tất cả Lĩnh vực</option>
              {intents.map((i) => (
                <option key={i.id} value={i.id}>{i.category_name}</option>
              ))}
            </select>
          </div>

          {/* Industry */}
          <div className="md:col-span-3">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
            >
              <option value="">Tất cả Ngành</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>{i.category_name}</option>
              ))}
            </select>
          </div>

          {/* Team */}
          <div className="md:col-span-2">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">Tất cả Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.category_name}</option>
              ))}
            </select>
          </div>

          {/* Tier */}
          <div className="md:col-span-2">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              <option value="">Tất cả Tier</option>
              {[0, 1, 2, 3, 4].map((t) => (
                <option key={t} value={t.toString()}>Tier {t}</option>
              ))}
            </select>
          </div>

          {/* Content Type */}
          <div className="md:col-span-3">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
            >
              <option value="">Loại nội dung</option>
              {contentTypes.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>
          </div>

          {/* Product Seeding */}
          <div className="md:col-span-3">
            <select
              className={cn(
                "w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:outline-none text-slate-600 cursor-pointer transition-all",
                brandFocusClass
              )}
              value={productSeedingFilter}
              onChange={(e) => setProductSeedingFilter(e.target.value)}
            >
              <option value="">Sản phẩm Seeding</option>
              {productSeedings.map((c) => (
                <option key={c.id} value={c.id}>{c.category_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <select
              className={cn(
                "bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 text-xs font-semibold text-slate-600 focus:ring-2 focus:outline-none cursor-pointer transition-all",
                brandFocusClass
              )}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="score_high">Sắp xếp: AI Score cao nhất</option>
              <option value="engagement">Sắp xếp: Tương tác nhiều nhất</option>
            </select>

            <button 
              onClick={() => { void loadPosts(); void loadStats(); }}
              className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center text-slate-500" 
              title="Làm mới"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setKpiModalOpen(true)}
              className={cn(
                "px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer",
                activeTab === "facebook"
                  ? "bg-[#505f76]"
                  : "bg-sky-600"
              )}
            >
              <span className="material-symbols-outlined text-[16px]">analytics</span>
              Tính KPI
            </button>
            {(intentFilter || industryFilter || teamFilter || tierFilter || search || contentTypeFilter || productSeedingFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setIntentFilter("");
                  setIndustryFilter("");
                  setTeamFilter("");
                  setTierFilter("");
                  setContentTypeFilter("");
                  setProductSeedingFilter("");
                  setSort("newest");
                }}
                className="text-slate-500 hover:text-red-500 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-red-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">backspace</span>
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── POST LIST ────────────────────────────────────────────────── */}
      <div className="space-y-md">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mx-auto mb-4">inbox</span>
            <p className="text-sm font-semibold text-slate-600">Chưa có bài viết nào.</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc chạy crawl để thu thập dữ liệu.</p>
          </div>
        ) : (
          posts.map((post) => (
            <UnifiedPostCard key={post.id || post.post_url} post={post} />
          ))
        )}
      </div>

      {/* ── PAGINATION ──────────────────────────────────────────────── */}
      {total > pageSize && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.015)]">
          <p className="text-xs text-slate-500">
            Hiển thị <span className="font-bold text-slate-700">{displayFrom} - {displayTo}</span> trong số{" "}
            <span className="font-bold text-slate-700">{total}</span> bài viết
          </p>
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30 cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              const isSelectedPage = page === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer",
                    isSelectedPage
                      ? paginationSelectedClass
                      : "hover:bg-slate-100 text-slate-600",
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && (
              <>
                <span className="px-1 opacity-40 text-xs">...</span>
                <button
                  onClick={() => setPage(totalPages)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer",
                    page === totalPages
                      ? paginationSelectedClass
                      : "hover:bg-slate-100 text-slate-600",
                  )}
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500 disabled:opacity-30 cursor-pointer"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </nav>
        </div>
      )}

      {/* KPI Modal */}
      {kpiModalOpen && member && (
        <KpiModal
          isOpen={kpiModalOpen}
          onClose={() => setKpiModalOpen(false)}
          member={member}
        />
      )}
    </div>
  );
}
