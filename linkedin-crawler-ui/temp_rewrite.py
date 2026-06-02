import re

file_path = r'd:\CrawlDataLinkedin\linkedin-crawler-ui\components\features\dashboard\UnifiedDashboardHomeContent.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

imports_to_add = """
import { useCallback, useEffect } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { allPlatformPostsService, allPlatformCategoriesService } from "@/services/all-platform.service";
import { FilterBar, type FilterState } from "@/components/all-platform/components/filter-bar";
import { PostCard } from "@/components/all-platform/components/post-card";
import type { UnifiedPost, UnifiedStats, Category, FeedPlatform } from "@/types/unified.types";
"""

new_component = """
export function UnifiedDashboardHomeContent({ hideHeader }: { hideHeader?: boolean }) {
  const { user } = useAppAuth();
  const CURRENT_USER_EMAIL = user?.email || "";

  const [feedPlatform, setFeedPlatform] = useState<FeedPlatform>("facebook");
  const [showCrawlPopup, setShowCrawlPopup] = useState(false);
  const [showFacebookCrawlPopup, setShowFacebookCrawlPopup] = useState(false);

  // States
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [stats, setStats] = useState<UnifiedStats>({
    totalPostsToday: 0,
    postsYesterday: 0,
    highScoreCount: 0,
    highScorePercent: 0,
    seededToday: 0,
  });
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter & Taxonomy States
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    intent: "",
    industry: "",
    team: "",
    tier: "",
    icp: "",
    sort: "latest",
    dateRange: "",
  });

  // Fetch Taxonomy
  const fetchCategories = useCallback(async () => {
    try {
      const res = await allPlatformCategoriesService.getAllCategories(CURRENT_USER_EMAIL);
      if (res.success && res.data) setCategories(res.data as Category[]);
    } catch {}
  }, [CURRENT_USER_EMAIL]);

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

      const res = await allPlatformPostsService.filter({
        email: CURRENT_USER_EMAIL,
        platform: feedPlatform,
        date_from: dateFrom,
        date_to: dateTo,
        intent: filters.intent || undefined,
        industry: filters.industry || undefined,
        team: filters.team || undefined,
        tier: filters.tier ? parseInt(filters.tier) : undefined,
        icp: filters.icp || undefined,
        search: filters.search || undefined,
        sort: filters.sort,
        page,
        page_size: 15,
      });

      if (res.success && res.data) {
        setPosts(res.data.items);
        setTotalCount(res.data.total_count);
        setTotalPages(res.data.total_pages);
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
    setFilters(f);
    setPage(1);
  }, []);

  const intents = categories.filter((c) => c.category_type === "intent");
  const industries = categories.filter((c) => c.category_type === "industry");
  const icps = categories.filter((c) => c.category_type === "icp");
  const teams: Category[] = [];

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
          label="Điểm cao (≥70)"
          value={stats.highScoreCount}
          progress={{
            value: stats.highScorePercent,
            label: `${stats.highScorePercent}% trong tập bài`,
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

      <FilterBar
        intents={intents}
        industries={industries}
        teams={teams}
        icps={icps}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <PostCard
                key={post.id || post.post_url}
                post={post}
                seeded={false}
                verifyStatus={undefined}
                onSeeding={() => {}}
                onVerify={() => {}}
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
        onSuccess={() => setShowCrawlPopup(false)}
      />
      <CrawlFacebookPopup
        open={showFacebookCrawlPopup}
        onClose={() => setShowFacebookCrawlPopup(false)}
        onSuccess={() => setShowFacebookCrawlPopup(false)}
      />
    </div>
  );
}
"""

func_start = content.find('export function UnifiedDashboardHomeContent')
if func_start != -1:
    content_before = content[:func_start]
    last_import = content_before.rfind('import ')
    end_of_last_import = content_before.find('\n', last_import) + 1
    final_content = content_before[:end_of_last_import] + imports_to_add + content_before[end_of_last_import:] + new_component
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(final_content)
    print("Successfully replaced UnifiedDashboardHomeContent")
else:
    print("Could not find UnifiedDashboardHomeContent")
