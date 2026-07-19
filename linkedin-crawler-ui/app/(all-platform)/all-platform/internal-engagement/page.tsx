"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppAuth } from "@/contexts/AppAuthContext";
import { API_BASE_URL } from "@/lib/env";
import {
  internalEngagementService,
  socialAccountsService,
} from "@/services/all-platform.service";
import type {
  InternalEngagementInteraction,
  InternalEngagementMarkStatus,
  InternalEngagementPost,
  InternalEngagementPostTeamCount,
  InternalEngagementTeamRef,
  SocialAccount,
} from "@/types/unified.types";
import { useQuickCommentLibrary } from "@/components/all-platform/components/use-quick-comment-library";
import { TeamPerformancePanel } from "@/components/all-platform/internal-engagement/TeamPerformancePanel";

type TaskStatusTab = "all" | "need" | "received" | "completed";

function fmtRelativeTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Vừa đăng";
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
}

export default function InternalEngagementPage() {
  const { user } = useAppAuth();
  const [toast, setToast] = useState<string | null>(null);

  const [tab, setTab] = useState<TaskStatusTab>("all");
  const [search, setSearch] = useState("");

  const [posts, setPosts] = useState<InternalEngagementPost[]>([]);
  const [marks, setMarks] = useState<Record<string, InternalEngagementMarkStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [modalPost, setModalPost] = useState<InternalEngagementPost | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isExtensionReady, setIsExtensionReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState<string | null>(null);

  // Bulk multi-select — chỉ áp dụng trong trang này.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCommentText, setBulkCommentText] = useState("");

  // Team visibility (admin/leader): badge counts under each post + "xem tương tác thành viên" modal.
  const canSeeTeamInteractions = user?.role === "admin" || user?.role === "leader";
  const [teamCounts, setTeamCounts] = useState<Record<string, InternalEngagementPostTeamCount[]>>({});
  const [interactionsPost, setInteractionsPost] = useState<InternalEngagementPost | null>(null);
  const [interactionsRole, setInteractionsRole] = useState<string>("member");
  const [interactionsTeams, setInteractionsTeams] = useState<InternalEngagementTeamRef[]>([]);
  const [interactionsItems, setInteractionsItems] = useState<InternalEngagementInteraction[]>([]);
  const [interactionsTeamFilter, setInteractionsTeamFilter] = useState<string>("all");
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);

  const { libraryItems: commentTemplates } = useQuickCommentLibrary("facebook");
  const commentTemplateGroups = useMemo(() => {
    const groups = new Map<string, { label: string; templates: typeof commentTemplates }>();
    commentTemplates.forEach((item) => {
      const label = item.label || "Khác";
      if (!groups.has(label)) groups.set(label, { label, templates: [] });
      groups.get(label)!.templates.push(item);
    });
    return Array.from(groups.values());
  }, [commentTemplates]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 4500);
  };

  const loadPosts = async () => {
    setIsLoading(true);
    setLoadError(null);
    const res = await internalEngagementService.listPosts(1, 50, user?.email);
    if (!res.success || !res.data) {
      setLoadError(res.message || "Không tải được danh sách bài viết từ MarkeeAI.");
      setIsLoading(false);
      return;
    }
    const items = res.data.items || [];
    setPosts(items);

    if (user?.email && items.length > 0) {
      const linkPosts = items.map((p) => p.permalink_url).filter(Boolean) as string[];
      const marksRes = await internalEngagementService.getMyMarks(user.email, linkPosts);
      if (marksRes.success && marksRes.data) {
        setMarks(marksRes.data.marks || {});
      }
    }
    setIsLoading(false);
  };

  // Admin/leader: badge "Team X: N tương tác" hiển thị dưới mỗi bài.
  useEffect(() => {
    if (!user?.email || !canSeeTeamInteractions || posts.length === 0) return;
    let cancelled = false;

    Promise.all(
      posts
        .filter((p) => p.permalink_url)
        .map((p) =>
          internalEngagementService
            .getPostTeamCounts(p.permalink_url as string, user.email)
            .then((res) => [p.id, res.success && res.data ? res.data.teams : []] as const),
        ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, InternalEngagementPostTeamCount[]> = {};
      results.forEach(([postId, teams]) => {
        map[postId] = teams;
      });
      setTeamCounts(map);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, user?.email, canSeeTeamInteractions]);

  const openInteractionsModal = async (post: InternalEngagementPost, teamId?: string) => {
    if (!user?.email || !post.permalink_url) return;
    setInteractionsPost(post);
    setInteractionsTeamFilter(teamId || "all");
    setIsLoadingInteractions(true);
    const res = await internalEngagementService.getPostInteractions(
      post.permalink_url,
      user.email,
      teamId === "all" ? undefined : teamId,
    );
    if (res.success && res.data) {
      setInteractionsRole(res.data.role);
      setInteractionsTeams(res.data.teams);
      setInteractionsItems(res.data.items);
    } else {
      showToast(res.message || "Không tải được danh sách tương tác.");
    }
    setIsLoadingInteractions(false);
  };

  const changeInteractionsTeamFilter = async (teamId: string) => {
    if (!interactionsPost) return;
    setInteractionsTeamFilter(teamId);
    await openInteractionsModal(interactionsPost, teamId);
  };

  const closeInteractionsModal = () => {
    setInteractionsPost(null);
    setInteractionsItems([]);
    setInteractionsTeams([]);
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    socialAccountsService.getAll("facebook").then((res) => {
      if (res.data) {
        setSocialAccounts(res.data);
        if (res.data.length > 0) setSelectedAccountId(res.data[0].id);
      }
    });
  }, []);

  // Theo dõi kết quả (thành công/lỗi) của lần comment gần nhất qua sự kiện
  // BULK_COMMENT_PROGRESS, để lúc BULK_COMMENT_DONE biết chính xác nên báo
  // thành công hay báo lỗi thật — trước đây luôn báo "Đã gửi..." dù extension
  // thực ra bị lỗi (im lặng thất bại).
  const lastResultRef = useRef<{ success: boolean; error?: string } | null>(null);

  // Comment-extension bridge (same postMessage handshake as bulk-comment-launcher)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const action = event.data?.action;
      if (action === "COMMENT_EXTENSION_READY") {
        setIsExtensionReady(true);
      } else if (action === "BULK_COMMENT_STARTED") {
        setIsRunning(true);
        setRunProgress("Đang mở bài viết...");
        lastResultRef.current = null;
      } else if (action === "BULK_COMMENT_PROGRESS") {
        setRunProgress(event.data.payload?.status || null);
        if (event.data.payload?.result) lastResultRef.current = event.data.payload.result;
      } else if (action === "BULK_COMMENT_DONE") {
        setIsRunning(false);
        setRunProgress(null);
        setModalPost(null);
        setCommentText("");
        setBulkCommentText("");
        setSelectMode(false);
        setSelectedIds(new Set());
        if (lastResultRef.current && lastResultRef.current.success === false) {
          showToast(`Comment thất bại: ${lastResultRef.current.error || "Lỗi không xác định"}`);
        } else {
          showToast("Đã gửi comment thành công. Hệ thống đã ghi nhận KPI.");
        }
        loadPosts();
      }
    };

    window.addEventListener("message", handleMessage);
    const interval = window.setInterval(() => {
      if (!isExtensionReady) window.postMessage({ action: "PING_COMMENT_EXTENSION" }, "*");
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtensionReady]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const link = p.permalink_url || "";
      const status = marks[link] || "need";
      if (tab !== "all" && tab !== status) return false;
      if (!q) return true;
      return `${p.content} ${p.fanpage_name || ""}`.toLowerCase().includes(q);
    });
  }, [posts, marks, tab, search]);

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, search]);

  const pagedPosts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPosts.slice(start, start + PAGE_SIZE);
  }, [filteredPosts, currentPage]);

  const openModal = (post: InternalEngagementPost) => {
    setModalPost(post);
    setCommentText("");
  };

  const closeModal = () => {
    if (isRunning) return;
    setModalPost(null);
  };

  const buildVerifyConfig = () => ({
    apiBase: API_BASE_URL,
    email_member: user?.email,
    id_social_account: selectedAccountId || undefined,
    id_platform: 1,
    mode: "internal_engagement" as const,
  });

  const sendComment = () => {
    if (!modalPost?.permalink_url) return;
    if (!commentText.trim()) return showToast("Vui lòng nhập nội dung comment.");
    if (!isExtensionReady) return showToast("Chưa kết nối được Extension. Vui lòng cài đặt và tải lại trang.");
    if (!user?.email) {
      return showToast("Chưa xác định được tài khoản đăng nhập — tải lại trang trước khi comment (nếu không KPI sẽ không được ghi nhận).");
    }

    window.postMessage(
      {
        action: "START_BULK_COMMENT",
        payload: {
          posts: [
            {
              url: modalPost.permalink_url,
              id_post: modalPost.facebook_post_id,
              fanpage_id: modalPost.fanpage_id,
              fanpage_name: modalPost.fanpage_name,
            },
          ],
          text: commentText,
          verifyConfig: buildVerifyConfig(),
        },
      },
      "*",
    );
  };

  const toggleSelected = (postId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const selectedPosts = useMemo(
    () => filteredPosts.filter((p) => selectedIds.has(p.id) && p.permalink_url),
    [filteredPosts, selectedIds],
  );

  const runBulkComment = () => {
    if (selectedPosts.length === 0) return showToast("Chưa chọn bài viết nào.");
    if (!bulkCommentText.trim()) return showToast("Vui lòng nhập nội dung comment.");
    if (!isExtensionReady) return showToast("Chưa kết nối được Extension. Vui lòng cài đặt và tải lại trang.");
    if (!user?.email) {
      return showToast("Chưa xác định được tài khoản đăng nhập — tải lại trang trước khi comment (nếu không KPI sẽ không được ghi nhận).");
    }

    window.postMessage(
      {
        action: "START_BULK_COMMENT",
        payload: {
          posts: selectedPosts.map((p) => ({
            url: p.permalink_url,
            id_post: p.facebook_post_id,
            fanpage_id: p.fanpage_id,
            fanpage_name: p.fanpage_name,
          })),
          text: bulkCommentText,
          verifyConfig: buildVerifyConfig(),
        },
      },
      "*",
    );
  };

  const tabCounts = useMemo(() => {
    const counts: Record<TaskStatusTab, number> = { all: posts.length, need: 0, received: 0, completed: 0 };
    posts.forEach((p) => {
      const status = marks[p.permalink_url || ""] || "need";
      counts[status] += 1;
    });
    return counts;
  }, [posts, marks]);

  return (
    <div className="w-full bg-[#f7f8fb] text-[#252733]">
      <div className="min-h-screen">
        {/* HEADER/HERO */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e7e9ef] h-[58px] flex items-center justify-between px-6">
          <div className="font-black text-[17px]">Tương tác nội bộ</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border border-[#e7e9ef] bg-white rounded-xl p-2"
              aria-label="refresh"
              onClick={() => loadPosts()}
            >
              🔄
            </button>
            <div className="w-[34px] h-[34px] rounded-full bg-[#f1d4dc] grid place-items-center text-[#c71f4d] font-extrabold">M</div>
          </div>
        </div>

        <div className="max-w-[1700px] mx-auto p-5">
          <div className="flex justify-between gap-[18px] items-start mb-4">
            <div>
              <h1 className="text-[24px] m-0 mb-[7px] font-extrabold">Trung tâm hỗ trợ tương tác nội bộ</h1>
              <p className="m-0 text-[#737785] text-[14px]">
                Bài đã đăng trên Fanpage Facebook của công ty (kéo trực tiếp từ MarkeeAI) — comment thật qua Extension.
              </p>
            </div>
            <button
              type="button"
              className={`px-[14px] py-[10px] rounded-xl font-bold text-[13px] border ${
                selectMode ? "bg-[#c71f4d] text-white border-[#c71f4d]" : "bg-white border-[#e7e9ef] text-[#3a3d47]"
              }`}
              onClick={() => {
                setSelectMode((v) => !v);
                setSelectedIds(new Set());
              }}
            >
              {selectMode ? "Thoát chọn nhiều" : "Chọn nhiều để comment hàng loạt"}
            </button>
          </div>

          {loadError ? (
            <div className="bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] rounded-xl p-3 text-[13px] mb-4">
              {loadError}
            </div>
          ) : null}

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Bài cần làm</div>
              <div className="text-[24px] font-extrabold">{tabCounts.need}</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Đã nhận, chờ comment</div>
              <div className="text-[24px] font-extrabold">{tabCounts.received}</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Đã tương tác</div>
              <div className="text-[24px] font-extrabold">{tabCounts.completed}</div>
            </div>
          </div>

          {canSeeTeamInteractions ? <TeamPerformancePanel email={user?.email} /> : null}

          {/* Bulk action bar */}
          {selectMode ? (
            <div className="bg-white border border-[#efb2c3] rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(20,25,40,.08)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold">
                  Đã chọn {selectedIds.size} bài viết
                </div>
                <div
                  className={`text-[12px] px-2 py-1 rounded-lg ${
                    isExtensionReady ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isExtensionReady ? "Extension sẵn sàng" : "Chưa kết nối Extension"}
                </div>
              </div>

              <label className="text-[12px] font-extrabold block mb-2">Comment hàng loạt:</label>
              <textarea
                value={bulkCommentText}
                onChange={(e) => setBulkCommentText(e.target.value)}
                disabled={isRunning}
                className="w-full border border-[#dde0e7] rounded-xl px-3 py-2 outline-none min-h-[80px] resize-y"
                placeholder="Nội dung comment áp dụng cho tất cả bài đã chọn..."
              />
              <button
                type="button"
                className="mt-2 px-[14px] py-[8px] rounded-xl bg-[#c71f4d] text-white text-[12px] font-bold disabled:opacity-50"
                onClick={runBulkComment}
                disabled={isRunning || selectedIds.size === 0 || !isExtensionReady}
              >
                Comment hàng loạt cho {selectedIds.size} bài
              </button>

              {runProgress ? <div className="mt-3 text-[12px] text-[#c71f4d] font-semibold">{runProgress}</div> : null}
            </div>
          ) : null}

          {/* Main list */}
          <div className="bg-white border border-[#e7e9ef] rounded-2xl shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)] overflow-hidden">
            <div className="p-[15px] px-4 border-b border-[#e7e9ef] flex items-center justify-between">
              <h3 className="m-0 text-[15px] font-bold">Bài viết Fanpage công ty</h3>
              <div className="flex gap-2">
                {(
                  [
                    { key: "all", label: "Tất cả" },
                    { key: "need", label: "Cần làm" },
                    { key: "received", label: "Đã nhận" },
                    { key: "completed", label: "Đã tương tác" },
                  ] as { key: TaskStatusTab; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`px-[10px] py-[7px] rounded-lg text-[12px] font-bold border transition ${
                      tab === t.key
                        ? "bg-[#c71f4d] text-white border-[#c71f4d]"
                        : "bg-white text-[#3a3d47] border-[#dde0e7] hover:border-[#c71f4d]"
                    }`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label} ({tabCounts[t.key]})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 border-b border-[#e7e9ef]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a] w-full max-w-md"
                placeholder="🔎 Tìm nội dung bài viết, fanpage..."
              />
            </div>

            <div className="p-3">
              {isLoading ? (
                <div className="p-6 text-center text-[#737785] text-sm">Đang tải bài viết từ MarkeeAI...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="p-6 text-center text-[#737785] text-sm">Không có bài viết nào trong mục này.</div>
              ) : (
                pagedPosts.map((post) => {
                  const status = marks[post.permalink_url || ""] || "need";
                  const isSelected = selectedIds.has(post.id);
                  return (
                    <article
                      key={post.id}
                      className={`border rounded-xl p-4 mb-2 transition ${
                        isSelected ? "border-[#c71f4d] bg-[#fff8f9]" : "border-[#e7e9ef] hover:border-[#efb2c3]"
                      }`}
                    >
                      <div className="flex gap-3">
                        {selectMode ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(post.id)}
                            className="mt-2"
                          />
                        ) : null}
                        <div className="w-[38px] h-[38px] rounded-xl grid place-items-center font-extrabold text-white flex-shrink-0 bg-[#1877f2]">
                          f
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] rounded-lg px-1.5 py-1 bg-[#eef2ff] text-[#4f46e5]">{post.fanpage_name || "Fanpage"}</span>
                            <span className="text-[11px] text-[#9aa0ab]">{fmtRelativeTime(post.created_at)}</span>
                            {status === "completed" ? (
                              <span className="text-[10px] rounded-lg px-1.5 py-0.5 bg-[#eafaf3] text-[#087a50] font-bold">
                                ✓ Đã tương tác
                              </span>
                            ) : null}
                          </div>

                          <div className="text-[13px] text-[#252733] leading-[1.45] mt-2 mb-3 line-clamp-3 overflow-hidden whitespace-pre-wrap">
                            {post.content || "(Bài viết không có nội dung văn bản)"}
                          </div>

                          {post.media_urls && post.media_urls.length > 0 ? (
                            <div className="flex gap-2 mb-3 overflow-x-auto">
                              {post.media_urls.slice(0, 4).map((url, idx) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={idx}
                                  src={url}
                                  alt=""
                                  className="w-20 h-20 object-cover rounded-lg border border-[#e7e9ef] flex-shrink-0"
                                />
                              ))}
                            </div>
                          ) : null}

                          {canSeeTeamInteractions ? (
                            <div className="flex items-center gap-1.5 flex-wrap mb-3">
                              {(teamCounts[post.id] || [])
                                .filter((t) => t.count > 0)
                                .map((t) => (
                                  <span
                                    key={t.team_id}
                                    className="text-[10px] rounded-lg px-1.5 py-1 bg-[#f5f6f8] text-[#5d616c] font-semibold"
                                  >
                                    {t.team_name}: {t.count} tương tác
                                  </span>
                                ))}
                              <button
                                type="button"
                                onClick={() => openInteractionsModal(post)}
                                className="text-[10px] font-bold text-[#4f46e5] hover:underline"
                              >
                                Xem tương tác thành viên →
                              </button>
                            </div>
                          ) : null}

                          <div className="flex justify-between items-center gap-3 flex-wrap">
                            <a
                              href={post.permalink_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[#4f46e5] hover:underline"
                            >
                              Xem bài viết gốc ↗
                            </a>

                            <div className="flex items-center gap-2 flex-wrap">
                              {status !== "completed" ? (
                                <button
                                  type="button"
                                  className="px-[10px] py-[7px] rounded-xl border border-[#c71f4d] bg-[#c71f4d] text-white text-[12px] font-bold"
                                  onClick={() => openModal(post)}
                                >
                                  Comment ngay
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {filteredPosts.length > 0 ? (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#e7e9ef]">
                <div className="text-[12px] text-[#737785]">
                  Trang {currentPage}/{totalPages} — {filteredPosts.length} bài
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#e7e9ef] bg-white text-[12px] font-semibold disabled:opacity-40"
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-[#e7e9ef] bg-white text-[12px] font-semibold disabled:opacity-40"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Comment modal — real comment via Chrome extension */}
        {modalPost ? (
          <div
            className="fixed inset-0 bg-[rgba(25,27,35,.42)] flex items-center justify-center z-[30] p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="w-[min(700px,100%)] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,.25)] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-[#e7e9ef]">
                <div>
                  <b className="text-base">Comment vào bài viết Fanpage</b>
                  <div className="text-[12px] text-[#777] mt-1">Thực hiện qua Chrome Extension trên tài khoản Facebook đang đăng nhập</div>
                </div>
                <button type="button" className="border-0 bg-[#f2f3f6] rounded-lg px-[10px] py-[7px]" onClick={closeModal} aria-label="close">✕</button>
              </div>

              <div className="p-5">
                <div
                  className={`p-3 rounded-xl border text-[12px] mb-4 flex items-center gap-2 ${
                    isExtensionReady ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  {isExtensionReady ? "Extension đã sẵn sàng." : "Đang chờ kết nối Extension. Vui lòng cài đặt và F5 lại trang."}
                </div>

                <div className="text-[13px] text-[#5d616c] mb-3 line-clamp-3">{modalPost.content}</div>

                {socialAccounts.length > 0 ? (
                  <div className="mb-3">
                    <label className="text-[12px] font-extrabold block mb-2">Tài khoản Facebook dùng để comment:</label>
                    <select
                      className="w-full border border-[#dde0e7] rounded-xl px-3 py-2"
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      disabled={isRunning}
                    >
                      <option value="">-- Tự do (dùng acc đang đăng nhập FB) --</option>
                      {socialAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_name} {acc.account_email ? `(${acc.account_email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-extrabold">Nội dung comment:</label>
                  <button
                    type="button"
                    onClick={() => setIsTemplatePickerOpen((v) => !v)}
                    disabled={isRunning}
                    className="text-[12px] font-semibold text-[#c71f4d] hover:underline"
                  >
                    Chọn mẫu câu
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isRunning}
                    className="w-full border border-[#dde0e7] rounded-xl px-3 py-2 outline-none min-h-[110px] resize-y"
                    placeholder="Nhập nội dung comment thật sẽ đăng lên bài viết này..."
                  />
                  {isTemplatePickerOpen ? (
                    <div className="absolute right-0 top-1 z-20 w-80 max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {commentTemplateGroups.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500">Chưa có mẫu nào. Vào trang Quick Comment Library để thêm.</div>
                      ) : (
                        commentTemplateGroups.map((group) => (
                          <div key={group.label}>
                            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50/70">{group.label}</div>
                            {group.templates.map((template) => (
                              <button
                                key={template.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-slate-100 last:border-0 transition"
                                onClick={() => {
                                  setCommentText(template.content);
                                  setIsTemplatePickerOpen(false);
                                }}
                              >
                                <div className="text-xs font-semibold text-slate-800">{template.title}</div>
                                <div className="text-[11px] text-slate-500 line-clamp-2">{template.content}</div>
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>

                {runProgress ? (
                  <div className="mt-3 text-[12px] text-[#c71f4d] font-semibold">{runProgress}</div>
                ) : null}
              </div>

              <div className="p-4 border-t border-[#e7e9ef] flex justify-end gap-2">
                <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl px-4 py-2 font-extrabold" onClick={closeModal} disabled={isRunning}>
                  Để sau
                </button>
                <button
                  type="button"
                  className="bg-[#c71f4d] text-white border border-[#c71f4d] rounded-xl px-4 py-2 font-extrabold disabled:opacity-50"
                  onClick={sendComment}
                  disabled={isRunning || !isExtensionReady || !commentText.trim()}
                >
                  {isRunning ? "Đang gửi..." : "Gửi comment qua Extension"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* "Xem tương tác thành viên" modal */}
        {interactionsPost ? (
          <div
            className="fixed inset-0 bg-[rgba(25,27,35,.42)] flex items-center justify-center z-[30] p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeInteractionsModal();
            }}
          >
            <div className="w-[min(640px,100%)] max-h-[85vh] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,.25)] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-[#e7e9ef]">
                <div>
                  <b className="text-base">Tương tác thành viên</b>
                  <div className="text-[12px] text-[#777] mt-1 line-clamp-1">{interactionsPost.content}</div>
                </div>
                <button type="button" className="border-0 bg-[#f2f3f6] rounded-lg px-[10px] py-[7px]" onClick={closeInteractionsModal} aria-label="close">✕</button>
              </div>

              {interactionsRole === "admin" && interactionsTeams.length > 1 ? (
                <div className="px-4 pt-3">
                  <select
                    value={interactionsTeamFilter}
                    onChange={(e) => changeInteractionsTeamFilter(e.target.value)}
                    className="border border-[#dde0e7] rounded-xl px-3 py-2 text-[13px] w-full"
                  >
                    <option value="all">Tất cả team</option>
                    {interactionsTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name_team}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="p-4 overflow-y-auto flex-1">
                {isLoadingInteractions ? (
                  <div className="p-6 text-center text-[#737785] text-sm">Đang tải...</div>
                ) : interactionsItems.length === 0 ? (
                  <div className="p-6 text-center text-[#737785] text-sm">Chưa có tương tác nào cho bài này.</div>
                ) : (
                  <div className="space-y-2">
                    {interactionsItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-3 ${
                          item.is_caller ? "border-[#bfdbfe] bg-[#eff6ff]" : "border-[#e7e9ef]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="font-bold text-[13px]">
                            {item.member_name}
                            {item.is_caller ? <span className="ml-1 text-[10px] font-semibold text-[#2563eb]">(bạn)</span> : null}
                          </span>
                          {item.team_name ? (
                            <span className="text-[10px] rounded-lg px-1.5 py-0.5 bg-[#eef2ff] text-[#4f46e5] font-semibold">
                              {item.team_name}
                            </span>
                          ) : null}
                          <span className="text-[10px] text-[#9aa0ab] ml-auto">{fmtRelativeTime(item.created_at)}</span>
                        </div>
                        <div className="text-[13px] text-[#5d616c]">{item.summary}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Toast */}
        {toast ? (
          <div className="fixed right-6 bottom-6 px-4 py-3 rounded-xl bg-[#1f2937] text-white text-[13px] font-semibold shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
