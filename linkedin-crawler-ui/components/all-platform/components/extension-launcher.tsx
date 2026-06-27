"use client";

declare global {
  interface Window {
    chrome: any;
  }
}
declare const chrome: any;

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { allPlatformGroupsService, authService } from "@/services/all-platform.service";

interface ExtensionGroup {
  id: string;
  group_name: string;
  group_url: string;
}

interface ExtensionLauncherProps {
  className?: string;
  onComplete?: (postsCount: number) => void;
  onCrawlSaved?: (data: { count: number; groupId: string; groupUrl: string }) => void;
}

export function ExtensionLauncher({ className, onComplete, onCrawlSaved }: ExtensionLauncherProps) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);
  const [launchLog, setLaunchLog] = useState<string[]>([]);
  const [scrapedGroups, setScrapedGroups] = useState<{ groupUrl: string, posts: any[], groupName?: string }[]>([]);
  const [crawlProgress, setCrawlProgress] = useState({ posts: 0, scrolls: 0, groupIndex: 0, totalGroups: 0 });

  const onCompleteRef = useRef(onComplete);
  const onCrawlSavedRef = useRef(onCrawlSaved);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onCrawlSavedRef.current = onCrawlSaved;
  }, [onCrawlSaved]);


  // ── Listen for extension messages + WebSocket (SSE) ────────────────────────
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'MARKEE_POST_FEED_READY' && msg.extension === 'fb-post-feed-crawler') {
        setExtensionReady(true);
      }
      if (msg.type === 'MARKEE_POST_FEED_PONG' && msg.extension === 'fb-post-feed-crawler' && msg.installed) {
        setExtensionReady(true);
        if (msg.isRunning) {
          setIsLaunching(true);
          if (msg.progress) {
            setCrawlProgress(p => ({
              ...p,
              groupIndex: msg.progress.groupIndex ?? p.groupIndex,
              totalGroups: msg.progress.totalGroups ?? p.totalGroups,
              posts: msg.progress.posts ?? p.posts,
              scrolls: msg.progress.scrolls ?? p.scrolls,
            }));
            setLaunchLog(prev => {
              if (prev.length === 0) {
                return [`🔄 Đã khôi phục trạng thái: Group ${msg.progress.groupIndex + 1}/${msg.progress.totalGroups}, ${msg.progress.posts} bài`];
              }
              return prev;
            });
          }
        }
      }
      if (msg.type === 'MARKEE_POST_FEED_CRAWL_STATUS') {
        setLaunchLog((prev) => [...prev, `🔄 ${msg.message}`]);
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_LOG') {
        const icon =
          msg.level === 'success' ? '✅' :
          msg.level === 'error' ? '❌' :
          msg.level === 'warn' ? '⚠️' : '📋';
        setLaunchLog((prev) => [...prev, `${icon} ${msg.message}`]);
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_PROGRESS') {
        setCrawlProgress((p) => ({
          ...p,
          groupIndex: msg.groupIndex !== undefined ? msg.groupIndex : p.groupIndex,
          totalGroups: msg.totalGroups !== undefined ? msg.totalGroups : p.totalGroups,
          posts: msg.posts !== undefined ? msg.posts : p.posts,
          scrolls: msg.scrolls !== undefined ? msg.scrolls : p.scrolls,
        }));
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_POST') {
        setCrawlProgress((p) => ({ ...p, posts: msg.posts ?? p.posts + 1 }));
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_SCROLL') {
        setCrawlProgress((p) => ({ ...p, scrolls: p.scrolls + 1 }));
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_DONE') {
        setIsLaunching(false);
        setIsDone(true);
        setLaunchLog((prev) => [
          ...prev,
          `🎉 Hoàn tất! ${msg.totalPosts ?? 0} bài viết từ ${msg.totalGroups ?? 0} groups`,
        ]);
        onCompleteRef.current?.(msg.totalPosts ?? 0);
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_COMPLETE') {
        const posts = msg.posts ?? [];
        setCrawlProgress((p) => ({ ...p, posts: posts.length }));
        setScrapedGroups((prev) => [{ groupUrl: msg.groupUrl || msg.data?.groupUrl || '', posts, groupName: msg.groupName || msg.data?.groupName || 'Group' }, ...prev]);
        setLaunchLog((prev) => {
          const lines = [...prev];
          lines.push(`✅ Group hoàn tất: ${posts.length} bài viết mới`);
          return lines;
        });
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_ERROR') {
        setLaunchLog((prev) => [...prev, `❌ Lỗi: ${msg.message}`]);
        setIsLaunching(false);
      } else if (msg.type === 'MARKEE_POST_FEED_LAUNCH_RESULT') {
        if (msg.success) {
          setLaunchLog((prev) => [
            ...prev,
            `🚀 Extension đã nhận lệnh! Tab đang được redirect...`,
          ]);
        } else {
          setLaunchLog((prev) => [
            ...prev,
            `❌ Lỗi: ${msg.error || 'Extension không phản hồi'}`,
          ]);
          setIsLaunching(false);
        }
      } else if (msg.type === 'MARKEE_POST_FEED_INVALIDATED') {
        setLaunchLog((prev) => [
          ...prev,
          "🔄 Extension vừa được cập nhật. Đang tải lại trang web để kết nối lại...",
        ]);
        setTimeout(() => window.location.reload(), 1500);
      } else if (msg.type === 'MARKEE_POST_FEED_CRAWL_SAVED') {
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

  // ── WebSocket connection for real-time crawl_saved events ────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        const wsUrl = `${process.env.NEXT_PUBLIC_API_WS_URL || 'ws://localhost:8000'}/ws/crawl-status`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WebSocket] Connected to crawl-status');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === 'crawl_saved') {
              const savedData = msg.data || msg;
              const totalCrawled = savedData.total_crawled ?? 0;
              const saved = savedData.saved ?? savedData.count ?? 0;
              const failed = savedData.failed ?? 0;

              setCrawlProgress((p) => ({
                ...p,
                groupIndex: Math.min(p.groupIndex + 1, Math.max(0, p.totalGroups - 1))
              }));

              setLaunchLog((prev) => [
                ...prev,
                `📥 Nhận ${totalCrawled} bài viết từ extension`,
                `💾 Đã lưu: ${saved}, Thất bại: ${failed}`,
              ]);

              const postsSummary = savedData.posts_summary || [];
              if (postsSummary.length > 0) {
                setLaunchLog((prev) => [
                  ...prev,
                  `📋 Chi tiết bài viết (${postsSummary.length}/${totalCrawled}):`
                ]);
                postsSummary.forEach((post: any, i: number) => {
                  const reactions = post.reactions || 0;
                  const comments = post.comments || 0;
                  const shares = post.shares || 0;
                  const preview = post.content_preview || post.content || '';
                  setLaunchLog((prev) => [
                    ...prev,
                    `   ${i + 1}. ${post.author || 'N/A'} | 👍${reactions} 💬${comments} 🔄${shares} | "${preview.substring(0, 50)}..."`
                  ]);
                });
                if (totalCrawled > postsSummary.length) {
                  setLaunchLog((prev) => [
                    ...prev,
                    `   ... và ${totalCrawled - postsSummary.length} bài viết khác`
                  ]);
                }
              }

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
                groupUrl: savedData.group_url ?? ''
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
      window.postMessage({ type: 'MARKEE_POST_FEED_PING' }, '*');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // ── Launch crawl ──────────────────────────────────────────────────────────
  const handleLaunch = useCallback(async () => {
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

      const res = await allPlatformGroupsService.getForExtension();
      const groups: ExtensionGroup[] = res.data ?? [];

      if (groups.length === 0) {
        setLaunchLog((prev) => [...prev, "⚠️ Không có group nào được gán cho bạn."]);
        setIsLaunching(false);
        return;
      }

      setLaunchLog((prev) => [
        ...prev,
        `📋 Tìm thấy ${groups.length} groups. Đang khởi động extension...`,
      ]);
      console.log('[App] Groups:', groups.length, JSON.stringify(groups.slice(0, 3)));
      setCrawlProgress((p) => ({ ...p, totalGroups: groups.length }));

      const extensionGroups = groups.map((g) => ({
        id: g.id || '',
        name: g.group_name || 'Group',
        url: g.group_url,
      }));

      window.postMessage(
        {
          type: 'MARKEE_POST_FEED_LAUNCH',
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
  }, [extensionReady]);

  // ── Stop crawl ────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    window.postMessage({ type: 'MARKEE_POST_FEED_STOP' }, '*');
    setLaunchLog((prev) => [...prev, "⏹ Đã gửi lệnh dừng..."]);
    setIsLaunching(false);
  }, []);

  // ── Render button + dialog ────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col transition-all duration-300 w-full mb-6 relative z-10">
      {/* Header / Launcher */}
      <div className="flex items-center justify-between p-4 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0 border border-violet-200/50">
            <span className="material-symbols-outlined text-violet-600 text-[22px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">Cào Dữ Liệu Tự Động (Extension)</h3>
            <p className="text-xs text-slate-500 leading-tight mt-0.5">
              {isLaunching
                ? `Đang xử lý ${crawlProgress.totalGroups} groups...`
                : "Nhấn bắt đầu để tự động duyệt qua các group."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a href="/post-feed-extension.zip" download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition cursor-pointer">
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
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
              onClick={handleLaunch}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 text-xs font-bold transition-all shadow-sm hover:shadow active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              Bắt đầu cào
            </button>
          )}
        </div>
      </div>

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
