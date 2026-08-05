"use client";

<<<<<<< HEAD
import { useMemo, useState } from "react";

type Platform = "Facebook" | "YouTube" | "LinkedIn" | "TikTok";

type Priority = "Ưu tiên cao" | "Bình thường";

type TaskStatusTab = "need" | "received" | "completed";

type SortMode = "deadline" | "latest";

type UiTask = {
  id: string;
  platform: Platform;
  title: string;
  priority: Priority;
  team: string;
  kpiPointsTag: string;
  description: string;
  // progress
  progressPercent: number;
  // metrics
  metrics: {
    left: string;
    comment: string;
    share: string;
    deadlineText: string;
  };
  // tags
  campaign: string;
  // overdue
  overdue: boolean;
};

type ModalState = {
  open: boolean;
  platform: Platform | null;
  title: string;
  evidenceNote: string;
  checks: {
    like: boolean;
    comment: boolean;
    share: boolean;
    inbox: boolean;
  };
};

const PLATFORM_ICON_BG: Record<Platform, { className: string; label: string }> = {
  Facebook: { className: "bg-[#1877f2]", label: "f" },
  YouTube: { className: "bg-[#ff0000]", label: "▶" },
  LinkedIn: { className: "bg-[#0a66c2]", label: "in" },
  TikTok: { className: "bg-[#111]", label: "♪" },
};

function clampText2Lines(text: string) {
  return text;
}

function platformGradientClasses(platform: Platform) {
  if (platform === "Facebook") return "bg-[#1877f2]";
  if (platform === "YouTube") return "bg-[#ff0000]";
  if (platform === "LinkedIn") return "bg-[#0a66c2]";
  if (platform === "TikTok") return "bg-[#111]";
  return "bg-[#111]";
}

export default function InternalEngagementPage() {
  // Sidebar badge count is static for UI parity with sample
  const [toast, setToast] = useState<string | null>(null);

  const [tab, setTab] = useState<TaskStatusTab>("need");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [sortMode, setSortMode] = useState<SortMode>("deadline");

  const [claimState, setClaimState] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState<ModalState>({
    open: false,
    platform: null,
    title: "",
    evidenceNote: "",
    checks: {
      like: false,
      comment: false,
      share: false,
      inbox: false,
    },
  });

  const tasks: UiTask[] = useMemo(
    () => [
      {
        id: "fb-1",
        platform: "Facebook",
        title: "Markee AI ra mắt tính năng tạo nội dung đa kênh",
        priority: "Ưu tiên cao",
        team: "Team Product",
        kpiPointsTag: "10 điểm",
        description:
          "Hỗ trợ tăng tín hiệu tương tác tự nhiên cho bài ra mắt sản phẩm. Nội dung comment cần đúng ngữ cảnh, tránh lặp và không dùng một mẫu cho nhiều tài khoản.",
        progressPercent: 55,
        metrics: {
          left: "👍 46 / 80",
          comment: "💬 12 / 30",
          share: "↗ 8 / 20",
          deadlineText: "⏱ Còn 2 giờ",
        },
        campaign: "Markee AI",
        overdue: true,
      },
      {
        id: "yt-1",
        platform: "YouTube",
        title: "Video demo quy trình Marketing tự động trong 15 phút",
        priority: "Ưu tiên cao",
        team: "Team Video",
        kpiPointsTag: "12 điểm",
        description:
          "Xem tối thiểu 70% video, bấm thích và để lại bình luận mang tính thảo luận. Không dùng comment quá ngắn như “hay”, “tốt”.",
        progressPercent: 46,
        metrics: {
          left: "▶ 31 / 60 lượt xem",
          comment: "👍 24 / 50",
          share: "💬 9 / 25",
          deadlineText: "⏱ Còn 6 giờ",
        },
        campaign: "Website SME",
        overdue: false,
      },
      {
        id: "li-1",
        platform: "LinkedIn",
        title: "Case study Hilab: Chuẩn hóa vận hành Marketing bằng AI",
        priority: "Bình thường",
        team: "B2B Growth",
        kpiPointsTag: "8 điểm",
        description:
          "Ưu tiên comment có góc nhìn chuyên môn, chia sẻ kinh nghiệm vận hành hoặc đặt câu hỏi liên quan. Thành viên có profile phù hợp B2B sẽ được ưu tiên.",
        progressPercent: 42,
        metrics: {
          left: "👍 18 / 40",
          comment: "💬 7 / 15",
          share: "↗ 3 / 10",
          deadlineText: "⏱ Còn 1 ngày",
        },
        campaign: "Markee AI",
        overdue: false,
      },
      {
        id: "tt-1",
        platform: "TikTok",
        title: "3 lỗi khiến website doanh nghiệp không ra khách hàng",
        priority: "Bình thường",
        team: "Content Squad",
        kpiPointsTag: "6 điểm",
        description:
          "Xem hết video, like và comment theo góc nhìn người dùng. Có thể gợi mở câu hỏi về tốc độ tải trang, SEO hoặc tỷ lệ chuyển đổi.",
        progressPercent: 62,
        metrics: {
          left: "▶ 63 / 100",
          comment: "👍 51 / 80",
          share: "💬 14 / 25",
          deadlineText: "⏱ Còn 2 ngày",
        },
        campaign: "Website SME",
        overdue: false,
      },
    ],
    [],
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();

    let out = tasks.filter((t) => {
      const okText = `${t.title} ${t.description} ${t.team} ${t.kpiPointsTag}`.toLowerCase().includes(q);
      const okPlatform = platformFilter === "all" ? true : t.platform === platformFilter;
      const okCampaign = campaignFilter === "all" ? true : t.campaign === campaignFilter;
      const okPriority = priorityFilter === "all" ? true : t.priority === priorityFilter;

      return okText && okPlatform && okCampaign && okPriority;
    });

    // Tabs are visual-only in mock.
    if (tab === "received") {
      out = out.filter((t) => !!claimState[t.id]);
    } else if (tab === "completed") {
      out = out.filter((t) => !!claimState[t.id] && t.progressPercent >= 60);
    } // tab === need => keep all

    if (sortMode === "deadline") {
      out = [...out].sort((a, b) => (a.overdue === b.overdue ? b.progressPercent - a.progressPercent : a.overdue ? -1 : 1));
    } else {
      // latest mock: keep original but nudge
      out = [...out].sort((a, b) => b.id.localeCompare(a.id));
    }

    return out;
  }, [tasks, search, platformFilter, campaignFilter, priorityFilter, sortMode, tab, claimState]);

  const showToast = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2600);
  };

  const openModal = (platform: Platform, title: string) => {
    setModal({
      open: true,
      platform,
      title,
      evidenceNote: "",
      checks: { like: false, comment: false, share: false, inbox: false },
    });
  };

  const closeModal = () => {
    setModal((m) => ({ ...m, open: false }));
  };

  const claimTask = (taskId: string) => {
    setClaimState((prev) => ({ ...prev, [taskId]: true }));
    showToast("Đã nhận nhiệm vụ. Hệ thống giữ chỗ trong 30 phút.");
  };

  const completeTask = () => {
    closeModal();
    showToast("Đã gửi xác nhận. KPI sẽ được ghi nhận sau khi đối soát.");
=======
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
type SourceTab = "markee" | "custom";

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

  // Tabs
  const [tab, setTab] = useState<TaskStatusTab>("all");
  const [sourceTab, setSourceTab] = useState<SourceTab>("markee");
  const [search, setSearch] = useState("");

  // Data
  const [posts, setPosts] = useState<InternalEngagementPost[]>([]);
  const [customPosts, setCustomPosts] = useState<InternalEngagementPost[]>([]);
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

  // Bulk multi-select
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCommentText, setBulkCommentText] = useState("");

  // Link thủ công
  const [customLink, setCustomLink] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  // Team visibility
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
    
    try {
      // Gọi song song 2 API
      const [res, customRes] = await Promise.all([
        internalEngagementService.listPosts(1, 50, user?.email),
        internalEngagementService.listCustomPosts(1, 50),
      ]);

      const markeeItems = res.success && res.data ? res.data.items || [] : [];
      
      // Lấy data thủ công và chuẩn hóa dữ liệu
      const customItemsRaw = customRes.success && customRes.data ? customRes.data.items || [] : [];
      const customItems = customItemsRaw.map((item: any) => ({
        ...item,
        permalink_url: item.permalink_url || item.post_url || item.link_post,
        fanpage_name: item.fanpage_name || item.page_name || "Markee AI Marketing",
        content: item.content || "(Bài viết không có nội dung văn bản)",
        media_urls: Array.isArray(item.media_urls)
          ? item.media_urls
          : item.media_url
          ? [item.media_url]
          : [],
        created_at: item.created_at || item.published_at,
      })) as InternalEngagementPost[];

      setPosts(markeeItems);
      setCustomPosts(customItems);

      if (user?.email) {
        // Gộp tất cả link từ cả 2 nguồn để check marks 1 lần
        const allLinks = [
          ...markeeItems.map((p) => p.permalink_url),
          ...customItems.map((p) => p.permalink_url)
        ].filter(Boolean) as string[];

        if (allLinks.length > 0) {
          const marksRes = await internalEngagementService.getMyMarks(user.email, allLinks);
          if (marksRes.success && marksRes.data) {
            setMarks(marksRes.data.marks || {});
          }
        }
      }
    } catch (error) {
      setLoadError("Lỗi khi tải danh sách bài viết.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitCustomLink = async () => {
    if (!customLink.trim()) return showToast("Vui lòng nhập link bài viết Facebook.");
    if (!user?.email) return showToast("Chưa xác định được tài khoản đăng nhập.");

    setIsSubmittingLink(true);
    try {
      const res = await internalEngagementService.addCustomPost(customLink.trim(), user.email);
      if (res && res.success) {
        showToast("Đã thêm bài viết thủ công thành công!");
        setCustomLink("");
        setSourceTab("custom"); // Tự động chuyển qua tab thủ công
        loadPosts(); 
      } else {
        showToast(res?.message || "Lỗi khi thêm bài viết.");
      }
    } catch (error) {
      showToast("Có lỗi xảy ra khi gửi yêu cầu.");
    } finally {
      setIsSubmittingLink(false);
    }
  };

  // Xác định danh sách bài đang hoạt động dựa trên Tab Nguồn
  const activeSourcePosts = useMemo(() => {
    return sourceTab === "markee" ? posts : customPosts;
  }, [sourceTab, posts, customPosts]);

  // Bộ lọc tìm kiếm và trạng thái áp dụng lên danh sách đang hoạt động
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeSourcePosts.filter((p) => {
      const link = p.permalink_url || "";
      const status = marks[link] || "need";
      if (tab !== "all" && tab !== status) return false;
      if (!q) return true;
      return `${p.content || ""} ${p.fanpage_name || ""}`.toLowerCase().includes(q);
    });
  }, [activeSourcePosts, marks, tab, search]);

  const tabCounts = useMemo(() => {
    const counts: Record<TaskStatusTab, number> = { all: activeSourcePosts.length, need: 0, received: 0, completed: 0 };
    activeSourcePosts.forEach((p) => {
      const status = marks[p.permalink_url || ""] || "need";
      counts[status] += 1;
    });
    return counts;
  }, [activeSourcePosts, marks]);

  // Admin/leader: badge "Team X: N tương tác" hiển thị dưới mỗi bài.
  useEffect(() => {
    if (!user?.email || !canSeeTeamInteractions || activeSourcePosts.length === 0) return;
    let cancelled = false;

    Promise.all(
      activeSourcePosts
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
  }, [activeSourcePosts, user?.email, canSeeTeamInteractions]);

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

  const lastResultRef = useRef<{ success: boolean; error?: string } | null>(null);

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

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [tab, search, sourceTab]);

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
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
  };

  return (
    <div className="w-full bg-[#f7f8fb] text-[#252733]">
      <div className="min-h-screen">
        {/* HEADER/HERO */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e7e9ef] h-[58px] flex items-center justify-between px-6">
          <div className="font-black text-[17px]">Tương tác nội bộ</div>
          <div className="flex items-center gap-2">
<<<<<<< HEAD
            <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl p-2" aria-label="notifications">
              🔔
            </button>
            <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl p-2" aria-label="help">
              ?
=======
            <button
              type="button"
              className="border border-[#e7e9ef] bg-white rounded-xl p-2"
              aria-label="refresh"
              onClick={() => loadPosts()}
            >
              🔄
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
            </button>
            <div className="w-[34px] h-[34px] rounded-full bg-[#f1d4dc] grid place-items-center text-[#c71f4d] font-extrabold">M</div>
          </div>
        </div>

        <div className="max-w-[1700px] mx-auto p-5">
          <div className="flex justify-between gap-[18px] items-start mb-4">
            <div>
              <h1 className="text-[24px] m-0 mb-[7px] font-extrabold">Trung tâm hỗ trợ tương tác nội bộ</h1>
              <p className="m-0 text-[#737785] text-[14px]">
<<<<<<< HEAD
                Phân phối bài cần hỗ trợ, theo dõi tiến độ và ghi nhận KPI tương tác của từng thành viên.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="border border-[#e7e9ef] bg-white px-[14px] py-[10px] rounded-xl font-bold text-[#3a3d47]"
                onClick={() => showToast("Đã xuất báo cáo KPI tháng 07/2026")}
              >
                Xuất báo cáo
              </button>
              <button
                type="button"
                className="bg-[#c71f4d] text-white border border-[#c71f4d] px-[14px] py-[10px] rounded-xl font-bold"
                onClick={() => showToast("Đã tạo chiến dịch tương tác mới")}
              >
                + Tạo chiến dịch
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Bài đang cần hỗ trợ</div>
              <div className="text-[24px] font-extrabold">18</div>
              <div className="text-[11px] mt-2 text-[#f59e0b] font-semibold">5 bài ưu tiên cao</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Lượt tương tác hôm nay</div>
              <div className="text-[24px] font-extrabold">246</div>
              <div className="text-[11px] mt-2 text-[#16a26a] font-semibold">↑ 18% so với hôm qua</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Member đã tham gia</div>
              <div className="text-[24px] font-extrabold">21/28</div>
              <div className="text-[11px] mt-2 text-[#737785] font-semibold">75% tỷ lệ tham gia</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">KPI team tháng này</div>
              <div className="text-[24px] font-extrabold">72%</div>
              <div className="text-[11px] mt-2 text-[#16a26a] font-semibold">2.164 / 3.000 điểm</div>
            </div>
            <div className="bg-white border border-[#e7e9ef] rounded-2xl p-[14px] shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
              <div className="text-[12px] text-[#737785] mb-2">Tương tác bị từ chối</div>
              <div className="text-[24px] font-extrabold">7</div>
              <div className="text-[11px] mt-2 text-[#dc2626] font-semibold">Cần kiểm tra chất lượng</div>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-4">
            {/* Left panel */}
            <div className="bg-white border border-[#e7e9ef] rounded-2xl shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)] overflow-hidden">
              <div className="p-[15px] px-4 border-b border-[#e7e9ef] flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-bold">Danh sách bài cần hỗ trợ</h3>
                <div className="flex gap-2">
                  <button type="button" className={`border-0 bg-[#f2f3f6] px-[10px] py-[7px] rounded-lg text-[12px] text-[#606472] ${tab === "need" ? "bg-[#c71f4d] text-white" : ""}`} onClick={() => setTab("need")}>Cần làm</button>
                  <button type="button" className={`border-0 bg-[#f2f3f6] px-[10px] py-[7px] rounded-lg text-[12px] text-[#606472] ${tab === "received" ? "bg-[#c71f4d] text-white" : ""}`} onClick={() => setTab("received")}>Đã nhận</button>
                  <button type="button" className={`border-0 bg-[#f2f3f6] px-[10px] py-[7px] rounded-lg text-[12px] text-[#606472] ${tab === "completed" ? "bg-[#c71f4d] text-white" : ""}`} onClick={() => setTab("completed")}>Hoàn thành</button>
                </div>
              </div>

              <div className="p-4 border-b border-[#e7e9ef] grid grid-cols-[1.5fr_repeat(4,minmax(125px,1fr))] gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a]"
                  placeholder="🔎 Tìm bài viết, chiến dịch..."
                />
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value === "all" ? "all" : (e.target.value as Platform))}
                  className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a]"
                >
                  <option value="all">Tất cả nền tảng</option>
                  <option value="Facebook">Facebook</option>
                  <option value="YouTube">YouTube</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="TikTok">TikTok</option>
                </select>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a]"
                >
                  <option value="all">Tất cả chiến dịch</option>
                  <option value="Markee AI">Markee AI</option>
                  <option value="Website SME">Website SME</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value === "all" ? "all" : (e.target.value as Priority))}
                  className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a]"
                >
                  <option value="all">Tất cả mức ưu tiên</option>
                  <option value="Ưu tiên cao">Cao</option>
                  <option value="Bình thường">Thường</option>
                </select>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a]"
                >
                  <option value="deadline">Deadline gần nhất</option>
                  <option value="latest">Mới nhất</option>
                </select>
              </div>

              <div className="p-3">
                {filteredTasks.map((t) => {
                  const overdueClass = t.overdue ? "border-left-[4px] border-[#ef4444]" : "";
                  const cardClass = `border border-[#e7e9ef] rounded-xl p-4 mb-2 hover:border-[#efb2c3] transition ${t.overdue ? "border-left-[4px] border-[#ef4444]" : ""}`;

                  const isClaimed = !!claimState[t.id];

                  return (
                    <article key={t.id} className={t.overdue ? `${cardClass} relative` : cardClass}>
                      <div className="flex gap-3">
                        <div className={`w-[38px] h-[38px] rounded-xl grid place-items-center font-extrabold text-white flex-shrink-0 ${platformGradientClasses(t.platform)}`}>
                          {PLATFORM_ICON_BG[t.platform].label}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-[14px]">{t.title}</span>
                            <span className={`text-[11px] rounded-lg px-1.5 py-1 bg-[#f2f4f7] text-[#585c68] ${""}`}>{t.priority}</span>
                            <span className="text-[11px] rounded-lg px-1.5 py-1 bg-[#eef2ff] text-[#4f46e5]">{t.team}</span>
                            <span className="text-[11px] rounded-lg px-1.5 py-1 bg-[#eafaf3] text-[#087a50]">{t.kpiPointsTag}</span>
                          </div>

                          <div className="text-[13px] text-[#5d616c] leading-[1.45] mt-2 mb-3 line-clamp-2 overflow-hidden">
                            {clampText2Lines(t.description)}
                          </div>

                          <div className="flex justify-between items-center gap-3">
                            <div className="flex gap-2 flex-wrap">
                              <span className="border border-[#e7e9ef] bg-[#fafbfc] px-2 py-1 rounded-lg text-[11px] text-[#666b76]">{t.metrics.left}</span>
                              <span className="border border-[#e7e9ef] bg-[#fafbfc] px-2 py-1 rounded-lg text-[11px] text-[#666b76]">{t.metrics.comment}</span>
                              <span className="border border-[#e7e9ef] bg-[#fafbfc] px-2 py-1 rounded-lg text-[11px] text-[#666b76]">{t.metrics.share}</span>
                              <span className="border border-[#e7e9ef] bg-[#fafbfc] px-2 py-1 rounded-lg text-[11px] text-[#666b76]">{t.metrics.deadlineText}</span>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                className={
                                  isClaimed
                                    ? "px-[10px] py-[7px] rounded-xl border border-[#b8e7d2] bg-[#eafaf3] text-[#087a50] text-[12px] font-bold"
                                    : "px-[10px] py-[7px] rounded-xl border border-[#efb2c3] bg-white text-[#c71f4d] text-[12px] font-bold"
                                }
                                onClick={() => {
                                  if (!isClaimed) claimTask(t.id);
                                }}
                              >
                                {isClaimed ? "Đã nhận" : "Nhận nhiệm vụ"}
                              </button>

                              <button
                                type="button"
                                className="px-[10px] py-[7px] rounded-xl border border-[#c71f4d] bg-[#c71f4d] text-white text-[12px] font-bold"
                                onClick={() => openModal(t.platform, t.title)}
                              >
                                Tương tác ngay
                              </button>
                            </div>
                          </div>

                          <div className="h-[6px] bg-[#eef0f4] rounded-full overflow-hidden mt-3">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${t.progressPercent}%`, background: "linear-gradient(90deg,#c71f4d,#e83f6f)" }}
                            />
=======
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

          {/* KHU VỰC THÊM LINK BÀI VIẾT THỦ CÔNG */}
          <div className="bg-white border border-[#e7e9ef] rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(20,25,40,.08)]">
            <label className="text-[13px] font-bold block mb-2">Thêm bài viết Facebook thủ công:</label>
            <div className="flex gap-2">
              <input
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
                disabled={isSubmittingLink}
                className="flex-1 border border-[#dde0e7] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#c71f4d]"
                placeholder="Dán đường link bài viết Facebook (Group, Cá nhân, Fanpage...) vào đây..."
              />
              <button
                type="button"
                onClick={handleSubmitCustomLink}
                disabled={isSubmittingLink || !customLink.trim()}
                className="px-4 py-2 rounded-xl bg-[#c71f4d] text-white text-[13px] font-bold disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmittingLink ? "Đang thêm..." : "+ Thêm bài viết"}
              </button>
            </div>
          </div>

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
            {/* VÙNG BỘ LỌC TAB MỚI */}
            <div className="p-[15px] px-4 border-b border-[#e7e9ef] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex bg-[#f1f3f7] p-1 rounded-xl w-fit">
                <button
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition ${sourceTab === "markee" ? "bg-white shadow text-[#c71f4d]" : "text-[#737785] hover:text-[#252733]"}`}
                  onClick={() => setSourceTab("markee")}
                >
                  Fanpage công ty
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-[13px] font-bold transition ${sourceTab === "custom" ? "bg-white shadow text-[#c71f4d]" : "text-[#737785] hover:text-[#252733]"}`}
                  onClick={() => setSourceTab("custom")}
                >
                  Nhân viên chia sẻ
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
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
                className="border border-[#dde0e7] rounded-xl px-3 py-2 bg-white text-[#4b4f5a] w-full"
                placeholder="🔎 Tìm nội dung bài viết, fanpage..."
              />
            </div>

            <div className="p-3">
              {isLoading ? (
                <div className="p-6 text-center text-[#737785] text-sm">Đang tải dữ liệu...</div>
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
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
                          </div>
                        </div>
                      </div>
                    </article>
                  );
<<<<<<< HEAD
                })}
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              <div className="bg-white border border-[#e7e9ef] rounded-2xl shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
                <div className="p-[15px] px-4 border-b border-[#e7e9ef] flex items-center justify-between">
                  <h3 className="m-0 text-[15px] font-bold">KPI cá nhân tháng 07</h3>
                  <button type="button" className="border-0 bg-[#f2f3f6] px-[10px] py-[7px] rounded-lg text-[12px] text-[#606472]">Chi tiết</button>
                </div>
                <div className="px-4 py-3">
                  <div className="grid grid-cols-[92px_1fr] items-center gap-4">
                    <div className="relative grid place-items-center">
                      <div
                        className="w-[92px] h-[92px] rounded-full grid place-items-center"
                        style={{ background: "conic-gradient(#c71f4d 0 72%, #eceef3 72%)" }}
                      >
                        <div className="w-[68px] h-[68px] rounded-full bg-white" />
                      </div>
                      <div className="absolute text-[20px] font-extrabold">72%</div>
                    </div>
                    <div className="text-[12px]">
                      <div className="space-y-0">
                        <div className="flex justify-between border-b border-dashed border-[#eceef3] py-2">
                          <span>Điểm đạt được</span>
                          <b>216 / 300</b>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#eceef3] py-2">
                          <span>Nhiệm vụ hoàn thành</span>
                          <b>24</b>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-[#eceef3] py-2">
                          <span>Tỷ lệ hợp lệ</span>
                          <b className="text-[#16a26a]">96%</b>
                        </div>
                        <div className="flex justify-between py-2">
                          <span>Chuỗi ngày hoạt động</span>
                          <b>6 ngày</b>
                        </div>
                      </div>
                      <div className="pt-3 flex gap-2 flex-wrap">
                        <span className="text-[11px] bg-[#f5f6f8] px-2 py-1 rounded-lg">Like: 1 điểm</span>
                        <span className="text-[11px] bg-[#f5f6f8] px-2 py-1 rounded-lg">Comment: 3 điểm</span>
                        <span className="text-[11px] bg-[#f5f6f8] px-2 py-1 rounded-lg">Share: 5 điểm</span>
                        <span className="text-[11px] bg-[#f5f6f8] px-2 py-1 rounded-lg">Inbox: 5 điểm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e7e9ef] rounded-2xl shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)] overflow-hidden">
                <div className="p-[15px] px-4 border-b border-[#e7e9ef] flex items-center justify-between">
                  <h3 className="m-0 text-[15px] font-bold">Xếp hạng thành viên</h3>
                  <button type="button" className="border-0 bg-[#c71f4d] text-white px-[10px] py-[7px] rounded-lg text-[12px]">Tháng</button>
                </div>
                <div className="px-4 pb-3">
                  <div className="py-1">
                    {[
                      { n: 1, name: "Nguyễn Mai", sub: "38 nhiệm vụ · 98% hợp lệ", score: "418đ" },
                      { n: 2, name: "Quang Vũ", sub: "35 nhiệm vụ · 96% hợp lệ", score: "386đ" },
                      { n: 3, name: "Thuỳ Như", sub: "32 nhiệm vụ · 94% hợp lệ", score: "351đ" },
                      { n: 4, name: "Minh Anh", sub: "24 nhiệm vụ · 96% hợp lệ", score: "216đ" },
                    ].map((m) => (
                      <div key={m.n} className="grid grid-cols-[34px_1fr_auto] gap-3 items-center py-2 border-b border-[#f0f1f4] last:border-b-0">
                        <div className="w-[34px] h-[34px] rounded-full bg-[#eef1f6] grid place-items-center font-extrabold text-[#59606e]">{m.n}</div>
                        <div>
                          <div className="font-bold text-[13px]">{m.name}</div>
                          <div className="text-[11px] text-[#737785] mt-1">{m.sub}</div>
                        </div>
                        <div className="font-extrabold text-[13px] text-[#c71f4d]">{m.score}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e7e9ef] rounded-2xl shadow-[0_1px_3px_rgba(20,25,40,.08),0_8px_24px_rgba(20,25,40,.04)]">
                <div className="p-[15px] px-4 border-b border-[#e7e9ef]">
                  <h3 className="m-0 text-[15px] font-bold">Quy tắc ghi nhận KPI</h3>
                </div>
                <div className="px-4 py-3 text-[12px] text-[#5d616c] leading-[1.55]">
                  <div className="flex gap-2 mb-2">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#c71f4d] mt-1 flex-shrink-0" />
                    <span>
                      <b>Chỉ ghi nhận tương tác thật</b>, đúng tài khoản và hoàn tất trong thời hạn.
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#c71f4d] mt-1 flex-shrink-0" />
                    <span>
                      Comment phải <b>liên quan nội dung</b>, không lặp mẫu, không spam emoji.
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#c71f4d] mt-1 flex-shrink-0" />
                    <span>
                      Mỗi tài khoản chỉ được tính <b>một lần cho mỗi loại hành động</b>.
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-[7px] h-[7px] rounded-full bg-[#c71f4d] mt-1 flex-shrink-0" />
                    <span>
                      Tương tác bị nền tảng xóa hoặc leader từ chối sẽ không được tính điểm.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal */}
        {modal.open ? (
=======
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

        {/* Comment modal */}
        {modalPost ? (
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
          <div
            className="fixed inset-0 bg-[rgba(25,27,35,.42)] flex items-center justify-center z-[30] p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="w-[min(700px,100%)] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,.25)] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-[#e7e9ef]">
                <div>
<<<<<<< HEAD
                  <b className="text-base" id="modalTitle">Thực hiện tương tác</b>
                  <div className="text-[12px] text-[#777] mt-1" id="modalPlatform">
                    {modal.platform ? `Nền tảng: ${modal.platform} · Mở bằng Chrome Extension` : ""}
                  </div>
=======
                  <b className="text-base">Comment vào bài viết</b>
                  <div className="text-[12px] text-[#777] mt-1">Thực hiện qua Chrome Extension trên tài khoản Facebook đang đăng nhập</div>
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
                </div>
                <button type="button" className="border-0 bg-[#f2f3f6] rounded-lg px-[10px] py-[7px]" onClick={closeModal} aria-label="close">✕</button>
              </div>

              <div className="p-5">
<<<<<<< HEAD
                <div className="bg-[#fff8e8] border border-[#f5d793] rounded-xl p-3 text-[12px] text-[#76530b] mb-4">
                  Extension sẽ mở đúng tài khoản và bài viết. Sau khi thực hiện, hãy tích các hành động đã hoàn thành để hệ thống đối soát và ghi nhận KPI.
                </div>

                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <label className="flex items-center gap-2 border border-[#e7e9ef] rounded-xl p-3">
                    <input type="checkbox" checked={modal.checks.like} onChange={(e) => setModal((m) => ({ ...m, checks: { ...m.checks, like: e.target.checked } }))} />
                    <span>Like / Reaction</span>
                  </label>
                  <label className="flex items-center gap-2 border border-[#e7e9ef] rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={modal.checks.comment}
                      onChange={(e) => setModal((m) => ({ ...m, checks: { ...m.checks, comment: e.target.checked } }))}
                    />
                    <span>Comment đúng yêu cầu</span>
                  </label>
                  <label className="flex items-center gap-2 border border-[#e7e9ef] rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={modal.checks.share}
                      onChange={(e) => setModal((m) => ({ ...m, checks: { ...m.checks, share: e.target.checked } }))}
                    />
                    <span>Share / Repost</span>
                  </label>
                  <label className="flex items-center gap-2 border border-[#e7e9ef] rounded-xl p-3">
                    <input
                      type="checkbox"
                      checked={modal.checks.inbox}
                      onChange={(e) => setModal((m) => ({ ...m, checks: { ...m.checks, inbox: e.target.checked } }))}
                    />
                    <span>Inbox / Trả lời khách</span>
                  </label>
                </div>

                <label className="text-[12px] font-extrabold block mb-2">Ghi chú hoặc link bằng chứng</label>
                <input
                  value={modal.evidenceNote}
                  onChange={(e) => setModal((m) => ({ ...m, evidenceNote: e.target.value }))}
                  className="w-full border border-[#dde0e7] rounded-xl px-3 py-2 outline-none"
                  placeholder="Dán link comment hoặc mô tả ngắn..."
                />
              </div>

              <div className="p-4 border-t border-[#e7e9ef] flex justify-end gap-2">
                <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl px-4 py-2 font-extrabold" onClick={closeModal}>
                  Để sau
                </button>
                <button type="button" className="bg-[#c71f4d] text-white border border-[#c71f4d] rounded-xl px-4 py-2 font-extrabold" onClick={completeTask}>
                  Xác nhận hoàn thành
=======
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
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
                </button>
              </div>
            </div>
          </div>
        ) : null}

<<<<<<< HEAD
=======
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

>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
        {/* Toast */}
        {toast ? (
          <div className="fixed right-6 bottom-6 px-4 py-3 rounded-xl bg-[#1f2937] text-white text-[13px] font-semibold shadow-lg">
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
<<<<<<< HEAD
}

=======
}
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
