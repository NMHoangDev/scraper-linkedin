"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MaterialIcon } from "@/components/ui";
import type { ZaloCrawlerFlowValue } from "@/hooks/useZaloCrawlerFlow";
import {
  getZaloConversationMessages,
  getZaloConversations,
  syncZaloRecentConversations,
  createZaloBroadcast,
  sendZaloMessage,
  sendZaloMessageWithFiles,
  markZaloConversationAsRead,
  buildZaloRealtimeStreamUrl,
  getZaloConversationShareStatus,
  setZaloConversationShare,
} from "@/services/zaloCrawlerService";
import type {
  ZaloConversationSummary,
  ZaloLibraryMessage,
  ZaloSyncRecentResponse,
  ZaloBroadcastTarget,
} from "@/types/zalo-api";
import { ZaloChatHeaderSkeleton, ZaloMessageListSkeleton } from "./chat/ZaloChatSkeleton";
import { ZaloEmptyChat } from "./chat/ZaloEmptyChat";
import { ZaloConversationListVirtualized } from "./sidebar/ZaloConversationListVirtualized";
import { ZaloNewChatModal } from "./ZaloNewChatModal";
import { ZaloKpiPanel } from "./ZaloKpiPanel";

const REFRESH_INTERVAL_MS = 2000;
const MESSAGE_PAGE_SIZE = 50;
const SYNC_CONVERSATION_LIMIT = 50;
const SYNC_MESSAGES_PER_CONVERSATION = 50;
const BOTTOM_THRESHOLD_PX = 96;

interface ZaloChatViewProps {
  flow: ZaloCrawlerFlowValue;
  onBackToDashboard: () => void;
  /**
   * Chế độ full-screen: tăng kích thước UI (font/padding/bubble) cho dễ nhìn.
   * Dùng khi trang này là 1 route độc lập (vd /zalo-chat) thay vì embed trong shell.
   */
  fullScreen?: boolean;
}

function formatTime(value?: string | null) {
  if (!value) return "Chưa có";
  const trimmed = String(value).trim();

  // Case 1: chuỗi số thuần — là timestamp từ Zalo / backend
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    // Zalo trả ms (13 chữ số = 2026). Một số client cũ trả về seconds (10 chữ số = 2026 cũngng có thể).
    // 13 chữ số = ms (> 10^12). 10 chữ số = seconds (< 10^11).
    // Nếu < 10^11 → nhân 1000 để ra ms.
    const ms = num > 1e11 ? num : num * 1000;
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    });
  }

  // Case 2: ISO string — backend lưu UTC với 'Z' (vd "2026-06-14T09:36:19.531Z")
  // Browser sẽ tự parse thành Date object ở UTC. Sau đó hiển thị theo VN.
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function shortId(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function isFallbackName(name: string | null | undefined, id: string) {
  const cleanName = String(name || "").trim();
  return !cleanName || cleanName === id || cleanName === `Conversation ${id}`;
}

function conversationTitle(conversation: ZaloConversationSummary | null) {
  if (!conversation) return "Chọn một hội thoại";
  if (isFallbackName(conversation.conversation_name, conversation.conversation_id)) {
    return "Hội thoại chưa đặt tên";
  }
  return conversation.conversation_name;
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

// Nhận diện lỗi backend báo phiên Zalo hết hạn (HTTP 401 + thông điệp/code).
function isSessionExpiredError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error || "")).toLowerCase();
  return (
    msg.includes("zca_session_expired") ||
    msg.includes("session_expired") ||
    msg.includes("hết hạn") ||
    msg.includes("đăng nhập lại") ||
    msg.includes("api 401")
  );
}

function conversationTimeMs(conversation: ZaloConversationSummary) {
  const value = conversation.latest_message_at;
  if (!value) return 0;
  const num = Number(value);
  if (!Number.isNaN(num) && String(num) === String(value).trim()) {
    return num < 1e11 ? num * 1000 : num;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Sắp xếp sidebar giống Zalo: pinned trước -> last_message_at DESC.
// unread_count CHỈ dùng để hiển thị badge, không tham gia thứ tự.
function sortConversationsLikeZalo(list: ZaloConversationSummary[]) {
  return [...list].sort((a, b) => {
    const pinA = a.is_pinned ? 1 : 0;
    const pinB = b.is_pinned ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const tA = conversationTimeMs(a);
    const tB = conversationTimeMs(b);
    if (tA !== tB) return tB - tA;

    return (a.conversation_name || "").localeCompare(b.conversation_name || "");
  });
}

function messageKey(message: ZaloLibraryMessage) {
  return message.id || message.source_message_id || `${message.group_id}-${message.timestamp_text}-${message.content}`;
}

function isNearBottom(element: HTMLDivElement | null) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX;
}

function messageAssets(message: ZaloLibraryMessage) {
  const list = (message.assets || []).filter((asset) => asset.status === "uploaded" && asset.storage_url);
  const seen = new Set<string>();
  const deduped: typeof list = [];
  for (const asset of list) {
    const src = asset.source_url || "";
    const filename = src.split("/").pop()?.split("?")[0] || src;
    if (filename && seen.has(filename)) {
      continue;
    }
    if (filename) {
      seen.add(filename);
    }
    deduped.push(asset);
  }
  return deduped;
}

interface SelectedMedia {
  file: File;
  previewUrl?: string;
}

const EMOJI_CATEGORIES = [
  {
    name: "Cảm xúc",
    emojis: ["😊", "😂", "🥰", "😍", "😉", "😘", "😜", "😎", "🤩", "🥳", "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😇", "🙂", "🙃", "😌", "😋", "😛", "😝", "😜", "🤪", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤔", "🤭", "🤫", "🤥", "😬", "🙄"]
  },
  {
    name: "Cử chỉ",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "👋", "🤚", "🖐️", "✋", "🖖", "✍️", "💅", "🤳", "💪"]
  },
  {
    name: "Yêu thích",
    emojis: ["❤️", "💖", "💘", "💝", "💕", "💞", "💓", "💗", "❣️", "💟", "💌", "💔", "❤️‍🔥", "❤️‍🩹", "🔥", "✨", "⭐", "🌟", "💫", "💥", "💯", "🎉", "🎁", "🎈", "🍻", "☕", "🍕", "🧁", "🍓", "🐱", "🐶", "🌸", "🍀"]
  }
];

const QUICK_REPLIES = [
  "Dạ chào anh/chị, bên em là đơn vị chuyên cung cấp dịch vụ thiết kế Website chuyên nghiệp, chuẩn SEO và tối ưu trải nghiệm người dùng ạ.",
  "Công ty em hiện đang phát triển các giải pháp AI Chatbot thông minh, giúp tự động chăm sóc khách hàng 24/7 và tăng tỷ lệ chuyển đổi hiệu quả.",
  "Bên em có các bộ Tool tự động hóa quy trình nghiệp vụ, hỗ trợ doanh nghiệp tiết kiệm chi phí nhân sự và tối ưu hiệu suất làm việc ạ.",
  "Anh/chị đang có nhu cầu xây dựng hệ thống phần mềm quản lý hay website thương mại điện tử? Bên em có thể tư vấn giải pháp chi tiết nhé.",
  "Dạ em gửi anh/chị profile năng lực và các dự án tiêu biểu bên em đã triển khai để mình tham khảo thêm ạ."
];

export function ZaloChatView({ flow, onBackToDashboard, fullScreen = false }: ZaloChatViewProps) {
  const [conversations, setConversations] = useState<ZaloConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ZaloLibraryMessage[]>([]);
  const [messageTotal, setMessageTotal] = useState(0);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isSyncingRecent, setIsSyncingRecent] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<ZaloSyncRecentResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Chat UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "inactive">("all");
  const [inputText, setInputText] = useState("");
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [newChatToast, setNewChatToast] = useState<string | null>(null);
  
  // Auto send / Broadcast states
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [autoSendTargetIds, setAutoSendTargetIds] = useState<string[]>([]);
  const [autoSendSearchQuery, setAutoSendSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [autoSendSuccess, setAutoSendSuccess] = useState<string | null>(null);
  const [autoSendError, setAutoSendError] = useState<string | null>(null);
  const [isAutoSendOpen, setIsAutoSendOpen] = useState(true);

  // Direct send state
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSendError, setDirectSendError] = useState<string | null>(null);

  // New media send and emoji states
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);

  // Quick replies states
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Realtime SSE state (mới ở bước 7).
  // Khi sseConnected=true → có thể giảm polling interval.
  const [sseConnected, setSseConnected] = useState(false);

  // Share status per conversation: Map<conversation_id, ZaloShareStatus>
  // Dùng để hiển thị icon "share với admin/leader" ở sidebar + toggle ở header.
  const [shareStatus, setShareStatus] = useState<
    Record<string, { admin: boolean; leader: boolean }>
  >({});

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const quickRepliesRef = useRef<HTMLDivElement | null>(null);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<"bottom" | "preserve" | null>(null);
  const preservedScrollRef = useRef<{ previousHeight: number; previousTop: number }>({ previousHeight: 0, previousTop: 0 });
  // Track the request currently fetching messages so we can ignore stale responses
  // when the user switches groups faster than the API responds.
  const messagesRequestIdRef = useRef(0);
  const lastLoadedConversationIdRef = useRef<string | null>(null);

  // Click outside listener for emoji picker & quick replies
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (quickRepliesRef.current && !quickRepliesRef.current.contains(event.target as Node)) {
        setShowQuickReplies(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedAccount = useMemo(
    () => flow.accounts.find((account) => account.account_id === flow.userId) ?? null,
    [flow.accounts, flow.userId],
  );

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversation_id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  // Build a minimal "view model" for the chat header so we can keep rendering messages
  // even when the conversation summary hasn't been fetched yet (or the polling
  // momentarily dropped it from `conversations`). The Messages Area only depends on
  // `selectedConversationId`, not on this object.
  const selectedConversationView = useMemo<{
    conversation_id: string;
    conversation_name: string;
    avatar_url: string | null;
  } | null>(() => {
    if (!selectedConversationId) return null;
    if (selectedConversation) {
      return {
        conversation_id: selectedConversation.conversation_id,
        conversation_name: conversationTitle(selectedConversation),
        avatar_url: selectedConversation.avatar_url ?? null,
      };
    }
    return {
      conversation_id: selectedConversationId,
      conversation_name: `Hội thoại ${shortId(selectedConversationId, 8, 4)}`,
      avatar_url: null,
    };
  }, [selectedConversation, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        (c.conversation_name || "").toLowerCase().includes(q) || 
        (c.latest_content || "").toLowerCase().includes(q)
      );
    }
    
    if (activeTab === "unread") {
      filtered = filtered.filter(c => 
        (c.unread_count !== undefined && c.unread_count > 0) ||
        (c.unread_count === undefined && c.message_count > 0 && c.latest_sender_name !== "Bạn")
      );
    } else if (activeTab === "inactive") {
      filtered = filtered.filter(c => 
        c.message_count === 0 || c.has_messages === false || c.sync_status === "known_empty"
      );
    }
    return filtered;
  }, [conversations, searchQuery, activeTab]);

  const loadConversations = useCallback(async (options?: { silent?: boolean }) => {
    if (!flow.userId || flow.userId === "default") {
      setConversations([]);
      setSelectedConversationId(null);
      return;
    }
    if (!options?.silent) setIsLoadingConversations(true);
    setConversationError(null);
    try {
      const response = await getZaloConversations(flow.userId);
      const nextConversations = sortConversationsLikeZalo(response.conversations ?? []);
      setConversations(nextConversations);
      setSelectedConversationId((current) => {
        if (current && nextConversations.some((item) => item.conversation_id === current)) {
          return current;
        }
        return nextConversations[0]?.conversation_id ?? null;
      });
    } catch (error) {
      setConversationError(error instanceof Error ? error.message : "Không thể tải danh sách hội thoại.");
    } finally {
      if (!options?.silent) setIsLoadingConversations(false);
    }
  }, [flow.userId]);

  const loadLatestMessages = useCallback(async (conversationId: string | null, options?: { silent?: boolean }) => {
    if (!flow.userId || flow.userId === "default" || !conversationId) {
      setMessages([]);
      setMessageTotal(0);
      setHasOlderMessages(false);
      lastLoadedConversationIdRef.current = null;
      return;
    }
    // Bump request id so any in-flight responses for a different conversation get ignored.
    const requestId = ++messagesRequestIdRef.current;
    if (!options?.silent) setIsLoadingMessages(true);
    setMessageError(null);
    try {
      const response = await getZaloConversationMessages(
        flow.userId,
        conversationId,
        MESSAGE_PAGE_SIZE,
        0,
      );
      // Drop stale response if the user navigated to another conversation meanwhile.
      if (requestId !== messagesRequestIdRef.current) return;
      lastLoadedConversationIdRef.current = conversationId;
      pendingScrollRef.current = "bottom";
      setMessages(response.messages ?? []);
      setMessageTotal(response.total ?? 0);
      setHasOlderMessages(Boolean(response.has_more));
      setNewMessageCount(0);
    } catch (error) {
      if (requestId !== messagesRequestIdRef.current) return;
      setMessageError(error instanceof Error ? error.message : "Không thể tải tin nhắn hội thoại.");
    } finally {
      if (requestId === messagesRequestIdRef.current && !options?.silent) {
        setIsLoadingMessages(false);
      }
    }
  }, [flow.userId]);

  const pollLatestMessages = useCallback(async (conversationId: string | null) => {
    if (!flow.userId || flow.userId === "default" || !conversationId) return;
    // Don't poll if the latest explicit load hasn't finished for this conversation yet —
    // otherwise the initial fetch can race with the polling request and the UI may flicker.
    if (lastLoadedConversationIdRef.current !== conversationId) return;
    const shouldStickToBottom = isNearBottom(messageListRef.current);
    try {
      const response = await getZaloConversationMessages(
        flow.userId,
        conversationId,
        MESSAGE_PAGE_SIZE,
        0,
      );
      // Skip if the user switched conversations while the request was in flight.
      if (lastLoadedConversationIdRef.current !== conversationId) return;
      const latestMessages = response.messages ?? [];
      setMessageTotal(response.total ?? 0);
      setHasOlderMessages((response.total ?? 0) > messages.length);
      setMessages((current) => {
        const latestMap = new Map(latestMessages.map(m => [messageKey(m), m]));

        // Update existing messages, and track which ones from latestMessages we have seen
        const updated = current.map(m => {
          const key = messageKey(m);
          if (latestMap.has(key)) {
            return latestMap.get(key)!;
          }
          return m;
        });

        // Find messages in latestMessages that are not in current
        const existingKeys = new Set(current.map(messageKey));
        const newMessages = latestMessages.filter(m => !existingKeys.has(messageKey(m)));

        if (newMessages.length === 0) {
          const hasChanges = current.some((m, idx) => {
            const key = messageKey(m);
            if (!latestMap.has(key)) return false;
            const next = latestMap.get(key)!;
            return JSON.stringify(m) !== JSON.stringify(next);
          });
          return hasChanges ? updated : current;
        }

        if (!shouldStickToBottom) setNewMessageCount((count) => count + newMessages.length);
        if (shouldStickToBottom) pendingScrollRef.current = "bottom";

        return [...updated, ...newMessages];
      });
    } catch {
      // Silent polling should not interrupt the operator while they are reading.
    }
  }, [flow.userId, messages.length]);

  const loadOlderMessages = useCallback(async () => {
    if (!flow.userId || !selectedConversationId || isLoadingOlderMessages || !hasOlderMessages) return;
    const element = messageListRef.current;
    const previousHeight = element?.scrollHeight ?? 0;
    const previousTop = element?.scrollTop ?? 0;
    setIsLoadingOlderMessages(true);
    setMessageError(null);
    try {
      const response = await getZaloConversationMessages(
        flow.userId,
        selectedConversationId,
        MESSAGE_PAGE_SIZE,
        messages.length,
      );
      const olderMessages = response.messages ?? [];
      preservedScrollRef.current = { previousHeight, previousTop };
      pendingScrollRef.current = "preserve";
      setMessages((current) => {
        const existing = new Set(current.map(messageKey));
        const uniqueOlder = olderMessages.filter((message) => !existing.has(messageKey(message)));
        return [...uniqueOlder, ...current];
      });
      setMessageTotal(response.total ?? messageTotal);
      setHasOlderMessages(messages.length + olderMessages.length < (response.total ?? 0));
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Không thể tải tin nhắn cũ hơn.");
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [flow.userId, hasOlderMessages, isLoadingOlderMessages, messageTotal, messages.length, selectedConversationId]);

  const scrollToLatest = useCallback(() => {
    const element = messageListRef.current;
    if (element) element.scrollTop = element.scrollHeight;
    setNewMessageCount(0);
  }, []);

  /**
   * Sau khi user tìm thấy Zalo user lạ và bấm "Nhắn tin" trong modal:
   *   1. Reload danh sách conversations (để thread mới xuất hiện trong sidebar)
   *   2. Auto-select conversation mới tạo để mở khung chat ngay
   *   3. Hiển thị toast thông báo trong ~4s
   */
  const handleNewChatReady = useCallback(
    async (conversationId: string) => {
      try {
        await loadConversations({ silent: true });
      } catch (err) {
        console.warn("[zalo] reload conversations after new chat failed", err);
      }
      setSelectedConversationId(conversationId);
      setNewChatToast("Đã mở cuộc trò chuyện mới");
      window.setTimeout(() => setNewChatToast(null), 4000);
    },
    [loadConversations],
  );

  const syncRecentConversations = useCallback(async () => {
    if (!flow.userId || flow.userId === "default" || isSyncingRecent) return;
    setIsSyncingRecent(true);
    setSyncSummary(null);
    setSyncError(null);
    try {
      const response = await syncZaloRecentConversations(
        flow.userId,
        SYNC_CONVERSATION_LIMIT,
        SYNC_MESSAGES_PER_CONVERSATION,
      );
      setSyncSummary(response);
      if (response.errors === response.scanned && response.scanned > 0) {
        setSyncError(
          `Đồng bộ thất bại (quét ${response.scanned} nhóm, lỗi toàn bộ). Listener Zalo có thể chưa kết nối.`,
        );
      }
      await loadConversations();
      if (selectedConversationId) await loadLatestMessages(selectedConversationId, { silent: true });
    } catch (error) {
      if (isSessionExpiredError(error)) {
        setSyncError("Phiên đăng nhập Zalo đã hết hạn. Vui lòng đăng nhập lại bằng mã QR.");
        void flow.refreshLoginStatus();
      } else {
        setSyncError(error instanceof Error ? error.message : "Không thể đồng bộ tin nhắn.");
      }
    } finally {
      setIsSyncingRecent(false);
    }
  }, [flow, isSyncingRecent, loadConversations, loadLatestMessages, selectedConversationId]);

  useEffect(() => {
    const action = pendingScrollRef.current;
    if (!action) return;
    pendingScrollRef.current = null;
    const element = messageListRef.current;
    if (!element) return;
    if (action === "bottom") {
      element.scrollTop = element.scrollHeight;
    } else if (action === "preserve") {
      const { previousHeight, previousTop } = preservedScrollRef.current;
      element.scrollTop = element.scrollHeight - previousHeight + previousTop;
    }
  }, [messages]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    // Only react to changes in selectedConversationId (not loadLatestMessages reference).
    // Bump request id so any in-flight load for a different conversation is invalidated.
    messagesRequestIdRef.current += 1;
    if (lastLoadedConversationIdRef.current !== selectedConversationId) {
      setMessages([]);
      setMessageTotal(0);
      setHasOlderMessages(false);
      setNewMessageCount(0);
      setSelectedMessageIds([]); // Reset selection when switching conversations
      lastLoadedConversationIdRef.current = null;
    }
    void loadLatestMessages(selectedConversationId);

    if (selectedConversationId && flow.userId && flow.userId !== "default") {
      void markZaloConversationAsRead(flow.userId, selectedConversationId)
        .then(() => {
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === selectedConversationId
                ? { ...c, unread_count: 0 }
                : c
            )
          );
        })
        .catch((err) => {
          console.error("Failed to mark conversation as read:", err);
        });
    }
  }, [selectedConversationId, flow.userId, loadLatestMessages]);

  useEffect(() => {
    // Đọc interval động mỗi lần fire — không cần restart timer khi sseConnected đổi.
    // Cách này tránh warning "useEffect deps changed size" và tránh re-mount interval.
    const intervalMs = sseConnected ? 5000 : REFRESH_INTERVAL_MS;
    const timer = window.setInterval(() => {
      void loadConversations({ silent: true });
      void pollLatestMessages(selectedConversationId);
    }, intervalMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations, pollLatestMessages, selectedConversationId, sseConnected]);

  // ── Realtime SSE (mới ở bước 7) ────────────────────────────────────────────
  // Mount EventSource khi có userId hợp lệ. Khi nhận event zalo-message mà
  // group_id trùng với conversation đang mở → append vào state (dedup theo
  // message_id). Khi SSE fail → browser tự reconnect, không cần lo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!flow.userId || flow.userId === "default") {
      console.info("[zalo-sse] skip mount: userId not ready", { userId: flow.userId });
      setSseConnected(false);
      return;
    }

    let cancelled = false;
    let source: EventSource | null = null;
    const url = buildZaloRealtimeStreamUrl({ userId: flow.userId });
    console.info("[zalo-sse] mounting EventSource", { url, userId: flow.userId });

    try {
      source = new EventSource(url);
    } catch (err) {
      // Browser không hỗ trợ EventSource hoặc URL lỗi — fallback polling.
      console.warn("[zalo-sse] cannot open EventSource", err);
      setSseConnected(false);
      return;
    }

    source.addEventListener("ready", (e) => {
      if (!cancelled) {
        console.info("[zalo-sse] ready", e.data);
        setSseConnected(true);
      }
    });

    source.addEventListener("heartbeat", () => {
      if (!cancelled) setSseConnected(true);
    });

    source.addEventListener("zalo-message", (e: MessageEvent) => {
      if (cancelled) return;
      try {
        const event = JSON.parse(e.data);
        console.info("[zalo-sse] zalo-message", event);
        if (!event || event.type !== "new_messages") return;
        const groupId = String(event.group_id || "").trim();
        if (!groupId) return;
        // Chỉ append khi đang mở đúng group (không chuyển tab tự động).
        if (groupId !== lastLoadedConversationIdRef.current) {
          // Vẫn refresh sidebar (loadConversations sẽ tự chạy qua polling).
          return;
        }
        const newMessages = Array.isArray(event.messages) ? event.messages : [];
        if (newMessages.length === 0) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const additions = newMessages.filter(
            (m: ZaloLibraryMessage) => m?.id && !seen.has(m.id)
          );
          if (additions.length === 0) return prev;
          return [...prev, ...additions];
        });
      } catch (err) {
        console.warn("[zalo-sse] failed to parse event", err);
      }
    });

    source.addEventListener("error", (e: Event) => {
      // Browser EventSource tự động reconnect. Chỉ set state để UI biết.
      console.warn("[zalo-sse] error event", { readyState: source?.readyState, event: e });
      if (!cancelled) setSseConnected(false);
    });

    source.onopen = () => {
      console.info("[zalo-sse] connection open", { url });
    };

    return () => {
      cancelled = true;
      setSseConnected(false);
      try {
        source?.close();
        console.info("[zalo-sse] closed EventSource", { userId: flow.userId });
      } catch (_) {
        /* ignore */
      }
    };
  }, [flow.userId]);

  const handleToggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const autoSendFilteredConversations = useMemo(() => {
    if (!autoSendSearchQuery) return conversations;
    const q = autoSendSearchQuery.toLowerCase();
    return conversations.filter(c =>
      (c.conversation_name || "").toLowerCase().includes(q) ||
      (c.latest_content || "").toLowerCase().includes(q)
    );
  }, [conversations, autoSendSearchQuery]);

  const handleToggleAutoSendTarget = (conversationId: string) => {
    setAutoSendTargetIds(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleAutoSend = async () => {
    if (!flow.userId || selectedMessageIds.length === 0 || autoSendTargetIds.length === 0) return;
    setIsSending(true);
    setAutoSendError(null);
    setAutoSendSuccess(null);

    const targets: ZaloBroadcastTarget[] = autoSendTargetIds
      .map((id): ZaloBroadcastTarget | null => {
        const conv = conversations.find(c => c.conversation_id === id);
        if (!conv) return null;
        const name = isFallbackName(conv.conversation_name, conv.conversation_id)
          ? conv.conversation_id
          : (conv.conversation_name || conv.conversation_id);
        return { group_id: conv.conversation_id, group_name: name };
      })
      .filter((t): t is ZaloBroadcastTarget => t !== null);

    if (targets.length === 0) {
      setAutoSendError("Không tìm thấy người nhận hợp lệ.");
      setIsSending(false);
      return;
    }

    try {
      await createZaloBroadcast(flow.userId, {
        user_id: flow.userId,
        message_ids: selectedMessageIds,
        targets,
        content_mode: "both",
      });
      setAutoSendSuccess(`Đã lên lịch gửi đến ${targets.length} người nhận thành công!`);
      setAutoSendTargetIds([]);
      setSelectedMessageIds([]);
    } catch (err) {
      setAutoSendError(err instanceof Error ? err.message : "Lỗi gửi tin.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newMedia = Array.from(e.target.files).map((file) => {
        const isImage = file.type.startsWith("image/");
        return {
          file,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        };
      });
      setSelectedMedia((prev) => [...prev, ...newMedia]);
    }
    e.target.value = "";
  };

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia((prev) => {
      const item = prev[index];
      if (item && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  // ── Share conversation with admin/leader (mới ở bước 7) ──────────────────
  const loadShareStatus = useCallback(
    async (accountId: string, conversationId: string) => {
      if (!flow.userId) return;
      try {
        const status = await getZaloConversationShareStatus(
          accountId,
          conversationId,
          flow.userId
        );
        setShareStatus((prev) => ({ ...prev, [conversationId]: status }));
      } catch (err) {
        // fail-soft: nếu bảng chưa migrate hoặc lỗi, cứ coi như false.
        console.warn("[zalo-share] load status failed", err);
      }
    },
    [flow.userId]
  );

  const handleToggleShare = useCallback(
    async (conversationId: string, sharedRole: "admin" | "leader") => {
      if (!flow.userId || !selectedAccount?.account_id) return;
      const current = shareStatus[conversationId]?.[sharedRole] ?? false;
      const next = !current;
      // Optimistic update
      setShareStatus((prev) => ({
        ...prev,
        [conversationId]: {
          admin: sharedRole === "admin" ? next : prev[conversationId]?.admin ?? false,
          leader: sharedRole === "leader" ? next : prev[conversationId]?.leader ?? false,
        },
      }));
      try {
        await setZaloConversationShare(
          selectedAccount.account_id,
          conversationId,
          next,
          sharedRole,
          flow.userId
        );
      } catch (err) {
        // rollback
        setShareStatus((prev) => ({
          ...prev,
          [conversationId]: {
            admin: sharedRole === "admin" ? current : prev[conversationId]?.admin ?? false,
            leader: sharedRole === "leader" ? current : prev[conversationId]?.leader ?? false,
          },
        }));
        console.warn("[zalo-share] toggle failed", err);
      }
    },
    [flow.userId, selectedAccount?.account_id, shareStatus]
  );

  // Tự động load share status khi mở 1 conversation.
  useEffect(() => {
    if (selectedConversationId && selectedAccount?.account_id) {
      void loadShareStatus(selectedAccount.account_id, selectedConversationId);
    }
  }, [selectedConversationId, selectedAccount?.account_id, loadShareStatus]);

  const handleSingleSend = async () => {
    if (!selectedConversationId || isSendingDirect) return;
    const conversationIdToSend = selectedConversationId;
    const textToSend = inputText.trim();
    if (!textToSend && selectedMedia.length === 0) return;

    setInputText("");
    const mediaToSend = [...selectedMedia];
    setSelectedMedia([]);
    setDirectSendError(null);
    setIsSendingDirect(true);

    try {
      if (mediaToSend.length > 0) {
        const filesOnly = mediaToSend.map((m) => m.file);
        await sendZaloMessageWithFiles(
          flow.userId,
          conversationIdToSend,
          textToSend,
          filesOnly
        );
      } else {
        await sendZaloMessage(flow.userId, conversationIdToSend, {
          text: textToSend,
        });
      }
      mediaToSend.forEach((m) => {
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
      // Only refresh the chat if the user is still viewing the same conversation.
      if (selectedConversationId === conversationIdToSend) {
        await loadLatestMessages(conversationIdToSend, { silent: true });
      }
    } catch (err) {
      setDirectSendError(err instanceof Error ? err.message : "Không thể gửi tin nhắn.");
      setInputText(textToSend);
      setSelectedMedia(mediaToSend);
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleQuickReply = async (text: string) => {
    if (!selectedConversationId || isSendingDirect) return;
    setDirectSendError(null);
    setIsSendingDirect(true);

    try {
      await sendZaloMessage(flow.userId, selectedConversationId, { text });
      await loadLatestMessages(selectedConversationId, { silent: true });
    } catch (err) {
      setDirectSendError(err instanceof Error ? err.message : "Không thể gửi tin nhắn nhanh.");
    } finally {
      setIsSendingDirect(false);
    }
  };

  const scrollbarClass = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-transparent";

  return (
    <div
      className={`flex-1 h-full w-full ${
        fullScreen ? "" : "rounded-3xl border border-slate-200 shadow-xl"
      } bg-white overflow-hidden min-h-0 grid ${
        fullScreen
          ? flow.isLoggedIn && selectedConversationView && isAutoSendOpen
            ? "grid-cols-[minmax(280px,20%)_1fr_minmax(360px,28%)]"
            : "grid-cols-[minmax(280px,22%)_1fr]"
          : flow.isLoggedIn && selectedConversationView && isAutoSendOpen
            ? "grid-cols-[minmax(220px,18%)_1fr_minmax(280px,24%)]"
            : "grid-cols-[minmax(220px,20%)_1fr]"
      }`}
    >

      {/* Left Column: Conversations */}
      <section className="border-r border-slate-100 flex flex-col bg-white overflow-hidden h-full min-h-0">
        {flow.sessionExpired && (
          <div className="m-2 rounded-lg border border-error-container bg-error-container/40 px-2 py-1.5 text-[10px] text-error">
            <div className="font-semibold flex items-center gap-1">
              <MaterialIcon name="error" className="text-xs" />
              Phiên Zalo đã hết hạn
            </div>
            <p className="mt-0.5 text-[10px]">Tin nhắn sẽ không tự cập nhật. Hãy đăng nhập lại bằng mã QR để tiếp tục.</p>
            <button
              onClick={onBackToDashboard}
              className="mt-1 w-full rounded-md bg-error px-2 py-1 font-semibold text-on-error hover:opacity-90 transition text-[10px]"
            >
              Đăng nhập lại
            </button>
          </div>
        )}
        <div className="px-3 py-2.5 border-b border-slate-200">
          <div className="flex items-center space-x-2 mb-2.5">
            <button
              onClick={onBackToDashboard}
              className="text-slate-400 hover:text-slate-600 transition shrink-0"
              title="Quay lại"
            >
              <MaterialIcon name="arrow_back" className="text-base" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-[13px] text-slate-800 leading-tight truncate">{selectedAccount?.label || "Đang chat"}</h2>
              <p className="text-[10px] text-slate-400 truncate">UID: {shortId(flow.userId)}</p>
            </div>
            {flow.isLoggedIn && flow.userId && flow.userId !== "default" && (
              <ZaloKpiPanel accountId={flow.userId} />
            )}
            {flow.isLoggedIn && (
              <button
                onClick={() => setNewChatModalOpen(true)}
                className="p-1 hover:bg-slate-100 rounded transition text-[#E3000F] shrink-0"
                title="Nhắn tin cho người lạ (SĐT hoặc username Zalo)"
                aria-label="Nhắn tin cho người lạ"
              >
                <MaterialIcon name="person_add" className="text-base" />
              </button>
            )}
            {flow.isLoggedIn && (
              <button
                onClick={() => void flow.endSession()}
                className="text-[10px] text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded border border-red-200 transition shrink-0"
                title="Đăng xuất khỏi Zalo"
              >
                Đăng xuất
              </button>
            )}
          </div>
          
          <div className="relative">
            <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
              <MaterialIcon name="search" className={`${fullScreen ? "text-base" : "text-xs"}`} />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${
                fullScreen
                  ? "pl-10 pr-4 py-2.5 text-[14px]"
                  : "pl-8 pr-3 py-1.5 text-[12px]"
              } bg-slate-50 border-transparent rounded-full focus:ring-[#E3000F] focus:border-[#E3000F] focus:outline-none transition-all`}
            />
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-[11px] transition ${activeTab === 'all' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab('unread')}
            className={`flex-1 py-2 text-[11px] transition ${activeTab === 'unread' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Chưa đọc
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`flex-1 py-2 text-[11px] whitespace-nowrap transition ${activeTab === 'inactive' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Chưa HĐ
          </button>
        </div>

        <ZaloConversationListVirtualized
          conversations={filteredConversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          searchQuery={searchQuery}
          isLoading={isLoadingConversations}
          enableInboxShare={flow.isLoggedIn}
          accountId={flow.userId}
          fullScreen={fullScreen}
        />

        {conversationError && (
          <div className="mx-md mt-md text-xs text-error bg-error-container/40 p-sm rounded-lg">
            {conversationError}
          </div>
        )}
        
        <div className="p-2.5 border-t border-slate-200">
           <button
             onClick={() => void syncRecentConversations()}
             disabled={isSyncingRecent}
             className="w-full flex items-center justify-center space-x-1.5 text-[#E3000F] font-semibold text-[12px] py-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
           >
             <MaterialIcon name="sync" className={`text-sm ${isSyncingRecent ? "animate-spin" : ""}`} />
             <span>Đồng bộ tin nhắn mới</span>
           </button>
           {syncError && (
             <div className="mt-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-600">
               {syncError}
             </div>
           )}
           {!syncError && syncSummary && (
             <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
               Đã quét {syncSummary.scanned} nhóm · lưu {syncSummary.messages_saved} tin · {syncSummary.groups_with_messages} nhóm có tin mới
             </div>
           )}
        </div>
      </section>

      {/* Middle Column: Chat */}
      <section className="bg-[#f0f2f5] flex flex-col relative overflow-hidden h-full border-r border-slate-200 min-w-0">
        {selectedConversationView ? (
          <>
            {/* Chat Header */}
            <header className={`flex items-center justify-between border-b border-outline-variant bg-surface ${
              fullScreen ? "px-5 h-16" : "px-3 h-12"
            } shadow-sm z-10 shrink-0`}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {selectedConversationView.avatar_url && !avatarErrors[`header-${selectedConversationView.conversation_id}`] ? (
                  <img
                    src={selectedConversationView.avatar_url}
                    alt={selectedConversationView.conversation_name}
                    onError={() => setAvatarErrors(prev => ({ ...prev, [`header-${selectedConversationView.conversation_id}`]: true }))}
                    className={`${
                      fullScreen ? "h-11 w-11" : "h-8 w-8"
                    } shrink-0 rounded-full object-cover border border-outline-variant/30 bg-surface-container-low`}
                  />
                ) : (
                  <div className={`flex ${
                    fullScreen ? "h-11 w-11 text-[13px]" : "h-8 w-8 text-[11px]"
                  } shrink-0 items-center justify-center rounded-full bg-[#E3000F] text-white hover:bg-red-700 font-semibold`}>
                    {initials(selectedConversationView.conversation_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold ${
                    fullScreen ? "text-[16px]" : "text-[13px]"
                  } text-on-surface truncate leading-tight`}>{selectedConversationView.conversation_name}</h3>
                  <div className={`flex items-center gap-1 ${
                    fullScreen ? "text-xs" : "text-[10px]"
                  } text-on-surface-variant`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Trực tuyến
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setIsAutoSendOpen(prev => !prev)}
                  className={`h-7 w-7 flex items-center justify-center rounded-full transition ${
                    isAutoSendOpen
                      ? "bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20"
                      : "hover:bg-surface-container-low text-on-surface-variant"
                  }`}
                  title={isAutoSendOpen ? "Đóng Auto Send" : "Mở Auto Send"}
                >
                  <MaterialIcon name="send" className="text-sm" />
                </button>
                <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition" title="Tìm trong hội thoại">
                  <MaterialIcon name="search" className="text-sm" />
                </button>
                <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition" title="Gọi thoại">
                  <MaterialIcon name="call" className="text-sm" />
                </button>
                <button className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition" title="Video call">
                  <MaterialIcon name="videocam" className="text-sm" />
                </button>
              </div>
            </header>

            {!flow.isLoggedIn && (
              <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MaterialIcon name="warning" className="text-amber-500 text-base shrink-0" />
                  <span className="truncate">Tài khoản Zalo chưa kết nối. Bạn chỉ có thể xem lịch sử chat.</span>
                </div>
                <button 
                  onClick={() => setSelectedConversationId(null)}
                  className="bg-amber-600 text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-amber-700 transition shrink-0"
                >
                  Đăng nhập
                </button>
              </div>
            )}

            {/* Messages Area */}
            {isLoadingMessages && messages.length === 0 ? (
              <ZaloMessageListSkeleton count={8} />
            ) : (
            <div ref={messageListRef} className={`flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 bg-[#f4f6f8] ${scrollbarClass}`}>
              {hasOlderMessages && (
                <div className="flex justify-center mb-1">
                  <button
                    onClick={() => void loadOlderMessages()}
                    disabled={isLoadingOlderMessages}
                    className="bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm transition"
                  >
                    {isLoadingOlderMessages ? "Đang tải..." : "Tải thêm tin cũ"}
                  </button>
                </div>
              )}

              {messages.map((message) => {
                const assets = messageAssets(message);
                const sender = message.sender_name || (message.is_sent ? "Bạn" : "Khách");
                const isSentByMe = message.is_sent;
                const msgId = messageKey(message);
                const isSelected = selectedMessageIds.includes(msgId);

                return (
                  <div key={msgId} className={`flex group ${isSentByMe ? 'justify-end' : 'justify-start'}`}>
                    {/* Checkbox for Auto Send Selection - visible on hover or if selected */}
                    {!isSentByMe && (
                       <div className={`mr-1.5 pt-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <input 
                           type="checkbox" 
                           className="w-3.5 h-3.5 cursor-pointer"
                           checked={isSelected}
                           onChange={() => handleToggleSelectMessage(msgId)}
                         />
                       </div>
                    )}

                    <div className={`${
                      fullScreen ? "max-w-[80%]" : "max-w-[70%]"
                    } rounded-2xl ${
                      fullScreen ? "px-4 py-2.5 text-[15px]" : "px-3 py-1.5"
                    } relative transition-all duration-200 ${
                      isSentByMe
                        ? 'bg-[#0068FF] text-white rounded-br-sm shadow-sm shadow-blue-500/10'
                        : 'bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100'
                    } ${isSelected ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}>

                      {!isSentByMe && (
                        <div className={`${fullScreen ? "text-xs" : "text-[10px]"} font-semibold mb-0.5 text-slate-500`}>
                          {sender}
                        </div>
                      )}
                      
                      {message.content && (
                        <p className={`whitespace-pre-wrap break-words text-[13px] leading-relaxed ${isSentByMe ? 'text-white/95' : 'text-slate-700'}`}>
                          {message.content}
                        </p>
                      )}
                      
                      {assets.length > 0 && (
                        <div className="mt-1 grid gap-1 sm:grid-cols-2">
                          {assets.map((asset) => (
                            <Image
                              key={asset.id || asset.storage_url}
                              src={asset.storage_url || ""}
                              alt="Image"
                              width={220}
                              height={150}
                              className="rounded-lg object-cover w-full h-auto"
                              unoptimized
                            />
                          ))}
                        </div>
                      )}

                      <div className={`text-[10px] mt-0.5 text-right font-medium ${isSentByMe ? 'text-blue-100' : 'text-slate-400'}`}>
                        {formatTime(message.timestamp_text || message.time_text)}
                      </div>
                    </div>

                    {isSentByMe && (
                       <div className={`ml-1.5 pt-1 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <input 
                           type="checkbox" 
                           className="w-3.5 h-3.5 cursor-pointer"
                           checked={isSelected}
                           onChange={() => handleToggleSelectMessage(msgId)}
                         />
                       </div>
                    )}
                  </div>
                );
              })}

              {newMessageCount > 0 && (
                <div className="sticky bottom-2 flex justify-center z-10">
                  <button
                    onClick={scrollToLatest}
                    className="bg-[#E3000F] text-white hover:bg-red-700 rounded-full px-3 py-1 text-[11px] font-semibold shadow-md flex items-center gap-1 transition"
                  >
                    <MaterialIcon name="arrow_downward" className="text-[11px]" />
                    Có {newMessageCount} tin mới
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Chat Input */}
            <div className="bg-surface px-3 py-2 border-t border-outline-variant relative">
              {/* Invisible Inputs */}
              <input
                type="file"
                ref={imageInputRef}
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="*/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full mb-3 left-4 z-50 w-72 h-80 bg-surface border border-outline-variant rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
                  style={{ maxHeight: '320px' }}
                >
                  {/* Category selector */}
                  <div className="flex border-b border-outline-variant bg-surface-container-low px-sm py-1">
                    {EMOJI_CATEGORIES.map((cat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveEmojiTab(i)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
                          activeEmojiTab === i
                            ? "bg-surface text-[#E3000F] shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Emoji grid */}
                  <div className="flex-1 overflow-y-auto p-sm grid grid-cols-6 gap-xs content-start">
                    {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="h-9 w-9 flex items-center justify-center text-xl rounded-lg hover:bg-surface-container-high active:scale-95 transition"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Replies Popup */}
              {showQuickReplies && (
                <div
                  ref={quickRepliesRef}
                  className="absolute bottom-full mb-3 left-14 z-50 w-80 max-h-80 bg-surface border border-outline-variant rounded-2xl shadow-xl flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200"
                >
                  <div className="px-3 py-2 border-b border-outline-variant bg-surface-container-low sticky top-0 z-10 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Mẫu câu trả lời nhanh</span>
                    <button onClick={() => setShowQuickReplies(false)} className="text-slate-400 hover:text-red-500">
                      <MaterialIcon name="close" className="text-[14px]" />
                    </button>
                  </div>
                  <div className="flex flex-col p-1.5 gap-1">
                    {QUICK_REPLIES.map((text, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleQuickReply(text);
                          setShowQuickReplies(false);
                        }}
                        disabled={isSendingDirect}
                        className="text-left px-3 py-2 text-[12px] hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg transition-all border border-transparent hover:border-blue-200 disabled:opacity-50"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Send Error */}
              {directSendError && (
                <div className="mb-1.5 text-[10px] text-error bg-error-container/40 px-2 py-1 rounded">
                  {directSendError}
                </div>
              )}

              {/* Selected Media Previews */}
              {selectedMedia.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-1.5 mb-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest max-h-24 overflow-y-auto">
                  {selectedMedia.map((item, index) => {
                    const isImage = !!item.previewUrl;
                    return (
                      <div
                        key={index}
                        className="relative group w-10 h-10 rounded border border-outline-variant bg-surface overflow-hidden flex items-center justify-center shadow-sm hover:border-[#E3000F]/50 transition"
                      >
                        {isImage ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-0.5 text-center w-full h-full">
                            <MaterialIcon name="description" className="text-base text-[#E3000F]" />
                            <span className="text-[8px] truncate w-full px-0.5 text-on-surface-variant font-medium">
                              {item.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md transition transform scale-0 group-hover:scale-100 flex items-center justify-center"
                          style={{ width: '14px', height: '14px' }}
                        >
                          <MaterialIcon name="close" className="text-[8px] font-bold" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={!flow.isLoggedIn}
                  className={`text-slate-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-40 disabled:hover:bg-transparent ${
                    showEmojiPicker ? "text-blue-600 bg-blue-100" : ""
                  }`}
                  title="Biểu cảm"
                >
                  <MaterialIcon name="mood" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  disabled={!flow.isLoggedIn}
                  className={`text-slate-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-40 disabled:hover:bg-transparent ${
                    showQuickReplies ? "text-blue-600 bg-blue-100" : ""
                  }`}
                  title="Mẫu câu nhanh"
                >
                  <MaterialIcon name="bolt" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!flow.isLoggedIn}
                  className="text-slate-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Gửi hình ảnh"
                >
                  <MaterialIcon name="image" className="text-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!flow.isLoggedIn}
                  className="text-slate-400 hover:text-blue-500 p-1.5 rounded-full hover:bg-blue-50 transition disabled:opacity-40 disabled:hover:bg-transparent"
                  title="Gửi file tài liệu"
                >
                  <MaterialIcon name="attach_file" className="text-[18px]" />
                </button>
 
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    !flow.isLoggedIn
                      ? "Hãy đăng nhập để nhắn tin..."
                      : selectedMedia.length > 0
                        ? "Nhập chữ kèm theo file, Enter để gửi..."
                        : "Nhập tin nhắn, Enter để gửi..."
                  }
                  disabled={isSendingDirect || !flow.isLoggedIn}
                  className={`flex-1 bg-slate-100/80 rounded-full ${
                    fullScreen
                      ? "px-5 py-3 text-[15px]"
                      : "px-3.5 py-2 text-[13px]"
                  } text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-500/30 transition-all disabled:opacity-60`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSingleSend();
                    }
                  }}
                />

                <button
                  onClick={() => void handleSingleSend()}
                  disabled={isSendingDirect || !flow.isLoggedIn || (!inputText.trim() && selectedMedia.length === 0)}
                  className={`bg-[#0068FF] text-white hover:bg-blue-600 ${
                    fullScreen ? "h-11 w-11" : "h-9 w-9"
                  } rounded-full flex items-center justify-center transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none`}
                >
                  {isSendingDirect ? (
                    <span className="text-[10px] font-bold animate-pulse">...</span>
                  ) : (
                    <MaterialIcon name="send" className={`${fullScreen ? "text-[18px]" : "text-[16px]"} ml-0.5`} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : !flow.isLoggedIn ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 w-full overflow-y-auto">
            {/* QR Code Display - 3 states: has QR, generating QR, no QR */}
            {flow.qrBase64 ? (
              <>
                <div className="bg-white p-4 rounded-2xl shadow-lg mb-4 border border-slate-100 relative">
                  <img
                    src={flow.qrBase64.startsWith("data:") ? flow.qrBase64 : `data:image/png;base64,${flow.qrBase64}`}
                    alt="Zalo QR"
                    className="w-48 h-48 object-fill"
                  />
                  {flow.authStatus === "waiting_scan" && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#E3000F] text-white hover:bg-red-700 px-3 py-1 rounded-full text-[10px] font-bold shadow-md animate-pulse whitespace-nowrap">
                      Đang chờ quét mã...
                    </div>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1.5 mt-2 text-center">Quét mã QR bằng Zalo</h3>
                <div 
                  className="text-slate-500 text-[11px] text-center mb-4 leading-relaxed" 
                  style={{ minWidth: "240px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Mở ứng dụng Zalo trên điện thoại → Quét QR → Xác nhận đăng nhập</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void flow.startSession()}
                    disabled={flow.isStartingSession}
                    className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-[12px] font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                  >
                    {flow.isStartingSession ? "Đang tạo..." : "Làm mới QR"}
                  </button>
                </div>
              </>
            ) : flow.isStartingSession ? (
              <>
                <div className="w-48 h-48 bg-white rounded-2xl mb-6 flex items-center justify-center border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <MaterialIcon name="qr_code_scanner" className="text-3xl animate-pulse text-[#E3000F]" />
                    <span className="text-[12px] font-semibold">Đang tạo mã QR...</span>
                  </div>
                </div>
                <div 
                  className="text-slate-500 text-[11px] text-center leading-relaxed"
                  style={{ minWidth: "240px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Hệ thống đang khởi tạo phiên Zalo và tạo mã QR. Quá trình này có thể mất vài giây.</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-[#E3000F] text-4xl mb-4">
                  <MaterialIcon name="qr_code_scanner" className="text-inherit" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2.5 text-center">Tài khoản chưa đăng nhập</h3>
                <div 
                  className="text-slate-500 text-[11px] text-center leading-relaxed mb-5"
                  style={{ minWidth: "280px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Bạn cần kết nối tài khoản Zalo này qua mã QR để hệ thống có thể đọc tin nhắn và thực hiện các tác vụ tự động.</p>
                </div>
                <button
                  onClick={() => void flow.startSession()}
                  disabled={flow.isStartingSession}
                  className="bg-[#E3000F] hover:bg-red-600 text-white px-5 py-2 rounded-lg text-[12px] font-bold transition-all shadow-md shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 disabled:active:scale-100"
                >
                  <MaterialIcon name="qr_code_scanner" className="text-sm" />
                  {flow.isStartingSession ? "Đang tạo..." : "Tạo mã QR Đăng Nhập"}
                </button>
              </>
            )}
            {flow.authStatus === "qr_expired" && (
              <div className="mt-4 text-[11px] text-orange-600 bg-orange-50 px-3 py-1.5 rounded border border-orange-100">
                Mã QR đã hết hạn. Bấm &quot;Làm mới QR&quot; để tạo mã mới.
              </div>
            )}
          </div>
        ) : (
          <ZaloEmptyChat
            hasConversations={conversations.length > 0}
            isLoggedIn={flow.isLoggedIn ?? false}
            isLoading={isSyncingRecent}
            onSync={() => void syncRecentConversations()}
            onLogin={() => void flow.startSession?.()}
          />
        )}
      </section>

      {/* Right Column: Auto Send */}
      {flow.isLoggedIn && selectedConversationView && isAutoSendOpen && (
        <section className="border-l border-slate-100 flex flex-col h-full bg-white overflow-hidden min-w-0">
          <div className="px-3 py-2.5 border-b border-slate-200 flex items-center justify-between space-x-2 text-[#E3000F]">
            <div className="flex items-center space-x-1.5 min-w-0">
              <MaterialIcon name="send" className="text-sm" />
              <h2 className="font-semibold uppercase tracking-wide text-[11px] truncate">Auto Send</h2>
            </div>
            <button
              onClick={() => setIsAutoSendOpen(false)}
              className="text-slate-400 hover:text-slate-800 transition shrink-0"
              title="Đóng Auto Send"
            >
               <MaterialIcon name="close" className="text-base" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-start space-x-2 mb-2">
              <span className="text-[#E3000F] mt-0.5"><MaterialIcon name="auto_awesome" className="text-sm" /></span>
              <h4 className="font-semibold text-slate-800 text-[12px] leading-tight">Gửi tin nhắn hàng loạt</h4>
            </div>
            <p className="text-[10px] text-slate-400 mb-2.5">Tích chọn tin nhắn ở khung chat bên trái làm nội dung mẫu, sau đó chọn người nhận bên dưới.</p>

            <div className="mb-2.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nội dung mẫu</label>
              {selectedMessageIds.length > 0 ? (
                <div className="bg-green-50 text-green-700 px-2 py-1.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border border-green-200 w-full">
                  <MaterialIcon name="check_circle" className="text-xs" />
                  Đã chọn {selectedMessageIds.length} tin nhắn
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 p-2 rounded">
                  <p className="text-[10px] italic text-yellow-700 leading-relaxed">
                    Chưa chọn tin nhắn nào. Hãy tick vào checkbox bên cạnh tin nhắn.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-2">
              <div className="text-[10px] font-semibold uppercase text-on-surface-variant mb-1.5">
                Người nhận ({autoSendTargetIds.length} đã chọn)
              </div>

              {/* Search conversations for Auto Send */}
              <div className="relative mb-1.5">
                <MaterialIcon name="search" className="absolute left-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs" />
                <input
                  type="text"
                  placeholder="Tìm nhóm hoặc người nhận..."
                  value={autoSendSearchQuery}
                  onChange={(e) => setAutoSendSearchQuery(e.target.value)}
                  className="w-full text-[10px] border border-outline-variant rounded py-1 pl-6 pr-1.5 bg-surface focus:outline-none focus:ring-1 focus:ring-[#E3000F]"
                />
              </div>

              {/* Selected target chips */}
              {autoSendTargetIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {autoSendTargetIds.map(id => {
                    const conv = conversations.find(c => c.conversation_id === id);
                    const name = conv ? conversationTitle(conv) : id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleToggleAutoSendTarget(id)}
                        className="inline-flex items-center gap-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 text-[10px] font-semibold hover:bg-[#E3000F]/20 transition"
                      >
                        {name.length > 18 ? `${name.slice(0, 18)}…` : name}
                        <MaterialIcon name="close" className="text-[10px]" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Conversation picker list */}
              <div className="max-h-40 overflow-y-auto border border-outline-variant rounded bg-surface divide-y divide-outline-variant/50">
                {autoSendFilteredConversations.length > 0 ? (
                  autoSendFilteredConversations.map(conv => {
                    const title = conversationTitle(conv);
                    const checked = autoSendTargetIds.includes(conv.conversation_id);
                    const isCurrentConv = conv.conversation_id === selectedConversationId;
                    return (
                      <label
                        key={conv.conversation_id}
                        className={`flex items-center gap-1.5 px-1.5 py-1 cursor-pointer hover:bg-surface-container-low transition text-[10px] ${
                          checked ? 'bg-[#E3000F]-container/20' : ''
                        } ${isCurrentConv ? 'border-l-2 border-l-primary' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleAutoSendTarget(conv.conversation_id)}
                          className="w-3 h-3 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate text-on-surface">{title}</div>
                          {conv.latest_content && (
                            <div className="text-[9px] text-on-surface-variant truncate">{conv.latest_content}</div>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-1.5 py-3 text-center text-[10px] text-on-surface-variant">
                    {conversations.length === 0
                      ? "Chưa có hội thoại. Bấm Đồng bộ ở bên trái."
                      : "Không tìm thấy hội thoại phù hợp."}
                  </div>
                )}
              </div>
            </div>

            {autoSendError && (
              <div className="mb-2 text-[10px] text-error bg-red-50 p-2 rounded border border-red-100 mt-2">
                {autoSendError}
              </div>
            )}

            {autoSendSuccess && (
              <div className="mb-2 text-[10px] text-green-700 bg-green-50 border border-green-200 p-2 rounded mt-2">
                {autoSendSuccess}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={() => void handleAutoSend()}
            disabled={isSending || selectedMessageIds.length === 0 || autoSendTargetIds.length === 0}
            className="w-full bg-[#E3000F] hover:bg-red-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center space-x-1.5 shadow-md shadow-red-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none text-[12px]"
          >
            <MaterialIcon name="send" className="text-xs" />
            <span>{isSending ? "Đang gửi..." : autoSendTargetIds.length > 0 ? `Gửi đến ${autoSendTargetIds.length} người nhận` : "Thực hiện Auto Send"}</span>
          </button>
        </div>
      </section>
      )}

      {/* Modal nhắn tin cho người lạ (SĐT / username) */}
      <ZaloNewChatModal
        open={newChatModalOpen}
        accountId={flow.userId}
        onClose={() => setNewChatModalOpen(false)}
        onChatReady={handleNewChatReady}
        onError={(msg) => {
          setNewChatToast(msg);
          window.setTimeout(() => setNewChatToast(null), 4500);
        }}
        onSuccess={(name) => {
          setNewChatToast(`Đã mở chat với ${name}`);
          window.setTimeout(() => setNewChatToast(null), 4000);
        }}
      />

      {/* Toast thông báo nhỏ ở góc trên */}
      {newChatToast && (
        <div
          role="status"
          className="fixed top-4 right-4 z-[70] max-w-[360px] px-4 py-2.5 bg-slate-900 text-white text-[12.5px] rounded-lg shadow-2xl border border-slate-700/50 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-2">
            <MaterialIcon name="info" className="text-base shrink-0" />
            <span>{newChatToast}</span>
          </div>
        </div>
      )}

    </div>
  );
}
