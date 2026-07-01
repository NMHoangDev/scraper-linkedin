"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/ui";
import { adminDashboardService, type HighInteractionPost } from "@/services/all-platform.service";

interface AdminUnassignedPostsProps {
  /** Auto-fetch when component mounts (admin opens dashboard) */
  autoFetch?: boolean;
}

export function AdminUnassignedPosts({ autoFetch = true }: AdminUnassignedPostsProps) {
  const [posts, setPosts] = useState<HighInteractionPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const lastFetchedRef = useRef<number | null>(null);

  const fetchPosts = useCallback(
    async (force = false) => {
      // Soft cache: 60s (backend also caches 60s)
      if (!force && lastFetchedRef.current && Date.now() - lastFetchedRef.current < 60_000) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminDashboardService.getHighInteractionUnseeded(10);
        if (res.success && res.data) {
          const data = res.data as unknown as HighInteractionPost[];
          setPosts(Array.isArray(data) ? data : []);
          lastFetchedRef.current = Date.now();
          setLastFetchedAt(Date.now());
        } else {
          setError(res.message || "Không thể tải dữ liệu.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (autoFetch) {
      fetchPosts(true);
    }
  }, [autoFetch, fetchPosts]);

  const handleRefresh = () => fetchPosts(true);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <MaterialIcon name="trending_up" className="text-[#DC2626] text-[18px]" />
          Bài viết có lượt tương tác cao
        </h3>
        <div className="flex items-center gap-2">
          {lastFetchedAt && (
            <span className="text-[10px] text-slate-400 hidden lg:inline">
              {new Date(lastFetchedAt).toLocaleTimeString("vi-VN")}
            </span>
          )}
          <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
            {posts.length} bài viết
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 disabled:opacity-50 transition"
            title="Làm mới"
          >
            <MaterialIcon
              name="refresh"
              className={`text-[14px] ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button onClick={handleRefresh} className="font-bold hover:underline shrink-0">
            Thử lại
          </button>
        </div>
      )}

      <div className="flex flex-col divide-y divide-slate-100 flex-1">
        {isLoading && posts.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
            <MaterialIcon name="hourglass_empty" className="text-2xl animate-pulse" />
            <span className="text-[11px]">Đang tải...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <MaterialIcon name="check_circle" className="text-3xl opacity-30 mb-2" />
            <p className="text-[12px]">Tất cả bài viết đã được seeding.</p>
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.post_id}
              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 hover:bg-slate-50/50 -mx-1 px-1 rounded transition-colors"
            >
              <div className="flex flex-col min-w-0 flex-1">
                <a
                  href={post.post_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sm text-slate-800 hover:text-[#DC2626] truncate mb-1 transition-colors"
                >
                  {post.content || "(Không có nội dung)"}
                </a>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1 truncate max-w-[160px]">
                    <MaterialIcon name="groups" className="text-[12px]" />
                    <span className="truncate">{post.group_name || "Nhóm không xác định"}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <MaterialIcon name="schedule" className="text-[12px]" />
                    {post.time_ago}
                  </span>
                  {post.platform && (
                    <span className="flex items-center gap-1 shrink-0">
                      <MaterialIcon
                        name={post.platform === "facebook" ? "facebook" : "work"}
                        className="text-[12px]"
                      />
                      {post.platform === "facebook" ? "FB" : "LI"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black text-[#DC2626] bg-red-50 px-2 py-0.5 rounded">
                    {post.interactions.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-[10px] text-slate-400">tương tác</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Score {post.score}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
