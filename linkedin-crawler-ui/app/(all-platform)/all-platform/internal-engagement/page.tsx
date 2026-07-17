"use client";

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
  };

  return (
    <div className="w-full bg-[#f7f8fb] text-[#252733]">
      <div className="min-h-screen">
        {/* HEADER/HERO */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#e7e9ef] h-[58px] flex items-center justify-between px-6">
          <div className="font-black text-[17px]">Tương tác nội bộ</div>
          <div className="flex items-center gap-2">
            <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl p-2" aria-label="notifications">
              🔔
            </button>
            <button type="button" className="border border-[#e7e9ef] bg-white rounded-xl p-2" aria-label="help">
              ?
            </button>
            <div className="w-[34px] h-[34px] rounded-full bg-[#f1d4dc] grid place-items-center text-[#c71f4d] font-extrabold">M</div>
          </div>
        </div>

        <div className="max-w-[1700px] mx-auto p-5">
          <div className="flex justify-between gap-[18px] items-start mb-4">
            <div>
              <h1 className="text-[24px] m-0 mb-[7px] font-extrabold">Trung tâm hỗ trợ tương tác nội bộ</h1>
              <p className="m-0 text-[#737785] text-[14px]">
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
                          </div>
                        </div>
                      </div>
                    </article>
                  );
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
          <div
            className="fixed inset-0 bg-[rgba(25,27,35,.42)] flex items-center justify-center z-[30] p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <div className="w-[min(700px,100%)] bg-white rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,.25)] overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-[#e7e9ef]">
                <div>
                  <b className="text-base" id="modalTitle">Thực hiện tương tác</b>
                  <div className="text-[12px] text-[#777] mt-1" id="modalPlatform">
                    {modal.platform ? `Nền tảng: ${modal.platform} · Mở bằng Chrome Extension` : ""}
                  </div>
                </div>
                <button type="button" className="border-0 bg-[#f2f3f6] rounded-lg px-[10px] py-[7px]" onClick={closeModal} aria-label="close">✕</button>
              </div>

              <div className="p-5">
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
                </button>
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

