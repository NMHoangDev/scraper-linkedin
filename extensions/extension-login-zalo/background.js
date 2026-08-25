// Cookie xác thực THẬT mà Zalo Web set sau khi user hoàn thành đăng nhập bằng
// trình duyệt (quét QR xong). Cần ÍT NHẤT 1 trong 2 key này mới coi là đã login —
// KHÔNG được để rỗng: một mảng rỗng khiến is_logged_in=true ngay khi vừa mở tab
// (chỉ cần 1 cookie zalo.me bất kỳ, kể cả cookie tracking không liên quan đăng
// nhập), khiến tab bị đóng SỚM trước khi user kịp quét QR và cookie rác được gửi
// lên backend. Tham khảo cách InvoiceFlowManager (extension Zalo ổn định) dùng
// đúng 2 key này làm điều kiện tối thiểu.
const REQUIRED_COOKIE_KEYS = ["zpsid", "zpw_sek"];
const DEFAULT_BACKEND_URL = "http://localhost:8082";
const ZALO_URL = "https://chat.zalo.me/";

// ──────────────────────────────────────────────────────────────────────
// Debug logger: log ra console + broadcast step events về tất cả tab
// matching host_permissions để UI hiển thị progress real-time.
// ──────────────────────────────────────────────────────────────────────
const DEBUG_TAG = "[zalo-extension]";

function logStep(step, details = {}) {
  const payload = { step, ts: Date.now(), ...details };
  // 1) Console (xem được trong chrome://extensions → Service worker → Inspect)
  console.log(DEBUG_TAG, step, payload);
  // 2) Broadcast về UI qua tất cả tab zalo + dashboard tabs
  broadcastStep(payload).catch(() => undefined);
}

async function broadcastStep(payload) {
  try {
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({}, (t) => resolve(t || []));
    });
    const ALLOWED_URL_RE =
      /(chat\.zalo\.me|id\.zalo\.me|zalo\.me|localhost|127\.0\.0\.1|zenithglobal\.dev|markeeai\.com)/i;
    const message = { __zaloExt: true, type: "STEP", data: payload };
    for (const tab of tabs) {
      if (!tab?.id) continue;
      const url = String(tab.url || "");
      if (!ALLOWED_URL_RE.test(url)) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (_) {
        // Tab chưa load page-bridge hoặc không quan tâm — bỏ qua
      }
    }
  } catch (_) {
    // Service worker bị unload giữa chừng — bỏ qua broadcast
  }
}

// Origins được phép gửi messages tới background (từ manifest content_scripts matches).
// Bao gồm cả extension origin để popup/offscreen page hoạt động.
const ALLOWED_SENDER_ORIGINS = new Set([
  "http://localhost",
  "http://127.0.0.1",
  "https://localhost",
  "https://127.0.0.1",
  "https://auto-fb.zenithglobal.dev",
  "https://seeding.zenithglobal.dev",
  "https://seeding.markeeai.com",
]);

function isTrustedSender(sender) {
  // Messages từ extension popup hoặc offscreen document luôn tin cậy
  if (!sender.tab) return true; // không có tab = từ extension context

  const tabUrl = sender.tab?.url || "";
  if (!tabUrl) return false;

  try {
    const origin = new URL(tabUrl).origin;
    if (ALLOWED_SENDER_ORIGINS.has(origin)) return true;

    // Fallback: cho phép localhost với bất kỳ port nào
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  } catch (_) {
    // URL parse failed
  }
  return false;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // B22: Validate sender origin — chặn messages từ tabs không được phép
  // (ví dụ: nếu extension bị inject vào trang ngoài whitelist)
  if (!isTrustedSender(sender)) {
    const senderUrl = sender.tab?.url || "(no tab)";
    console.warn("[zalo-extension] blocked message from untrusted sender:", senderUrl, message?.action);
    sendResponse({ success: false, error: "Sender origin not trusted" });
    return true;
  }

  const action = message?.action || message?.type;
  const data = message?.data || {};
  const senderUrl = sender.tab?.url || "(extension)";
  logStep("action.received", { action, senderUrl });

  handleAction(action, data)
    .then((result) => {
      logStep("action.success", { action });
      sendResponse({ success: true, data: result });
    })
    .catch((error) => {
      console.error("[zalo-extension] action failed", action, error);
      logStep("action.error", { action, error: error?.message || String(error) });
      sendResponse({
        success: false,
        error: error?.message || String(error || "Unknown extension error"),
      });
    });

  return true;
});

async function handleAction(action, data) {
  logStep("action.start", { action });

  // Mutex: chỉ cho phép 1 action IMPORT_ZALO_SESSION chạy tại một thời điểm
  // để tránh 2 request cùng lúc đóng tab chồng lên nhau
  if (action === "IMPORT_ZALO_SESSION") {
    if (_importInProgress) {
      const msg = "Another IMPORT_ZALO_SESSION is already in progress. Please wait for it to finish.";
      logStep("action.rejected_concurrent", { action, reason: msg });
      throw new Error(msg);
    }
    _importInProgress = true;
    try {
      const result = await importZaloSession(data);
      return result;
    } finally {
      _importInProgress = false;
    }
  }

  switch (action) {
    case "PING":
      return { installed: true };
    case "GET_ZALO_COOKIES":
      return await getZaloCookiesPayload();
    case "CHECK_ZALO_LOGIN":
      return await checkZaloLogin();
    case "IMPORT_ZALO_SESSION":
      return await importZaloSession(data);
    case "SYNC_ZALO_DOM_MESSAGES":
      return await syncZaloDomMessages(data);
    default:
      throw new Error(`Unsupported Zalo extension action: ${action}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeLastError() {
  return chrome.runtime.lastError?.message || "";
}

function queryTabs(query) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(query, (tabs) => {
      const err = chromeLastError();
      if (err) reject(new Error(err));
      else resolve(tabs || []);
    });
  });
}

function createTab(url, active) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url, active }, (tab) => {
      const err = chromeLastError();
      if (err) reject(new Error(err));
      else resolve(tab);
    });
  });
}

function getTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      const err = chromeLastError();
      if (err) reject(new Error(err));
      else resolve(tab);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chromeLastError();
      if (err) reject(new Error(err));
      else if (response && response.success === false) reject(new Error(response.error || "Content script error"));
      else resolve(response?.data ?? response);
    });
  });
}

function executeContentFile(tabId, file) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: [file],
      },
      (results) => {
        const err = chromeLastError();
        if (err) reject(new Error(err));
        else resolve(results || []);
      },
    );
  });
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const done = async () => {
      try {
        const tab = await getTab(tabId);
        if (tab.status === "complete") {
          logStep("tab.loaded", { tabId, url: tab.url });
          cleanup();
          resolve(tab);
          return true;
        }
      } catch (error) {
        cleanup();
        reject(error);
        return true;
      }
      return false;
    };

    const cleanup = () => {
      clearInterval(timer);
      chrome.tabs.onUpdated.removeListener(listener);
    };

    const listener = (updatedTabId, changeInfo, tab) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        logStep("tab.onUpdated.complete", { tabId, url: tab?.url });
        cleanup();
        resolve(tab);
      }
    };

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > timeoutMs) {
        logStep("tab.load.timeout", { tabId, timeoutMs });
        cleanup();
        reject(new Error("Timeout waiting for Zalo tab to load"));
        return;
      }
      await done();
    }, 500);

    chrome.tabs.onUpdated.addListener(listener);
    void done();
  });
}

async function findZaloTab() {
  const tabs = await queryTabs({});
  const zaloTabs = tabs.filter((tab) => {
    const url = String(tab.url || "").toLowerCase();
    return url.includes("zalo.me") || url.includes("chat.zalo") || url.includes("id.zalo");
  });
  const complete = zaloTabs.find((tab) => tab.status === "complete");
  const found = complete || zaloTabs[0] || null;
  logStep("findZaloTab", { totalTabs: tabs.length, zaloTabs: zaloTabs.length, foundUrl: found?.url || null, foundStatus: found?.status });
  return found;
}

let openTabPromise = null;

async function getOrOpenZaloTab({ active = false } = {}) {
  if (openTabPromise) {
    logStep("getOrOpenZaloTab.reuse_promise", { active });
    return await openTabPromise;
  }

  openTabPromise = (async () => {
    try {
      const existing = await findZaloTab();
      if (existing?.id) {
        logStep("getOrOpenZaloTab.existing", { tabId: existing.id, status: existing.status, url: existing.url });
        if (existing.status !== "complete") await waitForTabComplete(existing.id, 30000);
        return await getTab(existing.id);
      }
      logStep("getOrOpenZaloTab.creating", { url: ZALO_URL, active });
      const tab = await createTab(ZALO_URL, active);
      if (!tab?.id) throw new Error("Cannot open Zalo Web tab");
      logStep("getOrOpenZaloTab.created", { tabId: tab.id });
      await waitForTabComplete(tab.id, 30000);
      return await getTab(tab.id);
    } finally {
      openTabPromise = null;
    }
  })();

  return await openTabPromise;
}

async function ensureZaloContentScript(tabId) {
  try {
    await sendMessageToTab(tabId, { action: "PING_ZALO_CONTENT" });
    logStep("content.ready", { tabId });
    return;
  } catch (pingError) {
    logStep("content.ping_failed_reinject", { tabId, error: pingError?.message });
    try {
      await executeContentFile(tabId, "zalo-content.js");
      await wait(250);
      await sendMessageToTab(tabId, { action: "PING_ZALO_CONTENT" });
      logStep("content.reinjected", { tabId });
    } catch (e) {
      logStep("content.reinject_failed", { tabId, error: e?.message });
      console.warn("[zalo-extension] failed to ensure Zalo content script:", e);
    }
  }
}

async function getZaloPageContext(tabId) {
  try {
    await ensureZaloContentScript(tabId);
    const ctx = await sendMessageToTab(tabId, { action: "GET_ZALO_CONTEXT" });
    logStep("page.context", { tabId, url: ctx?.url, hasUA: !!ctx?.user_agent, hasImei: !!ctx?.imei });
    return ctx;
  } catch (error) {
    logStep("page.context.failed", { tabId, error: error?.message });
    console.warn("[zalo-extension] cannot read Zalo page context", error);
    return {
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      imei: "",
    };
  }
}

function getAllCookies(details) {
  return new Promise((resolve) => {
    chrome.cookies.getAll(details, (cookies) => {
      const err = chromeLastError();
      if (err) {
        console.warn("[zalo-extension] cookie query failed", details, err);
        resolve([]);
      } else {
        resolve(cookies || []);
      }
    });
  });
}

// Query cookies cho một URL từ TẤT CẢ cookie stores (default, session, profile...).
// Zalo đôi khi lưu session cookies vào store khác, không phải default store.
function getAllStoresCookies(url) {
  return new Promise((resolve) => {
    chrome.cookies.getAllCookieStores((stores) => {
      if (chromeLastError()) {
        // fallback: getAll không có store filter
        resolve(getAllCookies({ url }));
        return;
      }
      const storeIds = (stores || []).map((s) => s.id);
      Promise.all(storeIds.map((storeId) => getAllCookies({ url, storeId })))
        .then((batches) => resolve(batches.flat()))
        .catch(() => resolve(getAllCookies({ url })));
    });
  });
}

async function readZaloCookies() {
  // Các URL cần query — dùng getAllStoresCookies để đọc TẤT CẢ cookie stores
  const urls = [
    "https://chat.zalo.me/",
    "https://id.zalo.me/",
    "https://zalo.me/",
    "https://www.zalo.me/",
  ];

  // Các domain query bổ sung (chỉ dùng default store — domain query trả tất cả stores)
  const domains = [
    "zalo.me",
    ".zalo.me",
    "chat.zalo.me",
    ".chat.zalo.me",
    "id.zalo.me",
    ".id.zalo.me",
    "www.zalo.me",
    ".www.zalo.me",
    "zaloapp.com",
    ".zaloapp.com",
  ];

  const all = [];
  for (const url of urls) {
    const cookies = await getAllStoresCookies(url);
    all.push(...cookies);
  }
  for (const domain of domains) {
    all.push(...(await getAllCookies({ domain })));
  }

  // Log toàn bộ cookies gốc (chưa dedup) — debug: xem tất cả cookie Zalo trên browser
  // Throttle: chỉ log mỗi 10s để tránh spam console khi poll nhanh
  const rawCookieList = all
    .filter((c) => c?.name && String(c.domain || "").includes("zalo.me"))
    .map((c) => ({ name: c.name, domain: c.domain, storeId: c.storeId, path: c.path || "/" }))
    .sort((a, b) => (a.domain + a.name).localeCompare(b.domain + b.name));
  const now = Date.now();
  if (!_lastRawCookieLogAt || now - _lastRawCookieLogAt > 10000) {
    _lastRawCookieLogAt = now;
    console.log(
      "[zalo-extension] ALL raw zalo cookies (" + rawCookieList.length + "):",
      rawCookieList,
    );
  }

  const byKey = new Map();
  for (const cookie of all) {
    if (!cookie?.name || !String(cookie.domain || "").includes("zalo.me")) continue;
    const key = `${cookie.storeId || ""}|${cookie.name}|${cookie.domain}|${cookie.path || "/"}`;
    byKey.set(key, cookie);
  }

  const result = [...byKey.values()].map(toBackendCookie);
  const names = result.map((c) => c.name).sort();
  const missing = missingRequiredKeys(names);

  // Log ra console với tên cookies đầy đủ (không bị truncate như logStep object)
  // Throttle: mỗi 10s hoặc khi missing changes
  const missingStr = missing.join(",");
  if (!_lastCookieReadLogAt || now - _lastCookieReadLogAt > 10000 || missingStr !== _lastMissingStr) {
    _lastCookieReadLogAt = now;
    _lastMissingStr = missingStr;
    console.log(
      "[zalo-extension] cookies.read",
      `\n  raw=${all.length}  dedup=${result.length}  found=[${names.join(", ")}]`,
      `\n  required=[${REQUIRED_COOKIE_KEYS.join(", ")}]`,
      `\n  missing=[${missing.join(", ")}]  is_logged_in=${missing.length === 0}`,
    );
  }

  logStep("cookies.read", {
    rawCount: all.length,
    dedupCount: result.length,
    foundCookies: names,
    required: REQUIRED_COOKIE_KEYS,
    missingCookies: missing,
    is_logged_in: missing.length === 0,
  });

  return result;
}

function toBackendCookie(cookie) {
  const item = {
    key: cookie.name,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain || "chat.zalo.me",
    path: cookie.path || "/",
    httpOnly: !!cookie.httpOnly,
    secure: !!cookie.secure,
  };
  if (Number.isFinite(cookie.expirationDate) && cookie.expirationDate > 0) {
    item.expires = Math.floor(cookie.expirationDate);
    item.expirationDate = Math.floor(cookie.expirationDate);
  }
  const sameSite = normalizeSameSite(cookie.sameSite);
  if (sameSite) item.sameSite = sameSite;
  return item;
}

function normalizeSameSite(value) {
  const lower = String(value || "").toLowerCase();
  if (lower === "no_restriction" || lower === "none") return "none";
  if (lower === "lax") return "lax";
  if (lower === "strict") return "strict";
  return undefined;
}

function cookieKeys(cookies) {
  return [...new Set(cookies.map((cookie) => String(cookie.key || cookie.name || "").toLowerCase()).filter(Boolean))].sort();
}

function missingRequiredKeys(keys) {
  const set = new Set(keys.map((key) => key.toLowerCase()));
  return REQUIRED_COOKIE_KEYS.filter((key) => !set.has(key));
}

// true nếu tìm thấy ÍT NHẤT 1 trong REQUIRED_COOKIE_KEYS — dùng OR (không phải
// AND như missingRequiredKeys ngụ ý) vì Zalo có thể set 2 cookie này không cùng
// lúc; chỉ cần 1 cookie xác thực thật là đủ để coi phiên đã đăng nhập.
function hasAnyRequiredKey(keys) {
  const set = new Set(keys.map((key) => key.toLowerCase()));
  return REQUIRED_COOKIE_KEYS.some((key) => set.has(key));
}

async function getZaloCookiesPayload(options = {}) {
  logStep("getZaloCookies.start", { options });
  let tab = null;
  try {
    if (options.openTab) {
      tab = await getOrOpenZaloTab({ active: !!options.active });
    } else {
      tab = await findZaloTab();
    }
  } catch (e) {
    console.warn("[zalo-extension] failed to get or open Zalo tab:", e);
    logStep("getZaloCookies.tab_error", { error: e?.message });
  }

  const context = tab?.id ? await getZaloPageContext(tab.id) : {};
  const cookies = await readZaloCookies();

  // Bổ sung: content script đọc document.cookie (có thể thấy httpOnly JS-set cookies)
  let docCookies = [];
  if (tab?.id) {
    try {
      const result = await sendMessageToTab(tab.id, { action: "GET_DOCUMENT_COOKIES" });
      if (result?.cookies?.length) {
        console.log("[zalo-extension] document.cookie bonus cookies:", result.cookies);
        docCookies = result.cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: "chat.zalo.me", // document.cookie luôn dùng domain hiện tại
          path: "/",
          httpOnly: false,
          secure: false,
        }));
      }
    } catch (e) {
      console.warn("[zalo-extension] GET_DOCUMENT_COOKIES failed:", e?.message);
    }
  }

  // Merge docCookies vào cookies, tránh trùng tên
  const nameSet = new Set(cookies.map((c) => c.name));
  const newCookies = docCookies.filter((c) => !nameSet.has(c.name));
  const allCookies = [...cookies, ...newCookies];

  const keys = cookieKeys(allCookies);
  const missing = missingRequiredKeys(keys);
  // is_logged_in = tìm thấy ÍT NHẤT 1 cookie xác thực thật (zpsid/zpw_sek).
  // KHÔNG dùng "missing.length === 0" (yêu cầu CẢ HAI + dễ bị treo nếu Zalo set
  // 2 cookie không đồng thời) và KHÔNG dùng "allCookies.length > 0" (bug cũ:
  // với REQUIRED_COOKIE_KEYS rỗng, 1 cookie tracking bất kỳ cũng đủ để coi là
  // đã login ngay khi vừa mở tab, trước khi user kịp quét QR).
  const is_logged_in = hasAnyRequiredKey(keys);

  logStep("getZaloCookies.done", {
    tabId: tab?.id || null,
    tabUrl: tab?.url || null,
    cookieCount: allCookies.length,
    chromeApiCookies: cookies.length,
    docCookies: newCookies.length,
    keysFound: keys,
    missing,
    is_logged_in,
  });

  return {
    cookies: allCookies,
    keys,
    user_agent: context.user_agent || (typeof navigator !== "undefined" ? navigator.userAgent : ""),
    imei: context.imei || "",
    missing,
    is_logged_in,
  };
}

async function checkZaloLogin() {
  const payload = await getZaloCookiesPayload();
  return {
    is_logged_in: payload.is_logged_in,
    cookies_count: payload.cookies.length,
    missing: payload.missing,
    keys: payload.keys,
  };
}

let lastZaloTabId = null;
let _importInProgress = false;
let _lastRawCookieLogAt = 0;
let _lastCookieReadLogAt = 0;
let _lastMissingStr = "";

async function waitForLoginCookies(timeoutMs = 35000) {
  logStep("waitLogin.start", { timeoutMs });
  const startedAt = Date.now();

  // Lần đầu: mở tab mới (openTab: true)
  let payload = await getZaloCookiesPayload({ openTab: true, active: true });

  const tab = await findZaloTab();
  if (tab?.id) {
    lastZaloTabId = tab.id;
  }

  let attempt = 0;
  let lastLogAt = 0;

  while (!payload.is_logged_in && Date.now() - startedAt < timeoutMs) {
    attempt++;
    const elapsed = Date.now() - startedAt;
    // Throttle log: mỗi 10s hoặc attempt đầu tiên
    if (attempt === 1 || Date.now() - lastLogAt >= 10000) {
      lastLogAt = Date.now();
      logStep("waitLogin.poll", {
        attempt,
        elapsed,
        remaining: timeoutMs - elapsed,
        foundCookies: payload.keys,
        missingCookies: payload.missing,
      });
    }
    await wait(2000);
    // Chỉ poll, không log — tiết kiệm log noise
    payload = await getZaloCookiesPayload({ openTab: false });
  }

  logStep("waitLogin.done", {
    is_logged_in: payload.is_logged_in,
    totalAttempts: attempt,
    totalMs: Date.now() - startedAt,
    foundCookies: payload.keys,
    missingCookies: payload.missing,
  });

  return payload;
}

const DEFAULT_LOGIN_TIMEOUT_MS = 90000;

function makeEndpoint(baseUrl, path) {
  const base = String(baseUrl || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
  if (base.endsWith("/api/all-platform")) return `${base}${path.replace(/^\/api\/all-platform/, "")}`;
  if (base.endsWith("/api")) return `${base}${path.replace(/^\/api/, "")}`;
  return `${base}${path}`;
}

async function postJson(url, body, apiKey, userId) {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers["X-API-Key"] = apiKey;
  if (userId) headers["X-User-ID"] = userId;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_error) {
    data = text;
  }

  return { status: response.status, ok: response.ok, data };
}

function backendError(result, fallback) {
  const detail = result?.data?.detail || result?.data?.message || result?.data?.error || result?.data;
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail || fallback);
  } catch (_error) {
    return fallback;
  }
}

async function importZaloSession(data) {
  const accountId = String(data.account_id || data.user_id || "default").trim() || "default";
  const backendUrl = data.backend_url || DEFAULT_BACKEND_URL;
  const apiKey = data.api_key || "";

  logStep("import.start", { accountId, backendUrl, loginTimeout: data.login_timeout_ms || DEFAULT_LOGIN_TIMEOUT_MS });

  const payload = await waitForLoginCookies(Number(data.login_timeout_ms || DEFAULT_LOGIN_TIMEOUT_MS));

  if (!payload.is_logged_in) {
    logStep("import.login_failed", { missing: payload.missing });
    throw new Error(
      `Zalo Web is not logged in or required cookies are missing: ${payload.missing.join(", ")}. Open Zalo Web, finish login, then retry.`,
    );
  }

  logStep("import.cookies_ok", { cookiesCount: payload.cookies.length, keys: payload.keys });

  const body = {
    account_id: accountId,
    user_id: data.user_id || accountId,
    owner_id: data.owner_id || accountId,
    cookies: payload.cookies,
    user_agent: payload.user_agent,
  };
  if (payload.imei) body.imei = payload.imei;

  const endpoint = makeEndpoint(backendUrl, "/api/all-platform/zalo/auth/import-session");
  logStep("import.posting_to_backend", { endpoint, cookiesCount: payload.cookies.length });

  const result = await postJson(endpoint, body, apiKey, accountId);

  if (!result.ok) {
    logStep("import.backend_failed", { status: result.status, error: backendError(result, "unknown") });
    // KHÔNG đóng tab khi backend từ chối — giữ tab để user thấy lỗi và có thể
    // retry ngay, thay vì phải mở lại Zalo Web từ đầu (đúng cách InvoiceFlowManager
    // làm: chỉ auto-close SAU KHI backend xác nhận thành công).
    throw new Error(`Backend import-session failed (${result.status}): ${backendError(result, "unknown error")}`);
  }

  logStep("import.success", { status: result.status, cookiesCount: payload.cookies.length });

  // Auto-close Zalo Web tab CHỈ SAU KHI backend đã nhận cookie thành công.
  const tabIdToClose = lastZaloTabId || (await findZaloTab())?.id;
  if (tabIdToClose) {
    try {
      await chrome.tabs.remove(tabIdToClose);
      logStep("import.tab_closed", { tabId: tabIdToClose });
    } catch (e) {
      logStep("import.tab_close_failed", { tabId: tabIdToClose, error: e?.message });
    }
  }
  lastZaloTabId = null;

  return {
    status: result.status,
    backend: result.data,
    cookies_count: payload.cookies.length,
    keys: payload.keys,
  };
}

async function syncZaloDomMessages(data) {
  const accountId = String(data.account_id || data.user_id || "default").trim() || "default";
  const backendUrl = data.backend_url || DEFAULT_BACKEND_URL;
  const apiKey = data.api_key || "";

  logStep("syncDom.start", { accountId, conversationId: data.conversation_id || null });

  const tab = await getOrOpenZaloTab({ active: false });
  if (!tab?.id) throw new Error("Cannot find or open Zalo Web tab");
  logStep("syncDom.tab_ready", { tabId: tab.id, url: tab.url });

  await ensureZaloContentScript(tab.id);

  logStep("syncDom.scraping", { tabId: tab.id });
  const scraped = await sendMessageToTab(tab.id, {
    action: "SCRAPE_ZALO_DOM_MESSAGES",
    data: {
      conversation_id: data.conversation_id || "",
      limit: Number(data.limit || 50),
      conversation_limit: Number(data.conversation_limit || 10),
    },
  });

  const conversations = Array.isArray(scraped?.conversations) ? scraped.conversations : [];
  logStep("syncDom.scraped", {
    tabId: tab.id,
    conversationsCount: conversations.length,
    activeGroupId: scraped?.active_group_id,
    messagesPerConv: conversations.map((c) => c.messages?.length || 0),
  });

  if (conversations.length === 0) {
    logStep("syncDom.no_conversations", { tabId: tab.id });
    throw new Error("No Zalo conversations/messages were found in the current Zalo Web DOM.");
  }

  const endpoint = makeEndpoint(backendUrl, "/api/all-platform/zalo/conversations/sync-dom");
  logStep("syncDom.posting_to_backend", { endpoint, conversationsCount: conversations.length });

  const result = await postJson(
    endpoint,
    {
      account_id: accountId,
      conversations,
    },
    apiKey,
    accountId,
  );

  logStep("syncDom.done", {
    status: result.status,
    ok: result.ok,
    conversationsCount: conversations.length,
    totalMessages: conversations.reduce((sum, item) => sum + (item.messages?.length || 0), 0),
  });

  return {
    status: result.status,
    backend: result.data,
    scraped: {
      conversations_count: conversations.length,
      messages_count: conversations.reduce((sum, item) => sum + (item.messages?.length || 0), 0),
      active_group_id: scraped?.active_group_id || null,
      active_group_name: scraped?.active_group_name || null,
    },
  };
}
