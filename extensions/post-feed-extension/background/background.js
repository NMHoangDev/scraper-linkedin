// ============================================================
// background.js — Service Worker điều phối crawl giữa popup và content script
// Quản lý queue groups, redirect tự động, gửi kết quả về popup
// ============================================================

// ── State ───────────────────────────────────────────────────
let crawlState = {
  running: false,
  groups: [],
  currentGroupIndex: 0,
  results: [],
  config: {},
  currentTabId: null,
  scrollCount: 0,
};

// ── Install / Startup ──────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log('[FB Crawler] Extension installed');
  chrome.storage.local.set({ crawlResults: [], groups: [] });
});

// ── Messages from Popup ────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'START_CRAWL') {
    startCrawlJob(msg.config, msg.groups);
    sendResponse({ ok: true });
  } else if (msg.action === 'STOP_CRAWL') {
    stopCrawlJob();
    sendResponse({ ok: true });
  } else if (msg.action === 'GET_STATE') {
    sendResponse(crawlState);
  } else if (msg.action === 'PING') {
    sendResponse({ ok: true, version: '1.0.0' });
  } else if (msg.action === 'LAUNCH_FROM_APP') {
    // Triggered from web app — launch crawl with groups from app
    startCrawlFromApp(msg.groups, msg.config);
    sendResponse({ ok: true, message: 'Launching...' });
  }
  return true;
});

// ── Messages from Content Script ───────────────────────────
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab) return;

  switch (msg.type) {
    case 'CRAWL_POST':
      crawlState.results.push(msg.post);
      break;

    case 'CRAWL_SCROLL':
      crawlState.scrollCount++;
      break;

    case 'CRAWL_LOG':
      forwardToPopup({
        type: 'CRAWL_LOG',
        level: msg.level,
        message: msg.message,
      });
      break;

    case 'CRAWL_PROGRESS':
      forwardToPopup({
        type: 'CRAWL_PROGRESS',
        progress: msg.progress,
        progressText: msg.progressText,
        groupIndex: crawlState.currentGroupIndex,
      });
      break;

    case 'CRAWL_DONE':
      handleGroupDone(msg.posts);
      break;

    case 'CRAWL_ERROR':
      forwardToPopup({ type: 'CRAWL_ERROR', message: msg.message });
      crawlState.running = false;
      break;

    case 'CONTENT_READY':
      console.log('[FB Crawler] Content ready on:', msg.url);
      break;
  }
});

// ── Launch from Web App ────────────────────────────────────
async function startCrawlFromApp(groups, config) {
  if (crawlState.running) {
    await stopCrawlJob();
    await sleep(500);
  }

  crawlState = {
    running: true,
    groups: groups.map(g => ({ ...g, status: 'pending' })),
    currentGroupIndex: 0,
    results: [],
    config: config || { maxPosts: 100, scrollDelay: 2000, autoNextGroup: true },
    currentTabId: null,
    scrollCount: 0,
  };

  // Forward to ALL tabs that have content script loaded (the active FB tab)
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab) {
    forwardToPopup({ type: 'CRAWL_ERROR', message: 'Không tìm thấy tab nào' });
    crawlState.running = false;
    return;
  }

  const isFacebook = tab.url && /facebook\.com/.test(tab.url);
  crawlState.currentTabId = tab.id;

  if (!isFacebook) {
    // Navigate to first group
    const firstGroup = crawlState.groups[0];
    if (firstGroup) {
      forwardToPopup({ type: 'CRAWL_LOG', level: 'info', message: `Mở group: ${firstGroup.name}` });
      forwardToPopup({ type: 'CRAWL_STATUS', status: 'running', message: `Đang mở: ${firstGroup.name}` });
      await chrome.tabs.update(tab.id, { url: firstGroup.url });
      await waitForPageLoad(tab.id);
      await sleep(3000);
    }
  }

  crawlState.groups[0].status = 'active';
  forwardToPopup({ type: 'CRAWL_STATUS', status: 'running', message: `Bắt đầu cào...` });
  forwardToPopup({ type: 'CRAWL_LOG', level: 'info', message: `🚀 App đã khởi động! Cào ${crawlState.groups.length} groups` });

  // Send start to content script
  await sendToContent(tab.id, { action: 'START', config: crawlState.config });
}



// ── Stop Crawl ─────────────────────────────────────────────
async function stopCrawlJob() {
  if (!crawlState.running) return;

  crawlState.running = false;

  if (crawlState.currentTabId) {
    try {
      await sendToContent(crawlState.currentTabId, { action: 'STOP' });
    } catch {}
  }

  forwardToPopup({ type: 'CRAWL_STATUS', status: 'idle', message: 'Đã dừng' });
  forwardToPopup({ type: 'CRAWL_LOG', level: 'warn', message: 'Đã dừng crawl' });
}

// ── Handle Group Done ──────────────────────────────────────
async function handleGroupDone(posts) {
  if (!crawlState.running) return;

  const doneGroup = crawlState.groups[crawlState.currentGroupIndex];
  doneGroup.status = 'done';

  // Merge posts vào results
  if (posts && posts.length > 0) {
    crawlState.results.push(...posts);
  }

  forwardToPopup({
    type: 'CRAWL_LOG',
    level: 'success',
    message: `✅ Group "${doneGroup.name}": cào được ${posts?.length || 0} bài`,
  });

  // Kiểm tra auto-next
  if (!crawlState.config.autoNextGroup) {
    finishCrawl();
    return;
  }

  // Tìm group tiếp theo
  const nextIndex = crawlState.groups.findIndex(
    (g, i) => i > crawlState.currentGroupIndex && g.status === 'pending'
  );

  if (nextIndex === -1) {
    finishCrawl();
    return;
  }

  crawlState.currentGroupIndex = nextIndex;
  const nextGroup = crawlState.groups[nextIndex];
  nextGroup.status = 'active';

  forwardToPopup({
    type: 'CRAWL_LOG',
    level: 'info',
    message: `→ Chuyển sang group tiếp theo: ${nextGroup.name}`,
  });

  // Redirect đến group mới
  await chrome.tabs.update(crawlState.currentTabId, { url: nextGroup.url });

  // Đợi page load xong
  await waitForPageLoad(crawlState.currentTabId);

  // Đợi thêm cho feed render
  await sleep(3000);

  // Gửi lệnh cào cho content script
  await sendToContent(crawlState.currentTabId, { action: 'START', config: crawlState.config });
}

// ── Finish Crawl ─────────────────────────────────────────────
function finishCrawl() {
  crawlState.running = false;

  forwardToPopup({ type: 'CRAWL_STATUS', status: 'done', message: 'Hoàn tất' });
  forwardToPopup({
    type: 'CRAWL_DONE',
    totalGroups: crawlState.groups.length,
    totalPosts: crawlState.results.length,
  });
  forwardToPopup({
    type: 'CRAWL_LOG',
    level: 'success',
    message: `🎉 Hoàn tất! Tổng: ${crawlState.results.length} bài từ ${crawlState.groups.filter(g => g.status === 'done').length} groups`,
  });

  // Lưu vào storage
  chrome.storage.local.set({ crawlResults: crawlState.results });
}

// ── Helpers ─────────────────────────────────────────────────
async function sendToContent(tabId, msg) {
  return chrome.tabs.sendMessage(tabId, msg);
}

function forwardToPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
  // Also save to storage for popup reading
  chrome.storage.local.set({ lastMessage: msg });
}

async function waitForPageLoad(tabId, timeout = 15000) {
  return new Promise(resolve => {
    const start = Date.now();

    const check = async (tabId) => {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab.status === 'complete') {
          resolve();
          return true;
        }
      } catch {}

      if (Date.now() - start > timeout) {
        resolve();
        return true;
      }

      setTimeout(() => check(tabId), 500);
      return false;
    };

    check(tabId);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
