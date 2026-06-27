/**
 * Provision Bridge - Cầu nối giữa App Dashboard và Extension
 * Content script chạy trên dashboard (localhost:3000)
 * Nhận lệnh từ app -> gửi sang background -> nhận kết quả -> reply về app
 */

interface AppMessage {
  type: string;
  data?: any;
}

// ─── Xử lý message từ app (frontend) ────────────────────────
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data: AppMessage = event.data;
  if (!data || typeof data !== 'object') return;

  console.log('[ProvisionBridge] Từ app:', data.type, data.data);

  // 1) App ping để hỏi extension đã cài chưa
  if (data.type === 'MARKEE_FB_PING') {
    console.log('[ProvisionBridge] Nhận PING, hỏi background...');
    try {
      chrome.runtime.sendMessage({ action: 'getServiceStatus' }, (resp: any) => {
        const err = chrome.runtime.lastError?.message;
        console.log('[ProvisionBridge] getServiceStatus resp:', resp, 'err:', err);
        window.postMessage({
          type: 'MARKEE_FB_PONG',
          installed: !err,
          connected: !!(resp?.data?.isConnected),
          isRunning: !!(resp?.data?.isRunning),
          progress: resp?.data?.progress
        }, '*');
      });
    } catch (e: any) {
      if (e.message?.includes('Extension context invalidated')) {
        window.postMessage({ type: 'EXTENSION_INVALIDATED' }, '*');
      }
    }
    return;
  }

  // 2) App gửi lệnh LAUNCH_FROM_APP -> crawl feed
  if (data.type === 'LAUNCH_FROM_APP') {
    console.log('[ProvisionBridge] Nhận LAUNCH_FROM_APP:', JSON.stringify(data.data));
    const { groups, config } = data.data || {};

    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      window.postMessage({
        type: 'LAUNCH_FROM_APP_RESULT',
        success: false,
        error: 'Không có danh sách groups'
      }, '*');
      return;
    }

    try {
      chrome.runtime.sendMessage(
        { action: 'LAUNCH_FROM_APP', data: { groups, config } },
        (resp: any) => {
          const err = chrome.runtime.lastError?.message;
          console.log('[ProvisionBridge] Response từ background:', resp, 'err:', err);
          window.postMessage({
            type: 'LAUNCH_FROM_APP_RESULT',
            success: !err && !!(resp?.success),
            error: err || resp?.error,
            data: resp?.data
          }, '*');
        }
      );
    } catch (e: any) {
      if (e.message?.includes('Extension context invalidated')) {
        window.postMessage({ type: 'EXTENSION_INVALIDATED' }, '*');
      }
    }
    return;
  }

  // 3) App gửi lệnh STOP crawl
  if (data.type === 'STOP_CRAWL') {
    try {
      chrome.runtime.sendMessage({ action: 'STOP_CRAWL' }, (resp: any) => {
        window.postMessage({
          type: 'STOP_CRAWL_RESULT',
          success: !!(resp?.success)
        }, '*');
      });
    } catch (e: any) {
      if (e.message?.includes('Extension context invalidated')) {
        window.postMessage({ type: 'EXTENSION_INVALIDATED' }, '*');
      }
    }
    return;
  }
});

// ─── Lắng nghe message từ background ────────────────────────
// Background gửi crawl status về đây -> forward lên app
chrome.runtime.onMessage.addListener((message: any) => {
  if (!message.action) return;

  console.log('[ProvisionBridge] Từ background:', message.action, message.data);

  switch (message.action) {
    case 'CRAWL_LOG':
      // Forward log tới app
      window.postMessage({
        type: 'CRAWL_LOG',
        level: message.data?.level || 'info',
        message: message.data?.message || ''
      }, '*');
      break;

    case 'CRAWL_PROGRESS':
      // Forward progress tới app
      window.postMessage({
        type: 'CRAWL_PROGRESS',
        groupIndex: message.data?.groupIndex,
        totalGroups: message.data?.totalGroups,
        groupName: message.data?.groupName,
        posts: message.data?.posts,
        scrolls: message.data?.scrolls
      }, '*');
      break;

    case 'CRAWL_COMPLETE':
      // Kết quả crawl từ content script (mỗi group)
      window.postMessage({
        type: 'CRAWL_COMPLETE',
        groupUrl: message.data?.groupUrl,
        posts: message.data?.posts,
        totalPosts: message.data?.totalPosts,
        scrolls: message.data?.scrolls,
        timestamp: message.data?.timestamp
      }, '*');
      break;

    case 'CRAWL_DONE':
      window.postMessage({
        type: 'CRAWL_DONE',
        totalPosts: message.data?.totalPosts,
        totalGroups: message.data?.totalGroups
      }, '*');
      break;

    case 'CRAWL_ERROR':
      window.postMessage({
        type: 'CRAWL_ERROR',
        message: message.data?.message || 'Lỗi không xác định'
      }, '*');
      break;
  }
});

// Báo cho app biết extension đã load
console.log('[ProvisionBridge] Content script loaded, posting MARKEE_FB_EXTENSION_READY');
window.postMessage({ type: 'MARKEE_FB_EXTENSION_READY' }, '*');
