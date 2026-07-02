"use client";

import { useMemo, useState, useRef } from "react";
import type { RefObject } from "react";
import { MaterialIcon } from "@/components/ui";
import { cn } from "@/lib/utils";
import TeamAccountTree from "@/components/all-platform/inbox/TeamAccountTree";
import { KpiProgressCard } from "@/components/all-platform/components/kpi-progress-card";
import { CrmCustomerModal } from "@/components/all-platform/components/CrmCustomerModal";
import { useAppAuth } from "@/contexts/AppAuthContext";

interface Session { user_id: string; fb_user_id?: string; label?: string; owner?: string; online?: boolean; inbox_enabled?: boolean; status?: string; }
interface Conv { conv_id: string; name: string; preview: string; unread: boolean; time: string; is_customer: boolean; pushed_to_zalo: boolean; deleted: boolean; archived?: boolean; archived_at?: string; }
interface ArchiveConv { conv_id: string; name: string; preview?: string; time?: string; archived_at?: string; last_saved_at?: string; archive_reason?: string; outcome?: string; note?: string; messages_count?: number; archived_by_name?: string; is_customer?: boolean; pushed_to_zalo?: boolean; }
interface Msg { from: "me" | "them"; text: string; time: string; clientId?: string; }
interface UserRow { id?: string; email?: string; name?: string; }
interface TeamRow { id?: string; name_team?: string; id_leader?: string; leader_name?: string; leader_email?: string; members?: UserRow[]; }

type InboxFilter = "all" | "unread" | "customer" | "need_reply" | "need_verify";
type InboxViewMode = "inbox" | "archive";
type PanelTab = "templates" | "customer" | "kpi";

interface Props {
  role: string;
  owner: string;
  sessions: Session[];
  rawSessions?: Session[];
  allowedOwnerIds?: Set<string> | null;
  extraAccountIds?: Set<string>;
  toggleExtraAccount?: (userId: string) => void;
  ownerNames: Record<string, string>;
  teams: TeamRow[];
  acc: string;
  accOnline: boolean;
  accPaused: boolean;
  needRelogin: boolean;
  connErr: boolean;
  extInstalled: boolean | null;
  scanning: boolean;
  loadingConvs: boolean;
  loadingArchives: boolean;
  loadingChat: boolean;
  loadingFresh: boolean;
  archiveReading: boolean;
  viewMode: InboxViewMode;
  filter: InboxFilter;
  activeConvs: Conv[];
  filtered: Conv[];
  allConvs?: Conv[];
  archives: ArchiveConv[];
  openConv: string;
  msgs: Msg[];
  reply: string;
  customerNotes: Record<string, string>;
  savingNoteConv: string;
  toast: { msg: string; ok: boolean } | null;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  selectAcc: (uid: string) => void;
  scan: () => void;
  setViewMode: (mode: InboxViewMode) => void;
  setArchiveReading: (value: boolean) => void;
  setFilter: (filter: InboxFilter) => void;
  setReply: (value: string) => void;
  openChat: (convId: string) => void;
  hoverConv?: (convId: string) => void;
  openArchive: (convId: string) => void;
  mark: (convId: string, field: string, value: boolean) => void;
  saveArchive: (convId: string, hide?: boolean) => void;
  saveCustomerNote: (convId: string, note: string) => void;
  sendReply: () => void;
  needsReply: (conv: Conv) => boolean;
  accLabel: (session: Session) => string;
  syncFbInbox: (payload: {
    leader_email: string;
    member_email: string;
    conv_ids: string[];
    user_id: string;
    is_lead: boolean;
  }) => Promise<void>;
  onSuggestKpi: (payload: {
    member_email: string;
    conv_ids: string[];
    user_id: string;
  }) => Promise<void>;
  verifiedConvIds: Set<string>;
  suggestedConvIds: Set<string>;
  userEmail: string;
  ownerEmail: string;
  onBulkVerifyKpi: (payload: { leader_email: string; target_date: string }) => Promise<void>;
}

const QUICK_REPLY_GROUPS = [
  {
    id: "greeting",
    label: "Chào hỏi",
    items: [
      "Chào bạn, bên mình có thể hỗ trợ bạn phần nào ạ?",
      "Dạ mình đang xem thông tin, bạn cho mình xin thêm nhu cầu cụ thể nhé.",
      "Cảm ơn bạn đã nhắn tin. Mình hỗ trợ bạn ngay đây ạ.",
    ],
  },
  {
    id: "quote",
    label: "Báo giá",
    items: [
      "Dạ để báo giá chính xác, bạn cho mình xin số lượng và khu vực cần triển khai nhé.",
      "Mình gửi bạn gói phù hợp trước, nếu cần mình sẽ tư vấn thêm để tối ưu chi phí ạ.",
      "Bên mình có thể làm theo ngân sách của bạn, bạn dự kiến khoảng bao nhiêu để mình tư vấn đúng hơn?",
    ],
  },
  {
    id: "followup",
    label: "Follow-up",
    items: [
      "Bạn cần mình hỗ trợ thêm thông tin nào trước khi chốt không ạ?",
      "Mình nhắc nhẹ để bạn khỏi trôi tin, phần này bên mình vẫn đang giữ slot hỗ trợ nhé.",
      "Nếu tiện, mình có thể gọi nhanh 3-5 phút để nắm nhu cầu và tư vấn sát hơn ạ.",
    ],
  },
  {
    id: "handoff",
    label: "Chuyển lead",
    items: [
      "Mình đã ghi nhận nhu cầu của bạn, bên mình sẽ liên hệ lại để tư vấn chi tiết hơn nhé.",
      "Bạn cho mình xin số điện thoại/Zalo để team tư vấn gửi thông tin nhanh hơn ạ.",
      "Dạ mình chuyển thông tin qua bộ phận phụ trách, bạn để ý tin nhắn giúp mình nhé.",
    ],
  },
];

function displayMessage(message: Msg): { content: string; time: string } {
  const matched = message.text.match(/^Tin nhắn do .+? gửi lúc (.+?):\s*([\s\S]*)$/i);
  let content = matched ? (matched[2] || "").trim() : message.text;
  const time = matched ? (matched[1] || "").trim() : (message.time || "");
  const stripped = content.replace(/^(?:(?:Thứ\s+\S+\s+)?\d{1,2}(?::\d{2})?(?:sáng|chiều|ch|sa|CH|SA|AM|PM)?)\s*[:\n]+\s*/i, "").trim();
  if (stripped) content = stripped;
  return { content, time };
}

function statusClasses(status?: string): string {
  if (status === "online") return "bg-emerald-500";
  if (status === "paused") return "bg-amber-400";
  return "bg-slate-300";
}

function statusLabel(status?: string): string {
  if (status === "online") return "online";
  if (status === "paused") return "paused";
  return "offline";
}

export default function InboxModernLayout(props: Props) {
  const {
    role, owner, sessions, rawSessions = [], allowedOwnerIds = null, extraAccountIds = new Set<string>(), toggleExtraAccount,
    ownerNames, teams, acc, accOnline, accPaused,
    needRelogin, connErr, extInstalled, scanning, loadingConvs, loadingArchives,
    loadingChat, loadingFresh, archiveReading, viewMode, filter, activeConvs, filtered, allConvs = [],
    archives, openConv, msgs, reply, customerNotes, savingNoteConv, toast,
    chatScrollRef, selectAcc, scan, setViewMode, setArchiveReading, setFilter,
    setReply, openChat, hoverConv, openArchive, mark, saveArchive, saveCustomerNote, sendReply,
    needsReply, accLabel, syncFbInbox, onSuggestKpi, verifiedConvIds, suggestedConvIds,
    userEmail, ownerEmail,
  } = props;

  const [panelTab, setPanelTab] = useState<PanelTab>("templates");
  const [templateGroupId, setTemplateGroupId] = useState(QUICK_REPLY_GROUPS[0].id);
  const [kpiToast, setKpiToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [noteDraftState, setNoteDraftState] = useState({ convId: "", value: "" });
  const panelScrollRef = useRef<HTMLDivElement>(null);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isBulkSuggesting, setIsBulkSuggesting] = useState(false);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAddAccountPicker, setShowAddAccountPicker] = useState(false);
  const [trackSearchOpen, setTrackSearchOpen] = useState(false);
  const [trackSearchQuery, setTrackSearchQuery] = useState("");
  const { user } = useAppAuth();

  const selectedSession = sessions.find(s => s.user_id === acc);
  const selectedConv = activeConvs.find(c => c.conv_id === openConv) || filtered.find(c => c.conv_id === openConv);
  const selectedArchive = archives.find(a => a.conv_id === openConv);
  const selectedName = archiveReading ? selectedArchive?.name : selectedConv?.name;
  const selectedPreview = archiveReading ? selectedArchive?.preview : selectedConv?.preview;
  const selectedNote = openConv ? (customerNotes[openConv] ?? selectedArchive?.note ?? "") : "";
  const activeTemplateGroup = QUICK_REPLY_GROUPS.find(g => g.id === templateGroupId) || QUICK_REPLY_GROUPS[0];
  const noteDraft = noteDraftState.convId === openConv ? noteDraftState.value : selectedNote;
  const setNoteDraft = (value: string) => setNoteDraftState({ convId: openConv, value });
  const noteChanged = noteDraft.trim() !== selectedNote.trim();

  const stats = useMemo(() => ({
    unread: activeConvs.filter(c => c.unread).length,
    need: activeConvs.filter(needsReply).length,
    customers: activeConvs.filter(c => c.is_customer).length,
    pushed: activeConvs.filter(c => c.pushed_to_zalo).length,
  }), [activeConvs, needsReply]);

  // Tim + "theo doi" hoi thoai CU (khong con trong active window ~7 ngay) de luon hien trong Hop thu ve sau.
  const trackSearchResults = useMemo(() => {
    const q = trackSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const activeIds = new Set(activeConvs.map(c => c.conv_id));
    return allConvs
      .filter(c => !c.deleted && !activeIds.has(c.conv_id) && (c.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [trackSearchQuery, allConvs, activeConvs]);

  const canSend = !!openConv && !archiveReading && accOnline && !accPaused && !needRelogin;
  const appendTemplate = (text: string) => setReply(reply.trim() ? `${reply.trim()}\n${text}` : text);

  const showToastKpi = (msg: string, ok: boolean) => {
    setKpiToast({ msg, ok });
    setTimeout(() => setKpiToast(null), 3500);
  };

  const handleSuggestKpi = async (payload: { member_email: string; conv_ids: string[]; user_id: string }) => {
    try {
      await onSuggestKpi(payload);
      showToastKpi("Đã đề xuất KPI thành công!", true);
    } catch {
      showToastKpi("Lỗi khi đề xuất KPI", false);
    }
  };

  const handleBulkSuggest = async () => {
    if (!acc || !userEmail) return;
    const pendingConvs = activeConvs.filter(c => !verifiedConvIds.has(c.conv_id) && !suggestedConvIds.has(c.conv_id));
    if (pendingConvs.length === 0) {
      showToastKpi("Không có hội thoại nào cần đề xuất KPI cho tài khoản này", false);
      return;
    }
    const convIds = pendingConvs.map(c => c.conv_id);
    setIsBulkSuggesting(true);
    try {
      await onSuggestKpi({ member_email: userEmail, conv_ids: convIds, user_id: acc });
    } finally {
      setIsBulkSuggesting(false);
    }
  };

  const handleBulkVerify = async () => {
    if (!ownerEmail) return;
    setIsBulkVerifying(true);
    try {
      await props.onBulkVerifyKpi({ leader_email: ownerEmail, target_date: targetDate });
    } finally {
      setIsBulkVerifying(false);
    }
  };

  const switchInbox = () => { setViewMode("inbox"); setArchiveReading(false); };

  const confirmHide = (conv: Conv) => {
    if (window.confirm(`Ẩn "${conv.name || "hội thoại này"}" khỏi hộp thư?`)) {
      saveArchive(conv.conv_id, true);
    }
  };

  const panelH = "h-[590px] xl:h-[676px]";

  return (
    <div className="w-full max-w-full overflow-x-hidden text-on-surface">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon name="inbox" className="text-primary" />
            <h1 className="text-xl font-black">Inbox Facebook</h1>
          </div>
          <p className="mt-1 text-sm text-on-surface-variant">Quản lý hội thoại Messenger, lọc lead và trả lời nhanh bằng mẫu có sẵn.</p>
        </div>
        <button
          onClick={scan}
          disabled={scanning || !acc || !accOnline || needRelogin}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-sm transition hover:bg-on-primary-fixed-variant disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MaterialIcon name={scanning ? "sync" : "travel_explore"} className={`text-base ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Đang quét" : "Quét ngay"}
        </button>
      </div>

      {connErr && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Không kết nối được service. Kiểm tra backend.</div>}
      {needRelogin && <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Cookie hết hạn. Vào Quản lý tài khoản &gt; Tài khoản FB &amp; KPI để đăng nhập lại.</div>}
      {role === "member" && extInstalled !== null && !sessions.some(s => s.owner === owner) && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {extInstalled === false ? "Chưa cài hoặc chưa mở extension Markee." : "Extension sẵn sàng nhưng tài khoản FB chưa kết nối."}
        </div>
      )}

      {/* Stats row */}
      <div className="mb-4 grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Hội thoại", activeConvs.length, stats.unread],
          ["Cần trả lời", stats.need, null],
          ["Lead đã lưu", stats.customers, stats.pushed],
          ["Online", sessions.filter(s => s.status === "online").length, sessions.length],
        ].map(([label, val, sub], i) => (
          <div key={label} className="rounded-lg border border-outline-variant bg-surface px-4 py-3">
            <div className="text-[11px] font-bold uppercase text-on-surface-variant">{String(label)}</div>
            <div className="mt-1 text-2xl font-black" style={i === 1 ? { color: "var(--color-primary)" } : {}}>{val}</div>
            {sub !== null && <div className="text-xs text-on-surface-variant">{sub} {i === 0 ? "chưa đọc" : i === 2 ? "đẩy Zalo" : "tài khoản"}</div>}
          </div>
        ))}
      </div>

      {/* KPI Progress Cards */}
      {userEmail && (
        <div className="mb-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <KpiProgressCard
            email={userEmail}
            type="inbox"
          />
          <KpiProgressCard
            email={userEmail}
            type="lead"
          />
        </div>
      )}

      <div className="mb-4 min-w-0 rounded-xl border border-outline-variant bg-surface p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase text-on-surface-variant">Tài khoản nhân viên</div>
            <div className="mt-0.5 flex items-center gap-2 text-sm font-bold">
              <span className={`h-2 w-2 rounded-full ${statusClasses(selectedSession?.status)}`} />
              {selectedSession ? accLabel(selectedSession) : "Chưa chọn tài khoản"}
              {selectedSession && <span className="text-xs font-semibold text-on-surface-variant">({statusLabel(selectedSession.status)})</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(role === "admin" || role === "leader") ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="rounded border border-outline-variant px-2 py-1 text-xs outline-none focus:border-primary"
                />
                <button
                  onClick={handleBulkVerify}
                  disabled={isBulkVerifying}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isBulkVerifying ? "ĐANG TÍNH..." : "TÍNH KPI HÀNG LOẠT"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleBulkSuggest}
                disabled={isBulkSuggesting || !acc}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isBulkSuggesting ? "ĐANG ĐỀ XUẤT..." : "ĐỀ XUẤT TÍNH KPI HÀNG LOẠT"}
              </button>
            )}
            {(role === "admin" || role === "leader") && typeof toggleExtraAccount === "function" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddAccountPicker(v => !v)}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
                >
                  + Thêm tài khoản khác
                </button>
                {showAddAccountPicker && (
                  <div className="absolute right-0 z-20 mt-1 w-72 max-h-80 overflow-auto rounded-lg border border-outline-variant bg-surface p-2 shadow-lg">
                    <div className="px-1 pb-1.5 text-[11px] text-on-surface-variant">Chọn thêm acc ngoài phạm vi mặc định (team/của bạn) để hiện trong Inbox — chỉ lưu trên trình duyệt này.</div>
                    {rawSessions.length === 0 ? (
                      <div className="px-1 py-2 text-xs text-on-surface-variant">Chưa có acc nào.</div>
                    ) : (
                      rawSessions.map(s => {
                        const inDefaultScope = allowedOwnerIds === null || (!!s.owner && allowedOwnerIds.has(String(s.owner)));
                        const checked = extraAccountIds.has(s.user_id);
                        return (
                          <label key={s.user_id} className={`flex items-center gap-2 rounded px-1.5 py-1 text-xs cursor-pointer hover:bg-surface-container-low ${inDefaultScope ? "opacity-50" : ""}`}>
                            <input type="checkbox" checked={checked || inDefaultScope} disabled={inDefaultScope} onChange={() => toggleExtraAccount(s.user_id)} />
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusClasses(s.status)}`} />
                            <span className="truncate">{accLabel(s)}</span>
                            {inDefaultScope && <span className="ml-auto shrink-0 text-[10px] text-on-surface-variant">(mặc định)</span>}
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-on-surface-variant hidden md:block">Online realtime, offline chỉ xem dữ liệu.</div>
          </div>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-3 py-4 text-sm text-on-surface-variant">
            {extInstalled === false ? "Chưa thấy extension. Hãy cài và mở extension." : "Chưa có tài khoản Facebook nào."}
          </div>
        ) : (role === "admin" || role === "leader") ? (
          <TeamAccountTree sessions={sessions} ownerNames={ownerNames} teams={teams} selectedAcc={acc} role={role} owner={owner} onSelect={selectAcc} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {sessions.map(session => (
              <button
                key={session.user_id}
                onClick={() => selectAcc(session.user_id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${acc === session.user_id ? "border-primary bg-primary text-white" : "border-outline-variant bg-surface text-on-surface hover:border-primary"}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusClasses(session.status)}`} />
                {accLabel(session)}
                <span className="text-[10px] opacity-70">{statusLabel(session.status)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3-Pane layout — always visible */}
      <div className="grid min-w-0 grid-cols-[280px_1fr_260px] gap-4">
        {/* Pane 1: Conversation list */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
          <div className="border-b border-outline-variant p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Hộp thư</h2>
                <p className="text-xs text-on-surface-variant">{loadingConvs ? "Đang cập nhật..." : `${filtered.length} hội thoại`}</p>
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as InboxFilter)}
                className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-sm font-semibold outline-none focus:border-primary"
              >
                <option value="all">Tất cả</option>
                <option value="need_reply">Cần trả lời</option>
                <option value="unread">Chưa đọc</option>
                <option value="customer">Khách</option>
                <option value="need_verify">Chưa tính KPI</option>
              </select>
            </div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="inline-flex rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
                <button onClick={switchInbox} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === "inbox" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"}`}>Hộp thư</button>
                <button onClick={() => setViewMode("archive")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === "archive" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant"}`}>Lưu trữ</button>
              </div>
              <button
                type="button"
                onClick={() => setTrackSearchOpen(v => !v)}
                title="Tìm 1 người cũ (không nhắn gần đây) để luôn hiện trong Hộp thư"
                className="rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-bold text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                🔎 Theo dõi người cũ
              </button>
            </div>
            {trackSearchOpen && (
              <div className="mb-2 rounded-lg border border-outline-variant bg-surface-container-low p-2">
                <input
                  autoFocus
                  value={trackSearchQuery}
                  onChange={e => setTrackSearchQuery(e.target.value)}
                  placeholder="Gõ tên khách cần tìm (kể cả hội thoại cũ đã ẩn)..."
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                {trackSearchQuery.trim() && (
                  <div className="mt-2 max-h-48 space-y-1 overflow-auto">
                    {trackSearchResults.length === 0 ? (
                      <div className="px-1 py-2 text-xs text-on-surface-variant">Không tìm thấy hội thoại nào khớp (chỉ tìm được trong dữ liệu đã quét trước đó).</div>
                    ) : (
                      trackSearchResults.map(c => (
                        <div key={c.conv_id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-on-surface">{c.name || c.conv_id}</div>
                            <div className="truncate text-xs text-on-surface-variant">{c.preview || "(không có preview)"} · {c.time}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { mark(c.conv_id, "is_customer", true); setTrackSearchQuery(""); setTrackSearchOpen(false); }}
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white transition hover:opacity-90"
                          >
                            Theo dõi
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="h-[560px] overflow-auto p-3 xl:h-[620px]">
            {viewMode === "archive" ? (
              loadingArchives && archives.length === 0 ? (
                <div className="py-12 text-center text-sm text-on-surface-variant">Đang tải lưu trữ...</div>
              ) : archives.length === 0 ? (
                <div className="py-12 text-center text-sm text-on-surface-variant">Chưa có hội thoại lưu trữ.</div>
              ) : archives.map(item => (
                <button
                  key={item.conv_id}
                  onClick={() => openArchive(item.conv_id)}
                  className={`mb-2 block w-full rounded-lg border p-3 text-left transition hover:border-primary ${openConv === item.conv_id && archiveReading ? "border-primary bg-primary/5" : "border-outline-variant bg-surface"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{item.name || item.conv_id}</div>
                      <div className="mt-1 truncate text-xs text-on-surface-variant">{item.preview || "—"}</div>
                    </div>
                    <span className="whitespace-nowrap text-xs text-on-surface-variant">{item.messages_count || 0} tin</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.is_customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">khách</span>}
                    {item.pushed_to_zalo && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Zalo</span>}
                  </div>
                </button>
              ))
            ) : loadingConvs && filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-on-surface-variant">Đang tải hộp thư...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-on-surface-variant">Chưa có hội thoại.</div>
            ) : filtered.map(conv => (
              <button
                key={conv.conv_id}
                onClick={() => openChat(conv.conv_id)}
                onMouseEnter={() => hoverConv?.(conv.conv_id)}
                className={`mb-2 block w-full rounded-lg border p-3 text-left transition hover:border-primary ${openConv === conv.conv_id && !archiveReading ? "border-primary bg-primary/5" : "border-outline-variant bg-surface"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`truncate text-sm ${conv.unread ? "font-black" : "font-bold"}`}>{conv.name || "Người dùng"}</div>
                    <div className="mt-1 truncate text-xs text-on-surface-variant">{conv.preview || "—"}</div>
                  </div>
                  <span className="whitespace-nowrap text-xs text-on-surface-variant">{conv.time}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {needsReply(conv) && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">cần trả lời</span>}
                  {conv.unread && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">chưa đọc</span>}
                  {conv.is_customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">khách</span>}
                  {conv.pushed_to_zalo && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Zalo</span>}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Pane 2: Chat */}
        <section className="flex h-[656px] min-w-0 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm xl:h-[716px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant px-4 py-3 bg-surface-container-low">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black">{selectedName || "Hội thoại"}</h2>
              <p className="truncate text-xs text-on-surface-variant">{selectedPreview || (openConv ? "Đang xem nội dung" : "Chọn hội thoại để bắt đầu")}</p>
            </div>
            {selectedConv && !archiveReading && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => mark(selectedConv.conv_id, "is_customer", !selectedConv.is_customer)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold hover:border-primary">
                  {selectedConv.is_customer ? "Bỏ khách" : "Là khách"}
                </button>
                {selectedConv.is_customer && (
                  <button onClick={() => mark(selectedConv.conv_id, "pushed_to_zalo", !selectedConv.pushed_to_zalo)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold hover:border-primary">
                    {selectedConv.pushed_to_zalo ? "Bỏ Zalo" : "Đẩy Zalo"}
                  </button>
                )}
                <button onClick={() => saveArchive(selectedConv.conv_id, false)} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold hover:border-primary">Lưu</button>
                <button onClick={() => confirmHide(selectedConv)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Ẩn</button>
              </div>
            )}
            {archiveReading && openConv && (
              <button onClick={() => { switchInbox(); openChat(openConv); }} className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold hover:border-primary">Mở inbox</button>
            )}
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-auto bg-surface-container-low px-4 py-4">
            {!openConv ? (
              <div className="flex h-full items-center justify-center text-sm text-on-surface-variant">Chọn một hội thoại để xem tin nhắn.</div>
            ) : loadingChat && msgs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Đang tải hội thoại...</div>
            ) : msgs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {archiveReading ? "Bản lưu chưa có nội dung." :
                 needRelogin ? "Cookie hết hạn." :
                 accPaused ? "Realtime đang tạm dừng." :
                 !accOnline ? "Tài khoản offline." :
                 "Chưa lấy được tin nhắn."}
              </div>
            ) : (
              <div className="space-y-3">
                {msgs.map((message, index) => {
                  const { content, time } = displayMessage(message);
                  return (
                    <div key={`${index}-${message.clientId || time}`} className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] ${message.from === "me" ? "text-right" : "text-left"}`}>
                        <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${message.from === "me" ? "bg-primary text-white" : "bg-surface text-on-surface shadow-sm ring-1 ring-outline-variant"}`}>
                          {content}
                        </div>
                        {time && <div className="mt-1 px-1 text-[10px] text-on-surface-variant">{time}</div>}
                      </div>
                    </div>
                  );
                })}
                {loadingFresh && <div className="text-center text-[11px] text-on-surface-variant">Đang cập nhật...</div>}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant bg-surface p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {activeTemplateGroup.items.slice(0, 3).map(item => (
                <button key={item} onClick={() => appendTemplate(item)} disabled={!openConv || archiveReading}
                  className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed">
                  {item.length > 34 ? `${item.slice(0, 34)}...` : item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                disabled={!canSend}
                rows={2}
                placeholder={archiveReading ? "Đang xem lưu trữ..." : needRelogin ? "Cookie hết hạn..." : !accOnline ? "Offline..." : "Nhập trả lời..."}
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low"
              />
              <button onClick={sendReply} disabled={!canSend || !reply.trim()}
                className="shrink-0 rounded-lg bg-primary px-5 text-sm font-black text-white transition hover:bg-on-primary-fixed-variant disabled:cursor-not-allowed disabled:opacity-50">
                Gửi
              </button>
            </div>
          </div>
        </section>

        {/* Pane 3: Panel (Templates / Customer / KPI) */}
        <aside className="min-w-0 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm flex flex-col">
          <div className="grid grid-cols-3 border-b border-outline-variant bg-surface-container-low text-xs font-black shrink-0">
            <button onClick={() => { setPanelTab("templates"); panelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`py-3 ${panelTab === "templates" ? "bg-surface text-primary" : "text-on-surface-variant"}`}>Mẫu</button>
            <button onClick={() => { setPanelTab("customer"); panelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`py-3 ${panelTab === "customer" ? "bg-surface text-primary" : "text-on-surface-variant"}`}>Khách</button>
            <button onClick={() => { setPanelTab("kpi"); panelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`py-3 ${panelTab === "kpi" ? "bg-surface text-primary" : "text-on-surface-variant"}`}>KPI</button>
          </div>

          <div ref={panelScrollRef} className={`overflow-auto p-4 ${panelH}`}>
            {/* ── Templates ── */}
            {panelTab === "templates" && (
              <div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {QUICK_REPLY_GROUPS.map(group => (
                    <button key={group.id} onClick={() => setTemplateGroupId(group.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${templateGroupId === group.id ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"}`}>
                      {group.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {activeTemplateGroup.items.map(item => (
                    <button key={item} onClick={() => appendTemplate(item)} disabled={!openConv || archiveReading}
                      className="block w-full rounded-lg border border-outline-variant bg-surface p-3 text-left text-sm leading-relaxed transition hover:border-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Customer ── */}
            {panelTab === "customer" && (
              <div>
                {!openConv ? (
                  <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">Chọn hội thoại để xem thông tin.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-outline-variant p-3">
                      <div className="text-xs font-bold uppercase text-on-surface-variant">Tên</div>
                      <div className="mt-1 text-sm font-black">{selectedName || openConv}</div>
                      <div className="mt-1 text-xs text-on-surface-variant">{selectedPreview || "—"}</div>
                    </div>
                    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase text-on-surface-variant">Ghi chú nhu cầu</div>
                          <div className="text-[11px] text-on-surface-variant">Lưu điểm cần nhớ về khách.</div>
                        </div>
                        {selectedNote && !noteChanged && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">đã lưu</span>}
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        rows={5}
                        maxLength={1000}
                        placeholder="VD: khách cần app booking..."
                        className="w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary disabled:bg-surface-container-low disabled:cursor-not-allowed"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-on-surface-variant">{noteDraft.trim().length}/1000</span>
                        <button
                          onClick={() => saveCustomerNote(openConv, noteDraft)}
                          disabled={!openConv || savingNoteConv === openConv || !noteChanged}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-white transition hover:bg-on-primary-fixed-variant disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {savingNoteConv === openConv ? "Đang lưu..." : "Lưu ghi chú"}
                        </button>
                      </div>
                    </div>
                    {selectedConv && !archiveReading && (
                      <div className="grid gap-2">
                        <button
                          onClick={() => setShowLeadModal(true)}
                          className="flex items-center justify-center gap-2 rounded-lg bg-yellow-100 text-yellow-800 px-3 py-2 text-sm font-bold transition hover:bg-yellow-200 border border-yellow-200"
                        >
                          <MaterialIcon name="person_add" className="text-[18px]" />
                          Lưu vào CRM (Leads)
                        </button>
                        <button onClick={() => mark(selectedConv.conv_id, "is_customer", !selectedConv.is_customer)}
                          className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-bold hover:border-primary">
                          {selectedConv.is_customer ? "Bỏ đánh dấu khách" : "Đánh dấu là khách"}
                        </button>
                        <button onClick={() => saveArchive(selectedConv.conv_id, false)}
                          className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-bold hover:border-primary">Lưu khách</button>
                        <button onClick={() => confirmHide(selectedConv)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50">Ẩn khỏi hộp thư</button>
                      </div>
                    )}
                    {archiveReading && <div className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">Đây là bản lưu trữ.</div>}
                  </div>
                )}
              </div>
            )}

            {/* ── KPI ── */}
            {panelTab === "kpi" && (
              <div>
                {/* Admin / Leader: Xác nhận KPI */}
                {(role === "admin" || role === "leader") && (
                  <div className={cn("mb-5 rounded-xl border p-4 shadow-sm transition-colors",
                    verifiedConvIds?.has(openConv) ? "border-emerald-200 bg-emerald-50" : "border-primary/20 bg-surface")}>

                    <div className="mb-1 flex items-center justify-between">
                      <div className={cn("text-xs font-black uppercase", verifiedConvIds?.has(openConv) ? "text-emerald-700" : "text-on-surface")}>
                        {verifiedConvIds?.has(openConv) ? "Đã xác nhận KPI" : "Xác nhận KPI"}
                      </div>
                      {verifiedConvIds?.has(openConv) && <MaterialIcon name="check_circle" className="text-emerald-500 text-lg" />}
                    </div>

                    {!verifiedConvIds?.has(openConv) && (
                      <div className="mb-3 text-xs text-on-surface-variant">Chọn hội thoại bên trái rồi bấm xác nhận để tính KPI cho nhân sự.</div>
                    )}

                    {openConv && selectedConv ? (
                      <div className="mb-4 rounded-xl border border-outline-variant bg-surface p-3 shadow-sm">
                        <div className="truncate text-sm font-bold text-on-surface">{selectedName || "Hội thoại FB"}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedConv.is_customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 flex items-center gap-1"><MaterialIcon name="star" className="text-[12px]" /> Đã đánh dấu khách</span>}
                          {selectedConv.pushed_to_zalo && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 flex items-center gap-1"><MaterialIcon name="send" className="text-[12px]" /> Đã đẩy Zalo</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-center text-xs text-on-surface-variant">
                        Chưa chọn hội thoại
                      </div>
                    )}

                    {openConv && selectedConv && (
                      verifiedConvIds?.has(openConv) ? (
                        <div className="text-center p-3 bg-emerald-100/50 rounded-xl border border-emerald-200/50 text-xs text-emerald-700 font-semibold">
                          Bạn đã xác nhận KPI cho đoạn hội thoại này.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <button onClick={async () => {
                            if (!acc) return;
                            try {
                              await syncFbInbox({ leader_email: ownerEmail, member_email: userEmail, conv_ids: [openConv], user_id: acc, is_lead: false });
                              showToastKpi("Đã xác nhận inbox!", true);
                            } catch { showToastKpi("Lỗi xác nhận", false); }
                          }}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-on-primary-fixed-variant active:scale-[0.98]">
                            <MaterialIcon name="check" className="text-[16px]" /> Xác nhận Inbox
                          </button>
                          <button onClick={async () => {
                            if (!acc) return;
                            try {
                              await syncFbInbox({ leader_email: ownerEmail, member_email: userEmail, conv_ids: [openConv], user_id: acc, is_lead: true });
                              showToastKpi("Đã xác nhận Inbox + Lead!", true);
                              mark(openConv, "is_customer", true);
                            } catch { showToastKpi("Lỗi xác nhận lead", false); }
                          }}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98]">
                            <MaterialIcon name="star" className="text-[16px]" /> Xác nhận Inbox + Lead
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Member: Đề xuất KPI */}
                {(role !== "admin" && role !== "leader") && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="mb-1 text-xs font-black uppercase text-blue-600">Đề xuất KPI</div>
                    {openConv && selectedConv ? (
                      <button
                        disabled={verifiedConvIds?.has(openConv) || suggestedConvIds?.has(openConv)}
                        onClick={async () => { if (!acc || !userEmail) return; handleSuggestKpi({ member_email: userEmail, conv_ids: [openConv], user_id: acc }); }}
                        className={`w-full rounded-lg px-4 py-2.5 text-sm font-bold transition ${verifiedConvIds?.has(openConv) || suggestedConvIds?.has(openConv) ? "cursor-not-allowed bg-surface-container-highest text-on-surface-variant" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        {verifiedConvIds?.has(openConv) ? "Đã tính KPI" : suggestedConvIds?.has(openConv) ? "Đã đề xuất" : "Đề xuất tính KPI"}
                      </button>
                    ) : (
                      <div className="rounded-lg border border-dashed border-blue-300 bg-surface p-3 text-center text-xs text-blue-500">Chọn hội thoại để đề xuất KPI</div>
                    )}
                  </div>
                )}

                {/* Stats summary */}
                <div className="mb-3 text-sm font-black">Tổng quan inbox</div>
                {[
                  ["Cần trả lời", stats.need, activeConvs.length || 1, "bg-primary"],
                  ["Chưa đọc",    stats.unread,    activeConvs.length || 1, "bg-amber-500"],
                  ["Lead đã lưu", stats.customers, activeConvs.length || 1, "bg-emerald-500"],
                  ["Đã đẩy Zalo", stats.pushed,    activeConvs.length || 1, "bg-blue-500"],
                ].map(([label, value, total, color]) => {
                  const pct = Math.min(100, Math.round((Number(value) / Number(total)) * 100));
                  return (
                    <div key={String(label)} className="mb-3 rounded-lg border border-outline-variant p-3">
                      <div className="mb-2 flex justify-between text-xs font-bold">
                        <span>{String(label)}</span>
                        <span>{Number(value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {toast && <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3.5 font-semibold text-white shadow-lg ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>{toast.msg}</div>}
      {kpiToast && <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3.5 font-semibold text-white shadow-lg ${kpiToast.ok ? "bg-green-600" : "bg-red-600"}`}>{kpiToast.msg}</div>}

      <CrmCustomerModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        defaultConvId={openConv || undefined}
        defaultCustomerName={selectedName || undefined}
        defaultSourcePlatform="FB_Inbox"
      />
    </div>
  );
}
