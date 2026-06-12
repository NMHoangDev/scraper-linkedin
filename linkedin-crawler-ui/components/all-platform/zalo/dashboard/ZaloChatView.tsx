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
} from "@/services/zaloCrawlerService";
import type {
  ZaloConversationSummary,
  ZaloLibraryMessage,
  ZaloSyncRecentResponse,
  ZaloBroadcastTarget,
} from "@/types/zalo-api";

const REFRESH_INTERVAL_MS = 2000;
const MESSAGE_PAGE_SIZE = 50;
const SYNC_CONVERSATION_LIMIT = 50;
const SYNC_MESSAGES_PER_CONVERSATION = 50;
const BOTTOM_THRESHOLD_PX = 96;

interface ZaloChatViewProps {
  flow: ZaloCrawlerFlowValue;
  onBackToDashboard: () => void;
}

function formatTime(value?: string | null) {
  if (!value) return "Chưa có";
  const num = Number(value);
  const date = !Number.isNaN(num) && String(num) === String(value).trim() ? new Date(num) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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

export function ZaloChatView({ flow, onBackToDashboard }: ZaloChatViewProps) {
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

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  const messageListRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRef = useRef<"bottom" | "preserve" | null>(null);
  const preservedScrollRef = useRef<{ previousHeight: number; previousTop: number }>({ previousHeight: 0, previousTop: 0 });

  // Click outside listener for emoji picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
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
      return;
    }
    if (!options?.silent) setIsLoadingMessages(true);
    setMessageError(null);
    try {
      const response = await getZaloConversationMessages(
        flow.userId,
        conversationId,
        MESSAGE_PAGE_SIZE,
        0,
      );
      pendingScrollRef.current = "bottom";
      setMessages(response.messages ?? []);
      setMessageTotal(response.total ?? 0);
      setHasOlderMessages(Boolean(response.has_more));
      setNewMessageCount(0);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "Không thể tải tin nhắn hội thoại.");
    } finally {
      if (!options?.silent) setIsLoadingMessages(false);
    }
  }, [flow.userId]);

  const pollLatestMessages = useCallback(async (conversationId: string | null) => {
    if (!flow.userId || flow.userId === "default" || !conversationId) return;
    const shouldStickToBottom = isNearBottom(messageListRef.current);
    try {
      const response = await getZaloConversationMessages(
        flow.userId,
        conversationId,
        MESSAGE_PAGE_SIZE,
        0,
      );
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
      if (response.errors > 0 && response.messages_saved === 0) {
        setSyncError(
          `Đồng bộ xong nhưng không lấy được tin nhắn (quét ${response.scanned} nhóm, lỗi ${response.errors}). Listener Zalo có thể chưa kết nối — thử lại sau vài giây.`,
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
    setMessages([]);
    setMessageTotal(0);
    setHasOlderMessages(false);
    setNewMessageCount(0);
    setSelectedMessageIds([]); // Reset selection when switching conversations
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
  }, [loadLatestMessages, selectedConversationId, flow.userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadConversations({ silent: true });
      void pollLatestMessages(selectedConversationId);
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [loadConversations, pollLatestMessages, selectedConversationId]);

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

  const handleSingleSend = async () => {
    if (!selectedConversation || isSendingDirect) return;
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
          selectedConversation.conversation_id,
          textToSend,
          filesOnly
        );
      } else {
        await sendZaloMessage(flow.userId, selectedConversation.conversation_id, {
          text: textToSend,
        });
      }
      mediaToSend.forEach((m) => {
        if (m.previewUrl) URL.revokeObjectURL(m.previewUrl);
      });
      await loadLatestMessages(selectedConversationId, { silent: true });
    } catch (err) {
      setDirectSendError(err instanceof Error ? err.message : "Không thể gửi tin nhắn.");
      setInputText(textToSend);
      setSelectedMedia(mediaToSend);
    } finally {
      setIsSendingDirect(false);
    }
  };

  return (
    <div className="flex-1 grid grid-cols-12 h-[calc(100vh-100px)] w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Left Column: Conversations */}
      <section className="col-span-3 border-r border-slate-200 flex flex-col bg-white overflow-hidden h-full">
        {flow.sessionExpired && (
          <div className="m-sm rounded-lg border border-error-container bg-error-container/40 px-sm py-xs text-xs text-error">
            <div className="font-semibold flex items-center gap-xs">
              <MaterialIcon name="error" className="text-sm" />
              Phiên Zalo đã hết hạn
            </div>
            <p className="mt-0.5">Tin nhắn sẽ không tự cập nhật. Hãy đăng nhập lại bằng mã QR để tiếp tục.</p>
            <button
              onClick={onBackToDashboard}
              className="mt-xs w-full rounded-md bg-error px-sm py-1 font-semibold text-on-error hover:opacity-90 transition"
            >
              Đăng nhập lại
            </button>
          </div>
        )}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={onBackToDashboard}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              <MaterialIcon name="arrow_back" className="text-xl" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-800 leading-tight truncate">{selectedAccount?.label || "Đang chat"}</h2>
              <p className="text-xs text-slate-400 truncate">UID: {shortId(flow.userId)}</p>
            </div>
            {flow.isLoggedIn && (
              <button 
                onClick={() => void flow.endSession()}
                className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-md border border-red-200 transition shrink-0"
                title="Đăng xuất khỏi Zalo"
              >
                Đăng xuất
              </button>
            )}
          </div>
          
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <MaterialIcon name="search" className="text-sm" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-full text-sm focus:ring-[#E3000F] focus:border-[#E3000F] focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 text-sm transition ${activeTab === 'all' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Tất cả
          </button>
          <button 
            onClick={() => setActiveTab('unread')}
            className={`flex-1 py-3 text-sm transition ${activeTab === 'unread' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Chưa đọc
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`flex-1 py-3 text-sm whitespace-nowrap transition ${activeTab === 'inactive' ? 'font-bold text-[#E3000F] border-b-2 border-[#E3000F]' : 'font-medium text-slate-400 hover:text-slate-600'}`}
          >
            Chưa HĐ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations && conversations.length === 0 && (
            <div className="p-xl text-center text-on-surface-variant text-sm">
              Đang tải hội thoại...
            </div>
          )}
          {conversationError && (
            <div className="mx-md mt-md text-xs text-error bg-error-container/40 p-sm rounded-lg">
              {conversationError}
            </div>
          )}
          {filteredConversations.map((conversation) => {
            const active = conversation.conversation_id === selectedConversationId;
            const title = conversationTitle(conversation);
            return (
              <button
                key={conversation.conversation_id}
                onClick={() => setSelectedConversationId(conversation.conversation_id)}
                className={`w-full flex items-start gap-md p-md text-left transition border-b border-outline-variant/50 hover:bg-surface-container-low ${
                  active ? "bg-[#E3000F]/10" : ""
                }`}
              >
                {conversation.avatar_url && !avatarErrors[conversation.conversation_id] ? (
                  <img
                    src={conversation.avatar_url}
                    alt={title}
                    onError={() => setAvatarErrors(prev => ({ ...prev, [conversation.conversation_id]: true }))}
                    className="h-12 w-12 shrink-0 rounded-full object-cover border border-outline-variant/30 bg-surface-container-low"
                  />
                ) : (
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-title-md font-semibold ${
                    active ? "bg-[#E3000F] text-white hover:bg-red-700" : "bg-red-50 text-red-600 border border-red-100"
                  }`}>
                    {initials(title)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className={`font-semibold truncate text-on-surface ${conversation.unread_count && conversation.unread_count > 0 ? "font-bold" : ""}`}>{title}</div>
                    <div className="text-xs text-on-surface-variant shrink-0">{formatTime(conversation.latest_message_at)}</div>
                  </div>
                  <div className="flex items-center justify-between gap-xs">
                    <div className={`text-sm truncate flex-1 ${conversation.unread_count && conversation.unread_count > 0 ? 'text-on-surface font-semibold' : active ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                      {conversation.latest_sender_name ? `${conversation.latest_sender_name}: ` : ""}{conversation.latest_content || "Tin nhắn mới"}
                    </div>
                    {conversation.unread_count !== undefined && conversation.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filteredConversations.length === 0 && !isLoadingConversations && (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-white h-full">
              <p className="text-sm text-slate-400 leading-relaxed">
                {searchQuery ? "Không tìm thấy hội thoại phù hợp" : "Chưa có hội thoại. Bấm Đồng bộ để tải về."}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-200">
           <button
             onClick={() => void syncRecentConversations()}
             disabled={isSyncingRecent}
             className="w-full flex items-center justify-center space-x-2 text-[#E3000F] font-bold text-sm py-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
           >
             <MaterialIcon name="sync" className={isSyncingRecent ? "animate-spin" : ""} />
             <span>Đồng bộ tin nhắn mới</span>
           </button>
           {syncError && (
             <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
               {syncError}
             </div>
           )}
           {!syncError && syncSummary && (
             <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
               Đã quét {syncSummary.scanned} nhóm · lưu {syncSummary.messages_saved} tin · {syncSummary.groups_with_messages} nhóm có tin mới
             </div>
           )}
        </div>
      </section>

      {/* Middle Column: Chat */}
      <section className={`${flow.isLoggedIn && selectedConversation && isAutoSendOpen ? 'col-span-6' : 'col-span-9'} bg-[#f0f2f5] flex flex-col relative overflow-hidden h-full border-r border-slate-200`}>
        {!flow.isLoggedIn ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/50 w-full">
            {/* QR Code Display - 3 states: has QR, generating QR, no QR */}
            {flow.qrBase64 ? (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-slate-100 relative">
                  <img
                    src={flow.qrBase64.startsWith("data:") ? flow.qrBase64 : `data:image/png;base64,${flow.qrBase64}`}
                    alt="Zalo QR"
                    className="w-56 h-56 object-contain"
                  />
                  {flow.authStatus === "waiting_scan" && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#E3000F] text-white hover:bg-red-700 px-4 py-1.5 rounded-full text-xs font-bold shadow-md animate-pulse whitespace-nowrap">
                      Đang chờ quét mã...
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 mt-4 text-center">Quét mã QR bằng Zalo</h3>
                <div 
                  className="text-slate-500 text-sm text-center mb-6 leading-relaxed" 
                  style={{ minWidth: "280px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Mở ứng dụng Zalo trên điện thoại → Quét QR → Xác nhận đăng nhập</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => void flow.startSession()}
                    disabled={flow.isStartingSession}
                    className="bg-white border border-slate-200 text-slate-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                  >
                    {flow.isStartingSession ? "Đang tạo..." : "Làm mới QR"}
                  </button>
                </div>
              </>
            ) : flow.isStartingSession ? (
              <>
                <div className="w-56 h-56 bg-white rounded-2xl mb-8 flex items-center justify-center border-2 border-dashed border-slate-200 shadow-sm">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <MaterialIcon name="qr_code_scanner" className="text-4xl animate-pulse text-[#E3000F]" />
                    <span className="text-sm font-bold">Đang tạo mã QR...</span>
                  </div>
                </div>
                <div 
                  className="text-slate-500 text-sm text-center leading-relaxed"
                  style={{ minWidth: "280px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Hệ thống đang khởi tạo phiên Zalo và tạo mã QR. Quá trình này có thể mất vài giây.</p>
                </div>
              </>
            ) : (
              <>
                <div className="text-[#E3000F] text-5xl mb-6">
                  <MaterialIcon name="qr_code_scanner" className="text-inherit" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-4 text-center">Tài khoản chưa đăng nhập</h3>
                <div 
                  className="text-slate-500 text-sm text-center leading-relaxed mb-8"
                  style={{ minWidth: "320px", maxWidth: "100%", width: "100%" }}
                >
                  <p>Bạn cần kết nối tài khoản Zalo này qua mã QR để hệ thống có thể đọc tin nhắn và thực hiện các tác vụ tự động.</p>
                </div>
                <button
                  onClick={() => void flow.startSession()}
                  disabled={flow.isStartingSession}
                  className="bg-[#E3000F] hover:bg-red-600 text-white px-8 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-100 active:scale-95 disabled:opacity-50 flex items-center gap-2 disabled:active:scale-100"
                >
                  <MaterialIcon name="qr_code_scanner" className="text-base" />
                  {flow.isStartingSession ? "Đang tạo..." : "Tạo mã QR Đăng Nhập"}
                </button>
              </>
            )}
            {flow.authStatus === "qr_expired" && (
              <div className="mt-6 text-sm text-orange-600 bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
                Mã QR đã hết hạn. Bấm &quot;Làm mới QR&quot; để tạo mã mới.
              </div>
            )}
          </div>
        ) : selectedConversation ? (
          <>
            {/* Chat Header */}
            <header className="flex items-center justify-between border-b border-outline-variant bg-surface p-md shadow-sm z-10">
              <div className="flex items-center gap-md">
                {selectedConversation.avatar_url && !avatarErrors[`header-${selectedConversation.conversation_id}`] ? (
                  <img
                    src={selectedConversation.avatar_url}
                    alt={conversationTitle(selectedConversation)}
                    onError={() => setAvatarErrors(prev => ({ ...prev, [`header-${selectedConversation.conversation_id}`]: true }))}
                    className="h-10 w-10 shrink-0 rounded-full object-cover border border-outline-variant/30 bg-surface-container-low"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E3000F] text-white hover:bg-red-700 font-bold">
                    {initials(conversationTitle(selectedConversation))}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-title-md text-on-surface">{conversationTitle(selectedConversation)}</h3>
                  <div className="flex items-center gap-xs text-xs text-on-surface-variant mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Trực tuyến
                  </div>
                </div>
              </div>
              <div className="flex gap-sm">
                <button
                  onClick={() => setIsAutoSendOpen(prev => !prev)}
                  className={`h-9 w-9 flex items-center justify-center rounded-full transition ${
                    isAutoSendOpen
                      ? "bg-[#E3000F]/10 text-[#E3000F] border border-[#E3000F]/20"
                      : "hover:bg-surface-container-low text-on-surface-variant"
                  }`}
                  title={isAutoSendOpen ? "Đóng Auto Send" : "Mở Auto Send"}
                >
                  <MaterialIcon name="send" />
                </button>
                <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition">
                  <MaterialIcon name="search" />
                </button>
                <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition">
                  <MaterialIcon name="call" />
                </button>
                <button className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition">
                  <MaterialIcon name="videocam" />
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div ref={messageListRef} className="flex-1 overflow-y-auto p-md space-y-md">
              {hasOlderMessages && (
                <div className="flex justify-center mb-md">
                  <button
                    onClick={() => void loadOlderMessages()}
                    disabled={isLoadingOlderMessages}
                    className="bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-full px-lg py-1.5 text-sm font-semibold shadow-sm transition"
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
                       <div className={`mr-2 pt-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 cursor-pointer"
                           checked={isSelected}
                           onChange={() => handleToggleSelectMessage(msgId)}
                         />
                       </div>
                    )}

                    <div className={`max-w-[75%] rounded-2xl px-lg py-sm shadow-sm relative ${
                      isSentByMe 
                        ? 'bg-[#e5efff] text-on-surface rounded-br-none' 
                        : 'bg-white text-on-surface rounded-bl-none border border-outline-variant/30'
                    } ${isSelected ? 'ring-2 ring-[#E3000F] ring-offset-2' : ''}`}>
                      
                      {!isSentByMe && (
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {sender}
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="whitespace-pre-wrap break-words text-body-md leading-relaxed">
                          {message.content}
                        </p>
                      )}
                      
                      {assets.length > 0 && (
                        <div className="mt-sm grid gap-xs sm:grid-cols-2">
                          {assets.map((asset) => (
                            <Image
                              key={asset.id || asset.storage_url}
                              src={asset.storage_url || ""}
                              alt="Image"
                              width={260}
                              height={180}
                              className="rounded-lg object-cover w-full h-auto"
                              unoptimized
                            />
                          ))}
                        </div>
                      )}

                      <div className={`text-[11px] mt-1 text-right ${isSentByMe ? 'text-[#E3000F]/70' : 'text-on-surface-variant'}`}>
                        {formatTime(message.timestamp_text || message.time_text)}
                      </div>
                    </div>

                    {isSentByMe && (
                       <div className={`ml-2 pt-2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                         <input 
                           type="checkbox" 
                           className="w-4 h-4 cursor-pointer"
                           checked={isSelected}
                           onChange={() => handleToggleSelectMessage(msgId)}
                         />
                       </div>
                    )}
                  </div>
                );
              })}

              {newMessageCount > 0 && (
                <div className="sticky bottom-md flex justify-center z-10">
                  <button
                    onClick={scrollToLatest}
                    className="bg-[#E3000F] text-white hover:bg-red-700 rounded-full px-lg py-1.5 text-sm font-semibold shadow-md flex items-center gap-xs hover:bg-[#E3000F]/90 transition"
                  >
                    <MaterialIcon name="arrow_downward" className="text-sm" />
                    Có {newMessageCount} tin mới
                  </button>
                </div>
              )}
            </div>

            {/* Quick Replies */}
            <div className="px-md pb-xs pt-sm flex gap-sm overflow-x-auto whitespace-nowrap bg-[#eef0f2]">
               <button className="bg-surface border border-outline-variant rounded-full px-md py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low">
                 Dạ vâng, chị nhắn địa chỉ chi tiết giúp em nhé.
               </button>
               <button className="bg-surface border border-outline-variant rounded-full px-md py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low">
                 Ok ạ, em đang sẵn sàng ghi nhận đấy ạ.
               </button>
            </div>

            {/* Chat Input */}
            <div className="bg-surface p-md border-t border-outline-variant relative">
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

              {/* Direct Send Error */}
              {directSendError && (
                <div className="mb-sm text-xs text-error bg-error-container/40 px-sm py-1.5 rounded-lg">
                  {directSendError}
                </div>
              )}

              {/* Selected Media Previews */}
              {selectedMedia.length > 0 && (
                <div className="flex flex-wrap gap-sm p-sm mb-md rounded-xl border border-outline-variant/60 bg-surface-container-lowest max-h-32 overflow-y-auto">
                  {selectedMedia.map((item, index) => {
                    const isImage = !!item.previewUrl;
                    return (
                      <div
                        key={index}
                        className="relative group w-14 h-14 rounded-lg border border-outline-variant bg-surface overflow-hidden flex items-center justify-center shadow-sm hover:border-[#E3000F]/50 transition"
                      >
                        {isImage ? (
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full">
                            <MaterialIcon name="description" className="text-xl text-[#E3000F]" />
                            <span className="text-[9px] truncate w-full px-1 mt-0.5 text-on-surface-variant font-medium">
                              {item.file.name}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md transition transform scale-0 group-hover:scale-100 flex items-center justify-center"
                          style={{ width: '16px', height: '16px' }}
                        >
                          <MaterialIcon name="close" className="text-[10px] font-bold" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition ${
                    showEmojiPicker ? "text-[#E3000F] bg-[#E3000F]/10" : ""
                  }`}
                  title="Biểu cảm"
                >
                  <MaterialIcon name="mood" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition"
                  title="Gửi hình ảnh"
                >
                  <MaterialIcon name="image" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition"
                  title="Gửi file tài liệu"
                >
                  <MaterialIcon name="attach_file" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedMedia.length > 0
                      ? "Nhập chữ kèm theo file (tùy chọn), Enter để gửi..."
                      : "Nhập tin nhắn, Enter để gửi..."
                  }
                  disabled={isSendingDirect}
                  className="flex-1 bg-surface-container-low rounded-xl px-md py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#E3000F] disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSingleSend();
                    }
                  }}
                />

                <button
                  onClick={() => void handleSingleSend()}
                  disabled={isSendingDirect || (!inputText.trim() && selectedMedia.length === 0)}
                  className="bg-[#E3000F] text-white hover:bg-red-700 h-10 w-10 rounded-full flex items-center justify-center hover:bg-[#E3000F]/90 transition shadow-sm disabled:opacity-50"
                >
                  {isSendingDirect ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <MaterialIcon name="send" className="text-sm ml-1" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#eef0f2]">
            <div className="text-center text-on-surface-variant">
              <MaterialIcon name="chat" className="text-6xl mb-md opacity-20" />
              <p className="text-lg font-medium">Chọn một hội thoại để bắt đầu</p>
            </div>
          </div>
        )}
      </section>

      {/* Right Column: Auto Send */}
      {flow.isLoggedIn && selectedConversation && isAutoSendOpen && (
        <section className="col-span-3 border-none flex flex-col h-full bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between space-x-2 text-[#E3000F]">
            <div className="flex items-center space-x-2">
              <MaterialIcon name="send" className="text-base" />
              <h2 className="font-bold uppercase tracking-wide text-sm">Auto Send</h2>
            </div>
            <button
              onClick={() => setIsAutoSendOpen(false)}
              className="text-slate-400 hover:text-slate-800 transition"
            >
               <MaterialIcon name="close" className="text-lg" />
            </button>
          </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-start space-x-3 mb-3">
              <span className="text-[#E3000F] mt-1"><MaterialIcon name="auto_awesome" className="text-base" /></span>
              <h4 className="font-bold text-slate-800 text-sm leading-tight">Gửi tin nhắn hàng loạt</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">Tích chọn tin nhắn ở khung chat bên trái làm nội dung mẫu, sau đó chọn người nhận bên dưới.</p>

            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nội dung mẫu</label>
              {selectedMessageIds.length > 0 ? (
                <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border border-green-200 w-full">
                  <MaterialIcon name="check_circle" className="text-[14px]" />
                  Đã chọn {selectedMessageIds.length} tin nhắn
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg">
                  <p className="text-[11px] italic text-yellow-700 leading-relaxed">
                    Chưa chọn tin nhắn nào. Hãy tick vào checkbox bên cạnh tin nhắn.
                  </p>
                </div>
              )}
            </div>

            <div className="mb-md">
              <div className="text-xs font-semibold uppercase text-on-surface-variant mb-sm">
                Người nhận ({autoSendTargetIds.length} đã chọn)
              </div>

              {/* Search conversations for Auto Send */}
              <div className="relative mb-sm">
                <MaterialIcon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm" />
                <input
                  type="text"
                  placeholder="Tìm nhóm hoặc người nhận..."
                  value={autoSendSearchQuery}
                  onChange={(e) => setAutoSendSearchQuery(e.target.value)}
                  className="w-full text-xs border border-outline-variant rounded-lg py-1.5 pl-7 pr-sm bg-surface focus:outline-none focus:ring-1 focus:ring-[#E3000F]"
                />
              </div>

              {/* Selected target chips */}
              {autoSendTargetIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-sm">
                  {autoSendTargetIds.map(id => {
                    const conv = conversations.find(c => c.conversation_id === id);
                    const name = conv ? conversationTitle(conv) : id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleToggleAutoSendTarget(id)}
                        className="inline-flex items-center gap-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 text-[11px] font-semibold hover:bg-[#E3000F]/20 transition"
                      >
                        {name.length > 18 ? `${name.slice(0, 18)}…` : name}
                        <MaterialIcon name="close" className="text-[12px]" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Conversation picker list */}
              <div className="max-h-48 overflow-y-auto border border-outline-variant rounded-lg bg-surface divide-y divide-outline-variant/50">
                {autoSendFilteredConversations.length > 0 ? (
                  autoSendFilteredConversations.map(conv => {
                    const title = conversationTitle(conv);
                    const checked = autoSendTargetIds.includes(conv.conversation_id);
                    const isCurrentConv = conv.conversation_id === selectedConversationId;
                    return (
                      <label
                        key={conv.conversation_id}
                        className={`flex items-center gap-sm px-sm py-1.5 cursor-pointer hover:bg-surface-container-low transition text-xs ${
                          checked ? 'bg-[#E3000F]-container/20' : ''
                        } ${isCurrentConv ? 'border-l-2 border-l-primary' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleAutoSendTarget(conv.conversation_id)}
                          className="w-3.5 h-3.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate text-on-surface">{title}</div>
                          {conv.latest_content && (
                            <div className="text-[11px] text-on-surface-variant truncate">{conv.latest_content}</div>
                          )}
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="px-sm py-lg text-center text-[11px] text-on-surface-variant">
                    {conversations.length === 0
                      ? "Chưa có hội thoại. Bấm Đồng bộ ở bên trái."
                      : "Không tìm thấy hội thoại phù hợp."}
                  </div>
                )}
              </div>
            </div>

            {autoSendError && (
              <div className="mb-4 text-xs text-error bg-red-50 p-3 rounded-lg border border-red-100 mt-4">
                {autoSendError}
              </div>
            )}

            {autoSendSuccess && (
              <div className="mb-4 text-xs text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg mt-4">
                {autoSendSuccess}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => void handleAutoSend()}
            disabled={isSending || selectedMessageIds.length === 0 || autoSendTargetIds.length === 0}
            className="w-full bg-[#E3000F] hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none"
          >
            <MaterialIcon name="send" className="text-sm" />
            <span>{isSending ? "Đang gửi..." : autoSendTargetIds.length > 0 ? `Gửi đến ${autoSendTargetIds.length} người nhận` : "Thực hiện Auto Send"}</span>
          </button>
        </div>
      </section>
      )}
      
    </div>
  );
}
