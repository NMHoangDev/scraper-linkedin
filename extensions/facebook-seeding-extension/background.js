/**
 * Background Service Worker - Facebook Seeding KPI Checker
 * Auto-configured: API URL + Key được set mặc định khi cài extension
 */

// Cấu hình mặc định - không cần user cấu hình gì cả
const DEFAULT_CONFIG = {
  apiBaseUrl: "https://seeding.markeeai.com/api",
  apiKey: ""  // Backend không bắt buộc API key nếu env API_KEY rỗng
};

// Lắng nghe message từ content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SAVE_SEEDING_KPI") {
    handleSaveSeedingKpi(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_SEEDING_KPIS") {
    handleGetSeedingKpis(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Mở nhiều tabs cùng lúc - gọi từ frontend
  if (message.type === "OPEN_MULTIPLE_TABS") {
    const { urls } = message.data || {};
    if (Array.isArray(urls) && urls.length > 0) {
      // Mở tabs với delay nhỏ để tránh block
      Promise.all(
        urls.map((url, index) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              chrome.tabs.create({ url, active: false }, (tab) => {
                resolve({ url, tabId: tab?.id, success: !!tab });
              });
            }, index * 1000); // 1 giây delay giữa mỗi tab
          });
        })
      ).then(results => {
        sendResponse({ success: true, data: results });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    sendResponse({ success: false, error: "No URLs provided" });
    return true;
  }

  // Đóng nhiều tabs cùng lúc
  if (message.type === "CLOSE_TABS") {
    const { tabIds } = message.data || {};
    if (Array.isArray(tabIds) && tabIds.length > 0) {
      Promise.all(
        tabIds.map((tabId) => {
          return new Promise((resolve) => {
            chrome.tabs.remove(tabId, () => {
              resolve({ tabId, success: true });
            });
          });
        })
      ).then(results => {
        sendResponse({ success: true, data: results });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
    sendResponse({ success: false, error: "No tab IDs provided" });
    return true;
  }

  return false;
});

/**
 * Lấy config từ storage (có fallback mặc định)
 */
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiBaseUrl", "apiKey"], (result) => {
      resolve({
        API_BASE_URL: result.apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
        API_KEY: result.apiKey || DEFAULT_CONFIG.apiKey
      });
    });
  });
}

/**
 * Lưu KPI seeding vào backend
 */
async function handleSaveSeedingKpi(data) {
  const { API_BASE_URL, API_KEY } = await getConfig();

  console.log("[KPI Background] Saving seeding KPI:", data);

  const payload = {
    email_member: data.email_member,
    name: data.name || "",
    name_profile: data.name_profile || "",
    platform: data.platform || "facebook",
    content: data.content || "",
    link_post: data.link_post || "",
    verify: data.verify || "yes",
    link_comment: data.link_comment || "",
    profile_id: data.profile_id || "",
    facebook_name: data.facebook_name || "",
    id_social_account: data.id_social_account || null,
    id_platform: data.id_platform || null,
    id_post: data.id_post || null,
    day: data.day || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0]
  };

  const url = `${API_BASE_URL}/api/all-platform/${data.platform || 'facebook'}/seeding-mark/verify`;
  console.log("[KPI Background] POST to:", url);

  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  console.log("[KPI Background] Response status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error("[KPI Background] API Error:", response.status, error);
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log("[KPI Background] Save result:", result);
  return result;
}

/**
 * Lấy danh sách KPI seeding đã lưu
 */
async function handleGetSeedingKpis(data) {
  const { API_BASE_URL, API_KEY } = await getConfig();

  console.log("[KPI Background] Getting seeding KPIs:", data);

  const url = `${API_BASE_URL}/api/all-platform/${data.platform || 'facebook'}/seeding-kpi/get-all`;
  console.log("[KPI Background] POST to:", url);

  const headers = { "Content-Type": "application/json" };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data || {})
  });

  console.log("[KPI Background] Response status:", response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error("[KPI Background] API Error:", response.status, error);
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log("[KPI Background] Get result:", result);
  return result;
}

// Cài đặt mặc định khi extension được cài - không cần user cấu hình gì cả
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    apiBaseUrl: DEFAULT_CONFIG.apiBaseUrl,
    apiKey: DEFAULT_CONFIG.apiKey
  });
  console.log("[FB Seeding KPI] Extension installed with auto-config:");
  console.log("[FB Seeding KPI]   API URL:", DEFAULT_CONFIG.apiBaseUrl);
  console.log("[FB Seeding KPI]   API Key:", DEFAULT_CONFIG.apiKey || "(none)");
});
