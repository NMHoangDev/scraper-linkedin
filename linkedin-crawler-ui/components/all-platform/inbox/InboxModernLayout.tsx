"use client";

import { useMemo, useState } from "react";
import type { RefObject } from "react";
import { MaterialIcon } from "@/components/ui";
import TeamAccountTree from "@/components/all-platform/inbox/TeamAccountTree";

interface Session { user_id: string; fb_user_id?: string; label?: string; owner?: string; online?: boolean; inbox_enabled?: boolean; status?: string; }
interface Conv { conv_id: string; name: string; preview: string; unread: boolean; time: string; is_customer: boolean; pushed_to_zalo: boolean; deleted: boolean; archived?: boolean; archived_at?: string; }
interface ArchiveConv { conv_id: string; name: string; preview?: string; time?: string; archived_at?: string; last_saved_at?: string; archive_reason?: string; outcome?: string; note?: string; messages_count?: number; archived_by_name?: string; is_customer?: boolean; pushed_to_zalo?: boolean; }
interface Msg { from: "me" | "them"; text: string; time: string; clientId?: string; }
interface UserRow { id?: string; email?: string; name?: string; }
interface TeamRow { id?: string; name_team?: string; id_leader?: string; leader_name?: string; leader_email?: string; members?: UserRow[]; }

type InboxFilter = "all" | "unread" | "customer" | "need_reply";
type InboxViewMode = "inbox" | "archive";
type PanelTab = "templates" | "customer" | "kpi";

interface Props {
  role: string;
  owner: string;
  sessions: Session[];
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
  openArchive: (convId: string) => void;
  mark: (convId: string, field: string, value: boolean) => void;
  saveArchive: (convId: string, hide?: boolean) => void;
  saveCustomerNote: (convId: string, note: string) => void;
  sendReply: () => void;
  needsReply: (conv: Conv) => boolean;
  accLabel: (session: Session) => string;
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
    role,
    owner,
    sessions,
    ownerNames,
    teams,
    acc,
    accOnline,
    accPaused,
    needRelogin,
    connErr,
    extInstalled,
    scanning,
    loadingConvs,
    loadingArchives,
    loadingChat,
    loadingFresh,
    archiveReading,
    viewMode,
    filter,
    activeConvs,
    filtered,
    archives,
    openConv,
    msgs,
    reply,
    customerNotes,
    savingNoteConv,
    toast,
    chatScrollRef,
    selectAcc,
    scan,
    setViewMode,
    setArchiveReading,
    setFilter,
    setReply,
    openChat,
    openArchive,
    mark,
    saveArchive,
    saveCustomerNote,
    sendReply,
    needsReply,
    accLabel,
  } = props;

  const [panelTab, setPanelTab] = useState<PanelTab>("templates");
  const [templateGroupId, setTemplateGroupId] = useState(QUICK_REPLY_GROUPS[0].id);

  const selectedSession = sessions.find(s => s.user_id === acc);
  const selectedConv = activeConvs.find(c => c.conv_id === openConv) || filtered.find(c => c.conv_id === openConv);
  const selectedArchive = archives.find(a => a.conv_id === openConv);
  const selectedName = archiveReading ? selectedArchive?.name : selectedConv?.name;
  const selectedPreview = archiveReading ? selectedArchive?.preview : selectedConv?.preview;
  const selectedNote = openConv ? (customerNotes[openConv] ?? selectedArchive?.note ?? "") : "";
  const activeTemplateGroup = QUICK_REPLY_GROUPS.find(group => group.id === templateGroupId) || QUICK_REPLY_GROUPS[0];
  const [noteDraftState, setNoteDraftState] = useState({ convId: "", value: "" });
  const noteDraft = noteDraftState.convId === openConv ? noteDraftState.value : selectedNote;
  const setNoteDraft = (value: string) => setNoteDraftState({ convId: openConv, value });

  const noteChanged = noteDraft.trim() !== selectedNote.trim();

  const stats = useMemo(() => {
    const unread = activeConvs.filter(c => c.unread).length;
    const need = activeConvs.filter(needsReply).length;
    const customers = activeConvs.filter(c => c.is_customer).length;
    const pushed = activeConvs.filter(c => c.pushed_to_zalo).length;
    return { unread, need, customers, pushed };
  }, [activeConvs, needsReply]);

  const canSend = !!openConv && !archiveReading && accOnline && !accPaused && !needRelogin;
  const appendTemplate = (text: string) => {
    setReply(reply.trim() ? `${reply.trim()}\n${text}` : text);
  };

  const switchInbox = () => {
    setViewMode("inbox");
    setArchiveReading(false);
  };

  const confirmHide = (conv: Conv) => {
    if (window.confirm(`Ẩn "${conv.name || "hội thoại này"}" khỏi hộp thư? Markee sẽ lưu lại bản archive, không xóa trên Messenger.`)) {
      saveArchive(conv.conv_id, true);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden text-[#1A1A1A]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MaterialIcon name="inbox" className="text-[#E3000F]" />
            <h1 className="text-xl font-black">Inbox Facebook</h1>
          </div>
          <p className="mt-1 text-sm text-[#666666]">Quản lý hội thoại Messenger, lọc lead và trả lời nhanh bằng mẫu có sẵn.</p>
        </div>
        <button
          onClick={scan}
          disabled={scanning || !acc || !accOnline || needRelogin}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E3000F] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#C40009] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MaterialIcon name={scanning ? "sync" : "travel_explore"} className={`text-base ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Đang quét" : "Quét ngay"}
        </button>
      </div>

      {connErr && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Không kết nối được Facebook automation service. Kiểm tra backend product và Markee service.</div>}
      {needRelogin && <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Cookie tài khoản này đã hết hạn. Vào tab Tài khoản FB để đăng nhập lại.</div>}
      {role === "member" && extInstalled !== null && !sessions.some(s => s.owner === owner) && (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {extInstalled === false
            ? "Bạn chưa cài hoặc chưa mở extension Markee trên trình duyệt này."
            : "Extension đã sẵn sàng nhưng tài khoản Facebook của bạn chưa kết nối. Mở extension và đăng nhập Facebook để kết nối."}
        </div>
      )}

      <div className="mb-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-[#A0A0A0]">Hội thoại gần đây</div>
          <div className="mt-1 text-2xl font-black">{activeConvs.length}</div>
          <div className="text-xs text-[#A0A0A0]">{stats.unread} chưa đọc</div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-[#A0A0A0]">Cần trả lời</div>
          <div className="mt-1 text-2xl font-black text-[#E3000F]">{stats.need}</div>
          <div className="text-xs text-[#A0A0A0]">Ưu tiên xử lý trước</div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-[#A0A0A0]">Lead đã lưu</div>
          <div className="mt-1 text-2xl font-black">{stats.customers}</div>
          <div className="text-xs text-[#A0A0A0]">{stats.pushed} đã đẩy Zalo</div>
        </div>
        <div className="rounded-lg border border-[#E5E5E5] bg-white px-4 py-3">
          <div className="text-[11px] font-bold uppercase text-[#A0A0A0]">Tài khoản active</div>
          <div className="mt-1 text-2xl font-black">{sessions.filter(s => s.status === "online").length}</div>
          <div className="text-xs text-[#A0A0A0]">{sessions.length} tài khoản trong phạm vi</div>
        </div>
      </div>

      <div className="mb-4 min-w-0 rounded-lg border border-[#E5E5E5] bg-white p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold uppercase text-[#A0A0A0]">Tài khoản nhận viên</div>
            <div className="mt-0.5 flex items-center gap-2 text-sm font-bold">
              <span className={`h-2 w-2 rounded-full ${statusClasses(selectedSession?.status)}`} />
              {selectedSession ? accLabel(selectedSession) : "Chưa chọn tài khoản"}
              {selectedSession && <span className="text-xs font-semibold text-[#A0A0A0]">({statusLabel(selectedSession.status)})</span>}
            </div>
          </div>
          <div className="text-xs text-[#A0A0A0]">Online đọc/trả lời realtime, offline chỉ xem dữ liệu đã lưu.</div>
        </div>
        {sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-3 py-4 text-sm text-[#666666]">
            {extInstalled === false ? "Chưa thấy extension. Hãy cài và mở extension trên trình duyệt này." : "Chưa có tài khoản Facebook nào trong phạm vi được xem."}
          </div>
        ) : (role === "admin" || role === "leader") ? (
          <TeamAccountTree
            sessions={sessions}
            ownerNames={ownerNames}
            teams={teams}
            selectedAcc={acc}
            role={role}
            owner={owner}
            onSelect={selectAcc}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {sessions.map(session => (
              <button
                key={session.user_id}
                onClick={() => selectAcc(session.user_id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${acc === session.user_id ? "border-[#E3000F] bg-[#E3000F] text-white" : "border-[#E5E5E5] bg-white text-[#1A1A1A] hover:border-[#E3000F]"}`}
              >
                <span className={`h-2 w-2 rounded-full ${statusClasses(session.status)}`} />
                {accLabel(session)}
                <span className="text-[10px] opacity-70">{statusLabel(session.status)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(240px,300px)]">
        <section className="min-w-0 overflow-hidden rounded-lg border border-[#E5E5E5] bg-white">
          <div className="border-b border-[#E5E5E5] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Hộp thư</h2>
                <p className="text-xs text-[#A0A0A0]">{loadingConvs ? "Đang cập nhật..." : `${filtered.length} hội thoại đang hiển thị`}</p>
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as InboxFilter)}
                className="h-9 rounded-lg border border-[#E5E5E5] bg-white px-3 text-sm font-semibold outline-none focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20"
              >
                <option value="all">Tất cả</option>
                <option value="need_reply">Cần trả lời</option>
                <option value="unread">Chưa đọc</option>
                <option value="customer">Khách</option>
              </select>
            </div>
            <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F8F8F8] p-0.5">
              <button onClick={switchInbox} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === "inbox" ? "bg-white text-[#E3000F] shadow-sm" : "text-[#666666]"}`}>Hộp thư</button>
              <button onClick={() => setViewMode("archive")} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${viewMode === "archive" ? "bg-white text-[#E3000F] shadow-sm" : "text-[#666666]"}`}>Lưu trữ</button>
            </div>
          </div>

          <div className="h-[560px] overflow-auto p-3 2xl:h-[620px]">
            {viewMode === "archive" ? (
              loadingArchives && archives.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#A0A0A0]">Đang tải lưu trữ...</div>
              ) : archives.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#A0A0A0]">Chưa có hội thoại lưu trữ.</div>
              ) : archives.map(item => (
                <button
                  key={item.conv_id}
                  onClick={() => openArchive(item.conv_id)}
                  className={`mb-2 block w-full rounded-lg border p-3 text-left transition hover:border-[#E3000F] ${openConv === item.conv_id && archiveReading ? "border-[#E3000F] bg-[#FFF5F5]" : "border-[#E5E5E5] bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">{item.name || item.conv_id}</div>
                      <div className="mt-1 truncate text-xs text-[#A0A0A0]">{item.preview || "Không có preview"}</div>
                    </div>
                    <span className="whitespace-nowrap text-xs text-[#A0A0A0]">{item.messages_count || 0} tin</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.is_customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">khách</span>}
                    {item.pushed_to_zalo && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">đã đẩy Zalo</span>}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{item.archive_reason === "hidden_from_inbox" ? "đã ẩn" : "đã lưu"}</span>
                  </div>
                </button>
              ))
            ) : loadingConvs && filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#A0A0A0]">Đang tải hộp thư...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-[#A0A0A0]">Chưa có hội thoại gần đây.</div>
            ) : filtered.map(conv => (
              <button
                key={conv.conv_id}
                onClick={() => openChat(conv.conv_id)}
                className={`mb-2 block w-full rounded-lg border p-3 text-left transition hover:border-[#E3000F] ${openConv === conv.conv_id && !archiveReading ? "border-[#E3000F] bg-[#FFF5F5]" : "border-[#E5E5E5] bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={`truncate text-sm ${conv.unread ? "font-black" : "font-bold"}`}>{conv.name || "Người dùng Facebook"}</div>
                    <div className="mt-1 truncate text-xs text-[#A0A0A0]">{conv.preview || "Không có preview"}</div>
                  </div>
                  <span className="whitespace-nowrap text-xs text-[#A0A0A0]">{conv.time}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {needsReply(conv) && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">cần trả lời</span>}
                  {conv.unread && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">chưa đọc</span>}
                  {conv.is_customer && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">khách</span>}
                  {conv.pushed_to_zalo && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Zalo</span>}
                  {conv.archived && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">đã lưu</span>}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="flex h-[656px] min-w-0 flex-col overflow-hidden rounded-lg border border-[#E5E5E5] bg-white 2xl:h-[716px]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E5E5] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black">{selectedName || "Hội thoại"}</h2>
              <p className="truncate text-xs text-[#A0A0A0]">
                {selectedPreview || (openConv ? "Đang xem nội dung hội thoại" : "Chọn một hội thoại để bắt đầu")}
              </p>
            </div>
            {selectedConv && !archiveReading && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => mark(selectedConv.conv_id, "is_customer", !selectedConv.is_customer)} className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold hover:border-[#E3000F]">
                  {selectedConv.is_customer ? "Bỏ khách" : "Là khách"}
                </button>
                {selectedConv.is_customer && (
                  <button onClick={() => mark(selectedConv.conv_id, "pushed_to_zalo", !selectedConv.pushed_to_zalo)} className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold hover:border-[#E3000F]">
                    {selectedConv.pushed_to_zalo ? "Bỏ Zalo" : "Đẩy Zalo"}
                  </button>
                )}
                <button onClick={() => saveArchive(selectedConv.conv_id, false)} className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold hover:border-[#E3000F]">Lưu khách</button>
                <button onClick={() => confirmHide(selectedConv)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Ẩn</button>
              </div>
            )}
            {archiveReading && openConv && (
              <button onClick={() => { switchInbox(); openChat(openConv); }} className="rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-xs font-bold hover:border-[#E3000F]">Mở inbox live</button>
            )}
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-auto bg-[#FCFCFC] px-4 py-4">
            {!openConv ? (
              <div className="flex h-full items-center justify-center text-sm text-[#A0A0A0]">Chọn một hội thoại để xem tin nhắn.</div>
            ) : loadingChat && msgs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Đang tải hội thoại. Lần đầu có thể chờ 30-60s khi extension mở Messenger để quét.</div>
            ) : msgs.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {archiveReading
                  ? "Bản lưu này chưa có nội dung tin nhắn. Hãy mở hội thoại live một lần để tải thread rồi lưu lại."
                  : needRelogin
                    ? "Cookie tài khoản đã hết hạn. Đăng nhập lại tài khoản Facebook để lấy tin mới."
                    : accPaused
                      ? "Inbox realtime đang tạm dừng trong extension của nhân viên."
                      : !accOnline
                        ? "Tài khoản đang offline. Nhân viên cần mở máy và extension để lấy tin."
                        : "Chưa lấy được tin nhắn. Hãy đảm bảo extension đang bật và bấm quét lại."}
                {!archiveReading && accOnline && !needRelogin && (
                  <button onClick={() => openChat(openConv)} className="mt-3 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600">Quét lại hội thoại</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {msgs.map((message, index) => {
                  const { content, time } = displayMessage(message);
                  return (
                    <div key={`${index}-${message.clientId || time}`} className={`flex ${message.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] ${message.from === "me" ? "text-right" : "text-left"}`}>
                        <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${message.from === "me" ? "bg-[#E3000F] text-white" : "bg-white text-[#1A1A1A] shadow-sm ring-1 ring-[#E5E5E5]"}`}>
                          {content}
                        </div>
                        {time && <div className="mt-1 px-1 text-[10px] text-[#A0A0A0]">{time}</div>}
                      </div>
                    </div>
                  );
                })}
                {loadingFresh && <div className="text-center text-[11px] text-[#A0A0A0]">Đang cập nhật tin mới nhất...</div>}
              </div>
            )}
          </div>

          <div className="border-t border-[#E5E5E5] bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {activeTemplateGroup.items.slice(0, 3).map(item => (
                <button key={item} onClick={() => appendTemplate(item)} disabled={!openConv || archiveReading} className="rounded-full bg-[#F4F6FF] px-3 py-1 text-xs font-bold text-[#4F46E5] transition hover:bg-[#E9ECFF] disabled:cursor-not-allowed disabled:opacity-50">
                  {item.length > 34 ? `${item.slice(0, 34)}...` : item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                disabled={!canSend}
                rows={2}
                placeholder={archiveReading ? "Đang xem lưu trữ, mở inbox live để trả lời" : needRelogin ? "Cookie hết hạn, đăng nhập lại để gửi" : accPaused ? "Realtime đang tạm dừng" : !accOnline ? "Tài khoản offline" : "Nhập trả lời..."}
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm outline-none transition focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 disabled:cursor-not-allowed disabled:bg-[#F5F5F5]"
              />
              <button onClick={sendReply} disabled={!canSend || !reply.trim()} className="shrink-0 rounded-lg bg-[#E3000F] px-5 text-sm font-black text-white transition hover:bg-[#C40009] disabled:cursor-not-allowed disabled:opacity-50">Gửi</button>
            </div>
          </div>
        </section>

        <aside className="min-w-0 overflow-hidden rounded-lg border border-[#E5E5E5] bg-white xl:col-span-2 2xl:col-span-1 2xl:h-[716px]">
          <div className="grid grid-cols-3 border-b border-[#E5E5E5] bg-[#FAFAFA] text-xs font-black">
            <button onClick={() => setPanelTab("templates")} className={`py-3 ${panelTab === "templates" ? "bg-white text-[#E3000F]" : "text-[#666666]"}`}>Mẫu</button>
            <button onClick={() => setPanelTab("customer")} className={`py-3 ${panelTab === "customer" ? "bg-white text-[#E3000F]" : "text-[#666666]"}`}>Khách</button>
            <button onClick={() => setPanelTab("kpi")} className={`py-3 ${panelTab === "kpi" ? "bg-white text-[#E3000F]" : "text-[#666666]"}`}>KPI</button>
          </div>

          <div className="max-h-[520px] overflow-auto p-4 2xl:h-[676px] 2xl:max-h-none">
            {panelTab === "templates" && (
              <div>
                <div className="mb-3 text-sm font-black">Mẫu trả lời</div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {QUICK_REPLY_GROUPS.map(group => (
                    <button key={group.id} onClick={() => setTemplateGroupId(group.id)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${templateGroupId === group.id ? "bg-[#E3000F] text-white" : "bg-[#F5F5F5] text-[#666666] hover:text-[#1A1A1A]"}`}>
                      {group.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {activeTemplateGroup.items.map(item => (
                    <button key={item} onClick={() => appendTemplate(item)} disabled={!openConv || archiveReading} className="block w-full rounded-lg border border-[#E5E5E5] bg-white p-3 text-left text-sm leading-relaxed transition hover:border-[#E3000F] hover:bg-[#FFF8F8] disabled:cursor-not-allowed disabled:opacity-50">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {panelTab === "customer" && (
              <div>
                <div className="mb-3 text-sm font-black">Thông tin khách</div>
                {!openConv ? (
                  <div className="rounded-lg border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-4 text-sm text-[#A0A0A0]">Chọn hội thoại để xem thông tin.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-[#E5E5E5] p-3">
                      <div className="text-xs font-bold uppercase text-[#A0A0A0]">Tên hội thoại</div>
                      <div className="mt-1 text-sm font-black">{selectedName || openConv}</div>
                      <div className="mt-1 text-xs text-[#A0A0A0]">{selectedPreview || "Chưa có preview"}</div>
                    </div>
                    <div className="rounded-lg border border-[#E5E5E5] bg-[#FFFDF7] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold uppercase text-[#A0A0A0]">Ghi chú nhu cầu</div>
                          <div className="text-[11px] text-[#A0A0A0]">Lưu điểm cần nhớ về khách này.</div>
                        </div>
                        {selectedNote && !noteChanged && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">đã lưu</span>}
                      </div>
                      <textarea
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        disabled={!openConv || savingNoteConv === openConv}
                        rows={5}
                        maxLength={1000}
                        placeholder="VD: khách cần app booking, muốn báo giá trong tuần, đã xin Zalo..."
                        className="w-full resize-none rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 disabled:cursor-not-allowed disabled:bg-[#F5F5F5]"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#A0A0A0]">{noteDraft.trim().length}/1000</span>
                        <button
                          onClick={() => saveCustomerNote(openConv, noteDraft)}
                          disabled={!openConv || savingNoteConv === openConv || !noteChanged}
                          className="rounded-lg bg-[#E3000F] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#C40009] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingNoteConv === openConv ? "Đang lưu..." : "Lưu ghi chú"}
                        </button>
                      </div>
                    </div>
                    {selectedConv && !archiveReading && (
                      <div className="grid gap-2">
                        <button onClick={() => mark(selectedConv.conv_id, "is_customer", !selectedConv.is_customer)} className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-bold hover:border-[#E3000F]">{selectedConv.is_customer ? "Bỏ đánh dấu khách" : "Đánh dấu là khách"}</button>
                        <button onClick={() => saveArchive(selectedConv.conv_id, false)} className="rounded-lg border border-[#E5E5E5] px-3 py-2 text-sm font-bold hover:border-[#E3000F]">Lưu khách</button>
                        <button onClick={() => confirmHide(selectedConv)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50">Ẩn khỏi hộp thư</button>
                      </div>
                    )}
                    {archiveReading && <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Đây là bản lưu trữ. Mở inbox live nếu cần trả lời tiếp.</div>}
                  </div>
                )}
              </div>
            )}

            {panelTab === "kpi" && (
              <div>
                <div className="mb-3 text-sm font-black">Tổng quan inbox</div>
                {[
                  ["Cần trả lời", stats.need, activeConvs.length || 1, "bg-[#E3000F]"],
                  ["Chưa đọc", stats.unread, activeConvs.length || 1, "bg-amber-500"],
                  ["Lead đã lưu", stats.customers, activeConvs.length || 1, "bg-emerald-500"],
                  ["Đã đẩy Zalo", stats.pushed, activeConvs.length || 1, "bg-blue-500"],
                ].map(([label, value, total, color]) => {
                  const numericValue = Number(value);
                  const numericTotal = Number(total);
                  const percent = Math.min(100, Math.round((numericValue / numericTotal) * 100));
                  return (
                    <div key={String(label)} className="mb-3 rounded-lg border border-[#E5E5E5] p-3">
                      <div className="mb-2 flex justify-between text-xs font-bold">
                        <span>{label}</span>
                        <span>{numericValue}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#F0F0F0]">
                        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
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
    </div>
  );
}
