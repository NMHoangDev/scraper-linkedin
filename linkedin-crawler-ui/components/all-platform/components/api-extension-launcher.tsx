"use client";

declare global {
  interface Window {
    chrome: any;
  }
}
declare const chrome: any;

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { allPlatformGroupsService, authService } from "@/services/all-platform.service";
import { API_BASE_URL } from "@/lib/env";

interface ExtensionGroup {
  id: string;
  group_name: string;
  group_url: string;
}

interface ExtensionLauncherProps {
  className?: string;
  onComplete?: (postsCount: number, launchedGroups?: any[]) => void;
  onCrawlSaved?: (data: { count: number; groupId: string; groupUrl: string; postUrls: string[] }) => void;
}

export function ApiExtensionLauncher({ className, onComplete, onCrawlSaved }: ExtensionLauncherProps) {
  const groupsToCrawlRef = useRef<any[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);
  const [launchLog, setLaunchLog] = useState<string[]>([]);
  const [scrapedGroups, setScrapedGroups] = useState<{ groupUrl: string, posts: any[], groupName?: string }[]>([]);
  const [crawlProgress, setCrawlProgress] = useState({ posts: 0, scrolls: 0, groupIndex: 0, totalGroups: 0 });
  const [availableGroups, setAvailableGroups] = useState<ExtensionGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false);

  const onCompleteRef = useRef(onComplete);
  const onCrawlSavedRef = useRef(onCrawlSaved);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onCrawlSavedRef.current = onCrawlSaved;
  }, [onCrawlSaved]);

  useEffect(() => {
    const loadGroups = async () => {
      setIsLoadingGroups(true);
      try {
        const res = await allPlatformGroupsService.getForExtension();
        if (res.data) {
          setAvailableGroups(res.data);
          setSelectedGroupIds(res.data.map((g: any) => g.id));
        }
      } catch (err) {
        console.error("Failed to load groups for extension", err);
      } finally {
        setIsLoadingGroups(false);
      }
    };
    loadGroups();
  }, []);


  // ── Listen for extension messages + WebSocket (SSE) ────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'API_MARKEE_FB_EXTENSION_READY') {
        setExtensionReady(true);
      }
      if (msg.type === 'API_MARKEE_FB_PONG' && msg.installed) {
        setExtensionReady(true);
        if (msg.isRunning) {
          setIsLaunching(true);
        }
      }
      if (msg.type === 'API_CRAWL_STATUS') {
        setLaunchLog((prev) => [...prev, `🔄 ${msg.message}`]);
      } else if (msg.type === 'API_CRAWL_LOG') {
        const icon =
          msg.level === 'success' ? '✅' :
          msg.level === 'error' ? '❌' :
          msg.level === 'warn' ? '⚠️' : '📋';
        setLaunchLog((prev) => [...prev, `${icon} ${msg.message}`]);
      } else if (msg.type === 'API_CRAWL_PROGRESS') {
        setCrawlProgress((p) => ({
          ...p,
          groupIndex: msg.groupIndex !== undefined ? msg.groupIndex : p.groupIndex,
          totalGroups: msg.totalGroups !== undefined ? msg.totalGroups : p.totalGroups,
          posts: msg.posts !== undefined ? msg.posts : p.posts,
          scrolls: msg.scrolls !== undefined ? msg.scrolls : p.scrolls,
        }));
      } else if (msg.type === 'API_CRAWL_POST') {
        setCrawlProgress((p) => ({ ...p, posts: msg.posts ?? p.posts + 1 }));
      } else if (msg.type === 'API_CRAWL_SCROLL') {
        setCrawlProgress((p) => ({ ...p, scrolls: p.scrolls + 1 }));
      } else if (msg.type === 'API_CRAWL_DONE') {
        setIsLaunching(false);
        setIsDone(true);
        setLaunchLog((prev) => [
          ...prev,
          `🎉 Hoàn tất! ${msg.totalPosts ?? 0} bài viết từ ${msg.totalGroups ?? 0} groups`,
        ]);
        onCompleteRef.current?.(msg.totalPosts ?? 0, groupsToCrawlRef.current);
      } else if (msg.type === 'API_LAUNCH_FROM_APP_RESULT') {
        if (msg.success) {
          setLaunchLog((prev) => [
            ...prev,
            `🚀 Siêu Extension API đã nhận lệnh! Tab đang được mở...`,
          ]);
        } else {
          setLaunchLog((prev) => [
            ...prev,
            `❌ Lỗi: ${msg.error || 'Extension không phản hồi'}`,
          ]);
          setIsLaunching(false);
        }
      } else if (msg.type === 'API_EXTENSION_INVALIDATED') {
        setLaunchLog((prev) => [
          ...prev,
          "🔄 Extension vừa được cập nhật. Đang tải lại trang web để kết nối lại...",
        ]);
        setTimeout(() => window.location.reload(), 1500);
      } else if (msg.type === 'CRAWL_SAVED') {
        const savedData = msg.data || msg;
        setCrawlProgress((p) => ({
          ...p,
          groupIndex: Math.min(p.groupIndex + 1, Math.max(0, p.totalGroups - 1))
        }));
        setLaunchLog((prev) => [
          ...prev,
          `💾 Đã lưu vào DB: ${savedData.count ?? 0} bài viết`,
        ]);
        onCrawlSavedRef.current?.({
          count: savedData.count ?? 0,
          groupId: savedData.group_id ?? '',
          groupUrl: savedData.group_url ?? ''
        });
      }
    };

    const handleRuntimeMessage = (message: any) => {
      if (message.action === 'CRAWL_SAVED') {
        const savedData = message.data || {};
        setCrawlProgress((p) => ({
          ...p,
          groupIndex: Math.min(p.groupIndex + 1, Math.max(0, p.totalGroups - 1))
        }));
        setLaunchLog((prev) => [
          ...prev,
          `💾 Đã lưu vào DB: ${savedData.count ?? 0} bài viết`,
        ]);
        onCrawlSavedRef.current?.({
          count: savedData.count ?? 0,
          groupId: savedData.group_id ?? '',
          groupUrl: savedData.group_url ?? ''
        });
      }
    };

    window.addEventListener('message', handler);
    
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.addListener) {
      chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    }

    return () => {
      window.removeEventListener('message', handler);
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
        chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      }
    };
  }, []);

  // Gửi Ping liên tục trong 3 giây đầu để hỏi xem Extension có sống không
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      if (extensionReady || attempts >= 5) {
        clearInterval(interval);
        return;
      }
      window.postMessage({ type: 'API_MARKEE_FB_PING' }, '*');
      attempts++;
    }, 1000);

    return () => clearInterval(interval);
  }, [extensionReady]);

  // ── WebSocket connection for real-time crawl_saved events ────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        const baseUrl = API_BASE_URL || "http://localhost:8000";
        const wsUrl = `${baseUrl.replace("http://", "ws://").replace("https://", "wss://")}/api/all-platform/ws/crawl-status`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WebSocket] Connected to crawl-status');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'extension_crawl_saved' || msg.event === 'extension_crawl_saved_legacy') {
              const savedData = msg.data || msg;
              const totalCrawled = savedData.total_crawled ?? savedData.posts_count ?? 0;
              const saved = savedData.saved ?? savedData.posts_count ?? 0;
              const failed = savedData.failed ?? 0;

              setLaunchLog((prev) => [
                ...prev,
                `📥 Backend đã lưu thành công ${saved} bài viết mới/xịn nhất vào CSDL!`,
              ]);

              const failedUrls = savedData.failed_urls || [];
              if (failedUrls.length > 0) {
                setLaunchLog((prev) => [
                  ...prev,
                  `⚠️ Lỗi (${failedUrls.length}):`
                ]);
                failedUrls.forEach((f: any) => {
                  setLaunchLog((prev) => [
                    ...prev,
                    `   - ${f.url}: ${f.error}`
                  ]);
                });
              }

              onCrawlSavedRef.current?.({
                count: saved,
                groupId: savedData.group_id ?? '',
                groupUrl: savedData.group_url ?? '',
                postUrls: savedData.post_urls ?? []
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          console.log('[WebSocket] Disconnected, reconnecting in 5s...');
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        console.log('[WebSocket] Connection failed, retrying in 5s...');
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  // ── Ping extension on mount ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      window.postMessage({ type: 'MARKEE_FB_PING' }, '*');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Launch crawl ──────────────────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
    setShowModal(false);
    setLaunchLog(["⏳ Đang lấy danh sách groups..."]);
    setScrapedGroups([]);
    setCrawlProgress({ posts: 0, scrolls: 0, groupIndex: 0, totalGroups: 0 });
    setIsLaunching(true);
    setIsDone(false);

    if (!extensionReady) {
      setLaunchLog((prev) => [
        ...prev,
        "⚠️ Extension chưa sẵn sàng. Đợi 3s rồi thử lại hoặc reload extension.",
        "🔍 Kiểm tra: vào chrome://extensions → tìm extension → bấm Reload",
      ]);
      setIsLaunching(false);
      return;
    }

    try {
      const meRes = await authService.me();
      const idMember = meRes?.data?.id || (meRes?.data as any)?.user?.id || '';
      
      if (!idMember) {
        setLaunchLog((prev) => [
          ...prev,
          "⚠️ Không lấy được thông tin user. Vui lòng đăng nhập lại.",
        ]);
        setIsLaunching(false);
        return;
      }

      const groupsToCrawl = availableGroups.filter(g => selectedGroupIds.includes(g.id));

      if (groupsToCrawl.length === 0) {
        setLaunchLog((prev) => [...prev, "⚠️ Không có group nào được chọn để cào."]);
        setIsLaunching(false);
        return;
      }

      setLaunchLog((prev) => [
        ...prev,
        `📋 Đang khởi động extension cào ${groupsToCrawl.length} groups đã chọn...`,
      ]);
      console.log('[App] Groups:', groupsToCrawl.length, JSON.stringify(groupsToCrawl.slice(0, 3)));
      setCrawlProgress((p) => ({ ...p, totalGroups: groupsToCrawl.length }));

      const extensionGroups = groupsToCrawl.map((g) => ({
        id: g.id || '',
        name: g.group_name || 'Group',
        url: g.group_url,
      }));
      
      groupsToCrawlRef.current = extensionGroups;

      window.postMessage(
        {
          type: 'API_LAUNCH_FROM_APP',
          data: {
            groups: extensionGroups,
            config: { 
              maxPosts: 100, 
              scrollDelay: 2000, 
              autoNextGroup: true,
              idMember: idMember
            },
          },
        },
        '*'
      );

      setTimeout(() => {
        setLaunchLog((prev) => {
          const already = prev.some((l) => l.includes('Extension đã nhận lệnh') || l.includes('Lỗi: Extension'));
          if (!already) {
            return [...prev, '🚀 Extension đã nhận lệnh! Tab đang được redirect...'];
          }
          return prev;
        });
      }, 500);
    } catch (err) {
      setLaunchLog((prev) => [
        ...prev,
        `❌ Lỗi: ${err instanceof Error ? err.message : "Không rõ"}`,
      ]);
      setIsLaunching(false);
    }
  }, [extensionReady, availableGroups, selectedGroupIds]);

  // ── Stop crawl ────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    window.postMessage({ type: 'API_STOP_CRAWL' }, '*');
    setLaunchLog((prev) => [...prev, "⏹ Đã gửi lệnh dừng API Crawler..."]);
    setIsLaunching(false);
  }, []);

  // ── Render button + dialog ────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col transition-all duration-300 w-full mb-6 relative z-10">
      {/* Header / Launcher */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
            <span className="material-symbols-outlined text-red-600 text-[22px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">Siêu Tốc Cào Dữ Liệu (API Extension)</h3>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              {isLaunching
                ? `Đang xử lý ${crawlProgress.totalGroups} groups...`
                : "Nhấn bắt đầu để tự động gọi GraphQL API."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a href="https://drive.google.com/uc?export=download&id=1wuUVMipbWMTW726F9_XfgGrC3k-gbeRD"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Tải Extension
          </a>
          {isLaunching ? (
            <button
              type="button"
              onClick={handleStop}
              className="px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">stop_circle</span>
              Dừng lại
            </button>
          ) : isDone ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onCompleteRef.current?.(0);
                  handleLaunch();
                }}
                className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Cào lại
              </button>
              <button
                type="button"
                onClick={() => { 
                  setIsDone(false); 
                  setIsLaunching(false); 
                  setLaunchLog([]); 
                  setScrapedGroups([]); 
                  onCompleteRef.current?.(0);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Đóng
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              Siêu Tốc Cào Dữ Liệu
            </button>
          )}
        </div>
      </div>

      {/* Select Groups Modal */}
      {showModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Chọn nhóm cần cào</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Đã chọn {selectedGroupIds.length}/{availableGroups.length} nhóm
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto bg-slate-50/50">
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => setSelectedGroupIds(availableGroups.map(g => g.id))}
                  className="text-sm font-medium text-violet-600 bg-violet-100 hover:bg-violet-200 px-3 py-1.5 rounded-lg transition"
                >
                  Chọn tất cả
                </button>
                <button 
                  onClick={() => setSelectedGroupIds([])}
                  className="text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableGroups.map((group) => (
                  <label key={group.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-violet-300 hover:shadow-sm cursor-pointer transition">
                    <input 
                      type="checkbox" 
                      className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      checked={selectedGroupIds.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroupIds([...selectedGroupIds, group.id]);
                        } else {
                          setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                        }
                      }}
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-slate-700 line-clamp-1" title={group.group_name || group.group_url}>
                        {group.group_name || group.group_url}
                      </span>
                      <a 
                        href={group.group_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-slate-400 hover:text-indigo-500 hover:underline line-clamp-1 mt-0.5 inline-block w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.group_url}
                      </a>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button 
                onClick={handleLaunch}
                disabled={selectedGroupIds.length === 0}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#DC2626] hover:bg-[#B91C1C] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                Bắt đầu cào ({selectedGroupIds.length} nhóm)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Progress & Content (Expanded when launching or has data) */}
      {(isLaunching || isDone || scrapedGroups.length > 0 || launchLog.length > 0) && (
        <div className="border-t border-slate-100 bg-white p-4">
          {(isLaunching || isDone) && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-violet-50/50 rounded-xl p-3 text-center border border-violet-100/50">
                <div className="text-xl font-bold text-violet-700">{crawlProgress.posts}</div>
                <div className="text-[10px] text-violet-500 font-medium mt-0.5">Bài đã cào</div>
              </div>
              <div className="bg-purple-50/50 rounded-xl p-3 text-center border border-purple-100/50">
                <div className="text-xl font-bold text-purple-700">{crawlProgress.scrolls}</div>
                <div className="text-[10px] text-purple-500 font-medium mt-0.5">Lần scroll</div>
              </div>
              <div className="bg-amber-50/50 rounded-xl p-3 text-center border border-amber-100/50">
                <div className="text-xl font-bold text-amber-700">
                  {crawlProgress.totalGroups > 0
                    ? `${crawlProgress.groupIndex + 1}/${crawlProgress.totalGroups}`
                    : "—"}
                </div>
                <div className="text-[10px] text-amber-500 font-medium mt-0.5">Group hiện tại</div>
              </div>
            </div>
          )}

          {isLaunching && crawlProgress.totalGroups > 0 && (
            <div className="mb-5">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((crawlProgress.groupIndex + 1) / crawlProgress.totalGroups) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Render the scraped posts beautifully */}
          {scrapedGroups.length > 0 ? (
            <div className="space-y-4 max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
              {scrapedGroups.map((group, gIdx) => (
                <div key={gIdx} className="bg-slate-50/50 rounded-xl border border-slate-200/50 p-3">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                    <a href={group.groupUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline line-clamp-1 max-w-[80%]">
                      {group.groupName !== 'Group' ? group.groupName : group.groupUrl}
                    </a>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                      {group.posts.length} bài mới
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.posts.map((post, pIdx) => (
                      <div key={pIdx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-shadow">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-slate-800 text-xs line-clamp-1">{post.author_name || 'Người dùng ẩn danh'}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">{post.timestamp_raw}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-3 mb-2 italic">
                          "{post.content || post.content_preview || 'Không có nội dung text'}"
                        </p>
                        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-50">
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">👍 {post.reactions || 0}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">💬 {post.comments || 0}</span>
                          {post.post_url && (
                            <a href={post.post_url} target="_blank" rel="noreferrer" className="ml-auto text-[10px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2 py-0.5 rounded transition">
                              Xem bài
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
             launchLog.length > 0 && (
               <div className="bg-slate-900 rounded-xl p-3 font-mono text-[10px] text-slate-300 max-h-[160px] overflow-y-auto">
                 {launchLog.slice(-10).map((line, i) => (
                   <div key={i}>{line}</div>
                 ))}
               </div>
             )
          )}
        </div>
      )}
    </div>
  );
}
