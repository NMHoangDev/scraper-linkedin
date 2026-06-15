"use client";

/**
 * Virtualized list cho Zalo Conversation Sidebar.
 *
 * Tại sao cần: Khi account có 246+ groups (như tài khoản ho-ng), render toàn bộ
 * items vào DOM gây lag khi scroll, scrollbar giật, FPS tụt. Virtualization
 * chỉ render ~15 items thực sự hiển thị + buffer, giữ FPS ổn định 60.
 *
 * Thư viện: @tanstack/react-virtual (3KB, native React 19 support, no peer deps).
 *
 * Cách hoạt động:
 *   - Component cha truyền `height` (tính từ container height qua ResizeObserver).
 *   - Component đo từng row = 72px (chiều cao cố định của conversation item).
 *   - Chỉ render items trong viewport + overscan 5 items.
 *
 * Không phá logic hiện tại:
 *   - Component này wrap conversation item, không thay đổi props của nó.
 *   - Search filter hoạt động bình thường (parent filter rồi truyền vào).
 *   - Selection state do parent quản lý.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ZaloConversationListSkeleton } from "../chat/ZaloChatSkeleton";
import type { ZaloConversationSummary } from "@/types/zalo-api";
import { MaterialIcon } from "@/components/ui";
import { InboxShareToggle } from "../InboxShareToggle";
import { useAppAuth } from "@/contexts/AppAuthContext";

interface Props {
  conversations: ZaloConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  isLoading?: boolean;
  /** Bật tick "share với leader" trên mỗi conversation (cho luồng Tin nhắn KPI) */
  enableInboxShare?: boolean;
  /** accountId (Zalo) hiện tại của sidebar */
  accountId?: string;
  /** Chế độ full-screen: tăng kích thước UI (font/row) cho dễ nhìn */
  fullScreen?: boolean;
}

const ROW_HEIGHT_DEFAULT = 72; // px — match với padding + content của conversation item
const ROW_HEIGHT_FULL = 88;   // px — lớn hơn cho chế độ fullScreen
const OVERSCAN = 5;           // render thêm 5 items trên/dưới viewport

export function ZaloConversationListVirtualized({
  conversations,
  selectedId,
  onSelect,
  searchQuery,
  isLoading = false,
  enableInboxShare = false,
  accountId,
  fullScreen = false,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [parentHeight, setParentHeight] = useState(0);

  // Đo height của container thật qua ResizeObserver.
  // Quan trọng: virtualization cần height chính xác để tính viewport.
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      setParentHeight(height);
    });
    observer.observe(el);
    // Set initial height ngay lập tức (tránh flash 0px)
    setParentHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (fullScreen ? ROW_HEIGHT_FULL : ROW_HEIGHT_DEFAULT),
    overscan: OVERSCAN,
  });

  // Auto-scroll đến conversation đang được chọn khi selectedId thay đổi từ bên ngoài
  // (vd: search → click result ở nơi khác → sidebar cần cuộn tới đó).
  useEffect(() => {
    if (!selectedId) return;
    const idx = conversations.findIndex((c) => c.conversation_id === selectedId);
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: "auto" });
    }
  }, [selectedId, conversations, virtualizer]);

  const totalSize = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();

  if (isLoading && conversations.length === 0) {
    return <ZaloConversationListSkeleton count={10} />;
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center bg-white h-full">
        <p className="text-sm text-slate-400 leading-relaxed">
          {searchQuery
            ? "Không tìm thấy hội thoại phù hợp"
            : "Chưa có hội thoại. Bấm Đồng bộ để tải về."}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent"
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const conv = conversations[virtualRow.index];
          if (!conv) return null;
          const isActive = conv.conversation_id === selectedId;
          const title = conv.conversation_name || `Hội thoại ${conv.conversation_id.slice(0, 6)}`;
          return (
            <div
              key={conv.conversation_id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(conv.conversation_id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(conv.conversation_id);
                  }
                }}
                className={`w-full h-full flex items-center gap-3 cursor-pointer ${
                  fullScreen ? "px-5 gap-4" : "px-4"
                } text-left transition border-b border-slate-50 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
                  isActive
                    ? "bg-blue-50/50 relative before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500 before:rounded-r-md"
                    : ""
                }`}
              >
                <div
                  className={`${
                    fullScreen ? "h-14 w-14 text-lg" : "h-12 w-12 text-title-md"
                  } shrink-0 rounded-full flex items-center justify-center font-semibold ${
                    isActive
                      ? "bg-[#E3000F] text-white"
                      : "bg-red-50 text-red-600 border border-red-100"
                  }`}
                >
                  {initials(title)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div
                      className={`${
                        fullScreen ? "text-[15px]" : ""
                      } font-semibold truncate text-on-surface ${
                        conv.unread_count && conv.unread_count > 0
                          ? "font-bold"
                          : ""
                      }`}
                    >
                      {title}
                    </div>
                    <div className={`${
                      fullScreen ? "text-[13px]" : "text-xs"
                    } text-on-surface-variant shrink-0`}>
                      {formatTime(conv.latest_message_at)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-xs">
                    <div
                      className={`${
                        fullScreen ? "text-[14px]" : "text-sm"
                      } truncate flex-1 ${
                        conv.unread_count && conv.unread_count > 0
                          ? "text-on-surface font-semibold"
                          : isActive
                            ? "text-on-surface font-medium"
                            : "text-on-surface-variant"
                      }`}
                    >
                      {conv.latest_sender_name
                        ? `${conv.latest_sender_name}: `
                        : ""}
                      {conv.latest_content || "Tin nhắn mới"}
                    </div>
                    {conv.unread_count !== undefined &&
                      conv.unread_count > 0 && (
                        <span className={`flex ${
                          fullScreen ? "h-6 min-w-6 text-[11px]" : "h-5 min-w-5 text-[10px]"
                        } shrink-0 items-center justify-center rounded-full bg-red-500 px-1 font-bold text-white shadow-sm`}>
                          {conv.unread_count}
                        </span>
                      )}
                  </div>
                </div>
                {enableInboxShare && accountId && (
                  <InboxShareToggle
                    accountId={accountId}
                    conversationId={conv.conversation_id}
                    showLabel={false}
                    size="sm"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers (copy từ ZaloChatView để component độc lập) ───────────────────

function formatTime(value?: string | null) {
  if (!value) return "";
  const num = Number(value);
  const date =
    !Number.isNaN(num) && String(num) === String(value).trim()
      ? new Date(num)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function initials(value: string) {
  const words = value
    .replace(/^\[|\]$/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? "Z";
  const second = words.length > 1 ? words[words.length - 1]?.[0] : "";
  return `${first}${second}`.toUpperCase();
}
