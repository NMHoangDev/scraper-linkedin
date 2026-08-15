// LinkedIn Group Post Crawler — background service worker.
// Điều phối: mở 1 tab riêng, chuyển qua từng group trong queue, nhận bài từ content.js,
// POST lên backend ngay sau mỗi group, relay log/progress cho popup.

const TAB_LOAD_TIMEOUT_MS = 30000;
const SETTLE_DELAY_MS = 4000; // LinkedIn còn lazy-load sau khi status === 'complete'
const INTER_GROUP_COOLDOWN_MS = 6000;

let crawlState = null;

function defaultState() {
  return {
    running: false,
    groupQueue: [], // {url, name, status: 'pending'|'running'|'done'|'error', posts, savedCount, error}
    currentIndex: -1,
    config: { maxPosts: 40, scrollDelayMinMs: 2500, scrollDelayMaxMs: 5000, autoNextGroup: true },
    apiBase: "http://localhost:8000",
    apiKey: "markee-extension-key-2024",
    idMember: null,
    tabId: null,
    totalPosts: 0,
    totalSaved: 0,
  };
}

async function getState() {
  if (crawlState) return crawlState;
  const stored = await chrome.storage.local.get("li_crawl_state");
  crawlState = stored.li_crawl_state || defaultState();
  return crawlState;
}

async function persistState() {
  await chrome.storage.local.set({ li_crawl_state: crawlState });
  await chrome.storage.session.set({ li_crawl_running: !!crawlState.running });
}

function broadcast(message) {
  chrome.storage.local.set({ li_crawl_last_message: message });
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {
    // popup có thể đang đóng — không sao, message đã lưu vào storage để popup đọc lại
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForTabLoad(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(timer);
      resolve(ok);
    }
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish(true);
    }
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) return finish(false);
      if (tab && tab.status === "complete") return finish(true);
      chrome.tabs.onUpdated.addListener(listener);
    });
    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

async function sendToContentWithRetry(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    // Content script có thể chưa kịp sẵn sàng — reload tab và thử lại đúng 1 lần
    await chrome.tabs.reload(tabId);
    await waitForTabLoad(tabId, TAB_LOAD_TIMEOUT_MS);
    await sleep(SETTLE_DELAY_MS);
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (e2) {
      throw e2;
    }
  }
}

async function postToBackend(state, groupUrl, groupName, posts) {
  if (!posts.length) return { success: true, saved_count: 0, skipped_duplicates: 0 };
  try {
    const res = await fetch(`${state.apiBase}/api/all-platform/extension/linkedin/save-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": state.apiKey },
      body: JSON.stringify({
        group_url: groupUrl,
        group_name: groupName,
        id_member: state.idMember || null,
        posts,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.detail || `HTTP ${res.status}` };
    }
    return data;
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// --- Lệnh một-lần (single-post fetch/comment), KHÔNG dùng crawlState/getState() ---
// Đây là lệnh request/response một lần cho 1 URL, khác hẳn lifecycle hàng đợi nhiều
// group ở trên. Mở bằng 1 CỬA SỔ THU NHỎ (minimized popup window) thay vì tab trong
// cửa sổ chính — LinkedIn bắt buộc dùng session trình duyệt thật (không cào server-side
// như Facebook được), nhưng làm vậy để không hiện tab/gây gián đoạn người dùng đang thao tác.

async function openHiddenWindow(url) {
  const win = await chrome.windows.create({ url, type: "popup", state: "minimized", focused: false });
  const tab = win.tabs && win.tabs[0];
  return { windowId: win.id, tabId: tab ? tab.id : null };
}

async function closeHiddenWindow(windowId) {
  if (windowId == null) return;
  try {
    await chrome.windows.remove(windowId);
  } catch (e) {}
}

// Riêng luồng comment: mở 1 tab bình thường bên cạnh tab hiện tại (không phải cửa sổ
// thu nhỏ nằm dưới taskbar) — comment xong tự đóng tab lại.
async function openVisibleTab(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  return { tabId: tab.id };
}

async function closeVisibleTab(tabId) {
  if (tabId == null) return;
  try {
    await chrome.tabs.remove(tabId);
  } catch (e) {}
}

async function fetchOnePostInfo(url) {
  let windowId;
  try {
    const opened = await openHiddenWindow(url);
    windowId = opened.windowId;
    if (!opened.tabId) return { success: false, error: "Không mở được cửa sổ ẩn để cào bài viết." };
    const loaded = await waitForTabLoad(opened.tabId, TAB_LOAD_TIMEOUT_MS);
    if (!loaded) return { success: false, error: "Tab LinkedIn tải quá lâu, vui lòng thử lại." };
    await sleep(SETTLE_DELAY_MS);
    const resp = await sendToContentWithRetry(opened.tabId, { type: "LI_POST_FETCH_ONE", url });
    return resp || { success: false, error: "Không nhận được phản hồi từ content script." };
  } catch (e) {
    return { success: false, error: String(e) };
  } finally {
    await closeHiddenWindow(windowId);
  }
}

async function postOneComment(url, text, verifyConfig, dashboardTabId) {
  function notify(type, extra) {
    if (dashboardTabId) {
      chrome.tabs.sendMessage(dashboardTabId, { type, ...extra }).catch(() => {});
    }
  }

  let tabId;
  let result;
  try {
    notify("LI_COMMENT_PROGRESS", { status: "Đang mở bài viết LinkedIn..." });
    const opened = await openVisibleTab(url);
    tabId = opened.tabId;
    if (!tabId) {
      // KHÔNG dùng `return` ở đây — return trong try sẽ thoát luôn cả hàm, bỏ qua
      // đoạn ghi KPI + notify LI_COMMENT_DONE bên dưới, khiến dashboard bị treo mãi
      // ở trạng thái "Đang gửi...". Dùng if/else lồng nhau để luôn chạy tới cuối hàm.
      result = { success: false, error: "Không mở được tab để comment." };
    } else {
      const loaded = await waitForTabLoad(tabId, TAB_LOAD_TIMEOUT_MS);
      if (!loaded) {
        result = { success: false, error: "Tab tải quá lâu." };
      } else {
        await sleep(SETTLE_DELAY_MS);
        notify("LI_COMMENT_PROGRESS", { status: "Đang nhập và gửi comment..." });
        result = await sendToContentWithRetry(tabId, { type: "LI_POST_COMMENT_ONE", url, text });
        if (!result) result = { success: false, error: "Không có phản hồi từ content script." };
      }
    }
  } catch (e) {
    result = { success: false, error: String(e) };
  } finally {
    await closeVisibleTab(tabId);
  }

  if (verifyConfig && verifyConfig.email_member) {
    try {
      await fetch(`${verifyConfig.apiBase}/api/all-platform/internal-engagement/kpi/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_member: verifyConfig.email_member,
          link_post: url,
          platform: "linkedin",
          action_type: "comment",
          content: text,
          status: result.success ? "success" : "failed",
          error_message: result.success ? undefined : result.error,
        }),
      });
    } catch (e) {
      // Không chặn báo kết quả về UI dù ghi KPI lỗi
    }
  }

  notify("LI_COMMENT_DONE", { result });
}

async function runQueue() {
  const state = await getState();
  while (state.running) {
    const item = state.groupQueue[state.currentIndex];
    if (!item) break;

    item.status = "running";
    await persistState();
    broadcast({ type: "LI_CRAWL_QUEUE_STATUS", groupIndex: state.currentIndex, totalGroups: state.groupQueue.length, groupUrl: item.url });

    try {
      if (!state.tabId) {
        const tab = await chrome.tabs.create({ url: item.url, active: true });
        state.tabId = tab.id;
      } else {
        await chrome.tabs.update(state.tabId, { url: item.url });
      }
      await persistState();

      const loaded = await waitForTabLoad(state.tabId, TAB_LOAD_TIMEOUT_MS);
      if (!loaded) {
        broadcast({ type: "LI_CRAWL_LOG", level: "warn", message: `Tab tải chậm/không xong cho ${item.url}, vẫn thử tiếp.` });
      }
      await sleep(SETTLE_DELAY_MS);

      if (!state.running) break;
      await sendToContentWithRetry(state.tabId, { type: "LI_CRAWL_RUN", config: state.config });
    } catch (e) {
      item.status = "error";
      item.error = String(e);
      broadcast({ type: "LI_CRAWL_ERROR", groupUrl: item.url, message: String(e) });
      const advanced = await advanceQueue(state);
      if (!advanced) break;
      continue;
    }

    // Chờ content.js báo LI_CRAWL_GROUP_DONE hoặc LI_CRAWL_ERROR (xử lý trong onMessage listener).
    // runQueue() dừng vòng lặp ở đây; onMessage sẽ gọi lại advanceQueue()+runQueue() khi cần.
    return;
  }
  await finishCrawl();
}

async function advanceQueue(state) {
  if (!state.config.autoNextGroup) return false;
  const nextIndex = state.groupQueue.findIndex((g, i) => i > state.currentIndex && g.status === "pending");
  if (nextIndex === -1) return false;
  await sleep(INTER_GROUP_COOLDOWN_MS);
  state.currentIndex = nextIndex;
  await persistState();
  return true;
}

async function finishCrawl() {
  const state = await getState();
  state.running = false;
  await persistState();
  broadcast({ type: "LI_CRAWL_ALL_DONE", totalGroups: state.groupQueue.length, totalPosts: state.totalPosts, totalSaved: state.totalSaved });
}

async function handleGroupDone(msg, sender) {
  const state = await getState();
  if (!sender.tab || sender.tab.id !== state.tabId) return;

  const item = state.groupQueue[state.currentIndex];
  if (!item) return;

  item.status = msg.stopped ? "stopped" : "done";
  item.posts = msg.posts || [];
  state.totalPosts += item.posts.length;
  await persistState();

  broadcast({ type: "LI_CRAWL_LOG", level: "info", message: `Nhóm "${msg.groupName || msg.groupUrl}" xong: ${item.posts.length} bài. Đang lưu về backend...` });

  const saveResult = await postToBackend(state, msg.groupUrl, msg.groupName, item.posts);
  item.savedCount = saveResult.saved_count || 0;
  state.totalSaved += item.savedCount;
  await persistState();

  broadcast({
    type: "LI_CRAWL_SAVE_RESULT",
    groupUrl: msg.groupUrl,
    success: !!saveResult.success,
    savedCount: saveResult.saved_count || 0,
    skippedDuplicates: saveResult.skipped_duplicates || 0,
    message: saveResult.message || null,
  });

  if (!state.running) return;

  const advanced = await advanceQueue(state);
  if (advanced) {
    runQueue();
  } else {
    await finishCrawl();
  }
}

async function handleError(msg, sender) {
  const state = await getState();
  if (!sender.tab || sender.tab.id !== state.tabId) return;

  const item = state.groupQueue[state.currentIndex];
  if (item) {
    item.status = "error";
    item.error = msg.message;
  }
  await persistState();
  broadcast({ type: "LI_CRAWL_ERROR", groupUrl: msg.groupUrl, message: msg.message });

  if (!state.running) return;
  const advanced = await advanceQueue(state);
  if (advanced) {
    runQueue();
  } else {
    await finishCrawl();
  }
}

async function startCrawl(payload) {
  const state = defaultState();
  state.groupQueue = (payload.groupUrls || [])
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url) => ({ url, name: null, status: "pending", posts: [], savedCount: 0, error: null }));
  state.config = Object.assign(state.config, payload.config || {});
  state.apiBase = payload.apiBase || state.apiBase;
  state.apiKey = payload.apiKey || state.apiKey;
  state.idMember = payload.idMember || null;
  state.running = state.groupQueue.length > 0;
  state.currentIndex = state.groupQueue.length > 0 ? 0 : -1;

  crawlState = state;
  await persistState();

  if (state.running) {
    runQueue();
  }
  return { started: state.running, totalGroups: state.groupQueue.length };
}

async function stopCrawl() {
  const state = await getState();
  state.running = false;
  await persistState();
  if (state.tabId) {
    try {
      await chrome.tabs.sendMessage(state.tabId, { type: "LI_CRAWL_HALT" });
    } catch (e) {
      // tab/content script có thể đã đóng — không sao
    }
  }
  broadcast({ type: "LI_CRAWL_ALL_DONE", totalGroups: state.groupQueue.length, totalPosts: state.totalPosts, totalSaved: state.totalSaved, stopped: true });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  // Lệnh từ bridge.js (chạy trên tab dashboard — sender.tab CÓ giá trị nhưng không
  // phải tab LinkedIn) — phải kiểm tra trước nhánh sender.tab bên dưới (nhánh đó chỉ
  // dành cho message từ content.js trong tab LinkedIn của hàng đợi group-crawl).
  if (msg.type === "LI_FETCH_POST_INFO") {
    fetchOnePostInfo(msg.url).then(sendResponse);
    return true;
  }
  if (msg.type === "LI_START_COMMENT") {
    const dashboardTabId = sender.tab ? sender.tab.id : null;
    sendResponse({ started: true });
    postOneComment(msg.url, msg.text, msg.verifyConfig, dashboardTabId);
    return true;
  }

  if (sender.tab) {
    // Message từ content script trong LinkedIn tab
    if (msg.type === "LI_CRAWL_GROUP_DONE") {
      handleGroupDone(msg, sender);
    } else if (msg.type === "LI_CRAWL_ERROR") {
      handleError(msg, sender);
    } else if (msg.type === "LI_CRAWL_POST" || msg.type === "LI_CRAWL_PROGRESS" || msg.type === "LI_CRAWL_LOG" || msg.type === "LI_CRAWL_CONTENT_READY") {
      broadcast(msg);
    }
    return;
  }

  // Message từ popup
  if (msg.type === "LI_CRAWL_START") {
    startCrawl(msg).then(sendResponse);
    return true;
  }
  if (msg.type === "LI_CRAWL_STOP") {
    stopCrawl().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === "LI_CRAWL_GET_STATE") {
    getState().then((state) => sendResponse(state));
    return true;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await getState();
  if (state.tabId === tabId && state.running) {
    state.running = false;
    state.tabId = null;
    await persistState();
    broadcast({ type: "LI_CRAWL_LOG", level: "warn", message: "Tab cào bị đóng — đã dừng." });
    broadcast({ type: "LI_CRAWL_ALL_DONE", totalGroups: state.groupQueue.length, totalPosts: state.totalPosts, totalSaved: state.totalSaved, stopped: true });
  }
});
