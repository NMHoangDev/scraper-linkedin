"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CrawlLinkedInPopup } from "@/components/all-platform/crawl-linkedin-popup";
import { CrawlFacebookPopup } from "@/components/all-platform/crawl-facebook-popup";
import { ApiExtensionLauncher } from "@/components/all-platform/components/api-extension-launcher";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { FilterBar, type FilterState } from "@/components/all-platform/components/filter-bar";
import { PostCard } from "@/components/all-platform/components/post-card";
import { PostDetailModal } from "@/components/all-platform/components/post-detail-modal";
import { VerifyAccountModal } from "@/components/all-platform/components/verify-account-modal";
import { KpiProgressCard } from "@/components/all-platform/components/kpi-progress-card";
import { allPlatformPostsService, allPlatformCategoriesService, teamsService, usersService, type AppUserProfile } from "@/services/all-platform.service";
import type { UnifiedPost, UnifiedStats, Category, FeedPlatform } from "@/types/unified.types";

// ─── Retry helper ────────────────────────────────────────────────────────────────
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }
  throw lastError;
}

// ─── Timezone Helpers (Vietnam UTC+7) ─────────────────────────────────────────
const VIETNAM_OFFSET_HOURS = 7;

function getVietnamNow(): Date {
  return new Date(Date.now() + VIETNAM_OFFSET_HOURS * 60 * 60 * 1000);
}

function getVietnamDateStr(): string {
  return getVietnamNow().toISOString().split("T")[0];
}

function getVietnamYesterdayStr(): string {
  const d = getVietnamNow();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const getDatePart = (dateInput?: Date | string | null) => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const normalized = dateInput.replace(" ", "T");
    const datePart = normalized.split("T")[0];
    if (datePart.length === 10) {
      return datePart;
    }
    return normalized.substring(0, 10);
  }
  try {
    return dateInput.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

// ─── Stats Card (Redesigned & Premium & Softer) ─────────────────────────────────
interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "green" | "amber" | "indigo" | string;
  progress?: { value: number; label: string };
  trend?: { value: number; isUp: boolean; label: string };
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  progress,
  trend,
}: StatCardProps) {
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
    ? {
        transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg)`,
        transition: "transform 0.05s ease",
      }
    : {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
      };

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
          <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-1">
            {typeof value === "number" ? value.toLocaleString("vi-VN") : value}
          </h3>
        </div>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105",
            iconCls,
          )}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
        {trend ? (
          <span
            className={cn(
              "text-[11px] font-bold flex items-center gap-1",
              trend.isUp ? "text-emerald-500" : "text-amber-500",
            )}
          >
            <span className="material-symbols-outlined text-[14px]">
              {trend.isUp ? "arrow_upward" : "arrow_downward"}
            </span>
            {trend.label}
          </span>
        ) : progress ? (
          <div className="flex-1 max-w-[140px]">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                style={{ width: `${progress.value}%` }}
              />
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-1 block leading-none">
              {progress.label}
            </span>
          </div>
        ) : sub ? (
          <span className="text-[10px] text-slate-400 font-medium leading-none">{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function UnifiedDashboardHomeContent({ hideHeader }: { hideHeader?: boolean }) {
  const { user } = useAppAuth();
  const CURRENT_USER_EMAIL = user?.email || "";

  const [feedPlatform, setFeedPlatform] = useState<FeedPlatform>("facebook");
  const [showCrawlPopup, setShowCrawlPopup] = useState(false);
  const [showFacebookCrawlPopup, setShowFacebookCrawlPopup] = useState(false);

  const [detailModalPost, setDetailModalPost] = useState<UnifiedPost | null>(null);
  const [verifyModalPost, setVerifyModalPost] = useState<UnifiedPost | null>(null);

  // States
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [stats, setStats] = useState<UnifiedStats>({
    totalPostsToday: 0,
    postsYesterday: 0,
    highScoreCount: 0,
    highScorePercent: 0,
    seededToday: 0,
    kpiProgress: 0,
    kpiTarget: 0,
    kpiProgressPercent: 0,
  });
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter & Taxonomy States
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; id_leader?: string; members?: { id: string }[] }[]>([]);
  const [usersList, setUsersList] = useState<AppUserProfile[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    intent: "",
    industry: "",
    team: "",
    tier: "",
    icp: "",
    content_type: "",
    product_seeding: "",
    member: "",
    sort: "latest",
    dateRange: "",
  });
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const [catRes, teamRes, userRes] = await Promise.all([
        allPlatformCategoriesService.getAll(),
        teamsService.getAll(),
        usersService.getAllProfiles(),
      ]);
      if (catRes.success && catRes.data) setCategories(catRes.data as Category[]);
      if (teamRes.success && teamRes.data) {
        const seen = new Set<string>();
        const list: { id: string; name: string; id_leader?: string; members?: { id: string }[] }[] = [];
        for (const t of teamRes.data as any[]) {
          if (t.id && t.name_team && !seen.has(t.id)) {
            seen.add(t.id);
            list.push({ id: t.id, name: t.name_team, id_leader: t.id_leader, members: t.members });
          }
        }
        setTeams(list);
      }
      if (userRes.success && userRes.data) {
        setUsersList(userRes.data);
      }
    } catch {}
  }, []);

  // Fetch Posts
  const fetchPosts = useCallback(async () => {
    if (!CURRENT_USER_EMAIL) return;
    setIsLoadingPosts(true);
    setPostsError(null);
    try {
      let dateFrom: string | undefined;
      let dateTo: string | undefined;

      if (filters.dateRange === "today") {
        dateFrom = new Date().toISOString().split("T")[0];
      } else if (filters.dateRange === "yesterday") {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        dateFrom = d.toISOString().split("T")[0];
        dateTo = dateFrom;
      } else if (filters.dateRange === "7days") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        dateFrom = d.toISOString().split("T")[0];
      } else if (filters.dateRange === "30days") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        dateFrom = d.toISOString().split("T")[0];
      }

      const res = await fetchWithRetry(() =>
        allPlatformPostsService.filter({
          email: CURRENT_USER_EMAIL,
          platform: feedPlatform,
          date_from: dateFrom,
          date_to: dateTo,
          intent: filters.intent || undefined,
          industry: filters.industry || undefined,
          team: filters.team || undefined,
          tier: filters.tier || undefined,
          icp: filters.icp || undefined,
          content_type: filters.content_type || undefined,
          product_seeding: filters.product_seeding || undefined,
          id_member: filters.member || undefined,
          search: filters.search || undefined,
          sort: filters.sort,
          page,
          page_size: 15,
        })
      );

      if (res.success && res.data) {
        setPosts(res.data.posts || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      } else {
        setPostsError(res.message || "Không thể tải bài viết.");
      }
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Lỗi khi tải bài viết.");
    } finally {
      setIsLoadingPosts(false);
    }
  }, [CURRENT_USER_EMAIL, feedPlatform, filters, page]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!CURRENT_USER_EMAIL) return;
    try {
      const res = await allPlatformPostsService.getStats({
        email: CURRENT_USER_EMAIL,
        platform: feedPlatform,
      });
      if (res.success && res.data) {
        setStats(res.data as UnifiedStats);
      }
    } catch {}
  }, [CURRENT_USER_EMAIL, feedPlatform]);

  useEffect(() => {
    if (!CURRENT_USER_EMAIL) return;
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!CURRENT_USER_EMAIL) return;
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!CURRENT_USER_EMAIL) return;
    fetchCategories();
  }, [fetchCategories]);

  const handleFilter = useCallback((f: FilterState) => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      setFilters(f);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, []);

  const intents = categories.filter((c) => c.category_type === "intent");
  const industries = categories.filter((c) => c.category_type === "industry");
  const tiers = categories.filter((c) => c.category_type === "tier");
  const icps = categories.filter((c) => c.category_type === "icp");
  const contentTypes = categories.filter((c) => c.category_type === "content_type");
  const productSeedings = categories.filter((c) => c.category_type === "product_seeding");
  const teamCategories: Category[] = teams.map((t) => ({
    id: t.id,
    code: t.name,
    name: t.name,
    category_type: "team",
    platform: "all",
  }));
  
  const isAdmin = user?.role === "admin";
  const isLeader = user?.role === "leader";

  const memberOptions = usersList
    .filter(u => {
      if (isAdmin) return true;
      if (isLeader) {
        if (String(u.id) === String(user?.id)) return true;
        return teams.some(t => String(t.id_leader) === String(user?.id) && t.members?.some(m => String(m.id) === String(u.id)));
      }
      return false;
    })
    .map(u => ({
      id: u.id,
      name: (u as any).full_name || (u as any).name || u.email,
      code: u.email,
    }));

  const fbDiff = stats.totalPostsToday - stats.postsYesterday;

  return (
    <div className="w-full space-y-6">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unified Post Feed</h1>
            <p className="text-sm text-slate-500">
              Quản lý và theo dõi bài viết đa nền tảng với trí tuệ nhân tạo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-slate-100/80 rounded-xl p-1 border border-slate-200/50 flex">
              {([
                { key: "facebook", label: "Facebook" },
                { key: "linkedin", label: "LinkedIn" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setFeedPlatform(t.key); setPage(1); }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer",
                    feedPlatform === t.key
                      ? "bg-[#E3000F] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/40",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (feedPlatform === "linkedin") {
                  setShowCrawlPopup(true);
                } else {
                  setShowFacebookCrawlPopup(true);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer text-white bg-[#E3000F] hover:bg-[#C40009]"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Cào dữ liệu
            </button>

          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="description"
          label="Tổng bài hôm nay"
          value={stats.totalPostsToday}
          trend={{
            value: Math.abs(fbDiff),
            isUp: fbDiff >= 0,
            label: `${fbDiff >= 0 ? "+" : ""}${fbDiff} so với hôm qua`,
          }}
          accent="blue"
        />
        <StatCard
          icon="trending_up"
          label="Tiến độ KPI"
          value={stats.kpiProgress || 0}
          progress={{
            value: stats.kpiProgressPercent || 0,
            label: `${stats.kpiProgressPercent || 0}% trong tập bài`,
          }}
          accent="green"
        />
        <StatCard
          icon="rocket_launch"
          label="Đã Seeded hôm nay"
          value={stats.seededToday}
          sub="Ước tính từ batch hôm nay"
          accent="amber"
        />
        <StatCard
          icon="visibility"
          label="Tổng bài hiển thị"
          value={totalCount}
          sub={`${totalCount} bài trong cơ sở dữ liệu`}
          accent="indigo"
        />
      </div>

      {/* ── KPI Progress Cards ──────────────────────────────────────────────── */}
      {CURRENT_USER_EMAIL && (
        <div className="mb-6 space-y-6">
          <KpiProgressCard
            email={CURRENT_USER_EMAIL}
            type="comment"
          />
          {feedPlatform === "facebook" && (
            <ApiExtensionLauncher
              onComplete={() => {
                fetchPosts();
                fetchStats();
              }}
            />
          )}
        </div>
      )}

      <FilterBar
        intents={intents}
        industries={industries}
        teams={teamCategories}
        tiers={tiers}
        icps={icps}
        contentTypes={contentTypes}
        productSeedings={productSeedings}
        members={memberOptions}
        onFilter={handleFilter}
        isLoading={isLoadingPosts}
      />

      {isLoadingPosts ? (
        <div className="py-12 text-center text-slate-400">Đang tải bài viết...</div>
      ) : postsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {postsError}
          <button type="button" onClick={fetchPosts} className="ml-3 underline">
            Thử lại
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          Không có bài viết nào phù hợp với bộ lọc.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard
                key={post.id || post.post_url}
                post={post}
                userRole={user?.role}
                seeded={!!post.verify_status && post.verify_status !== "no"}
                verifyStatus={post.verify_status as any}
                onSeeding={() => {}}
                onVerify={() => {}}
                onViewDetail={(post) => setDetailModalPost(post)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                ‹ Trước
              </button>
              <span className="text-sm text-slate-600">
                Trang {page} / {totalPages} ({totalCount} bài)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-50 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          )}
        </>
      )}

      <CrawlLinkedInPopup
        open={showCrawlPopup}
        onClose={() => setShowCrawlPopup(false)}
        onSuccess={() => {
          setShowCrawlPopup(false);
          fetchPosts();
          fetchStats();
        }}
      />
      <CrawlFacebookPopup
        open={showFacebookCrawlPopup}
        onClose={() => setShowFacebookCrawlPopup(false)}
        onSuccess={() => {
          setShowFacebookCrawlPopup(false);
          fetchPosts();
          fetchStats();
        }}
      />

      <PostDetailModal
        post={detailModalPost}
        isOpen={!!detailModalPost}
        onClose={() => setDetailModalPost(null)}
        onVerify={(post) => {
          setVerifyModalPost(post);
        }}
        verifyStatus={detailModalPost?.verify_status as any}
      />

      {verifyModalPost && (
        <VerifyAccountModal
          isOpen={!!verifyModalPost}
          onClose={() => setVerifyModalPost(null)}
          postUrl={verifyModalPost.post_url}
          postId={verifyModalPost.id}
          platform={verifyModalPost.platform}
          memberEmail={CURRENT_USER_EMAIL}
        />
      )}
    </div>
  );
}
