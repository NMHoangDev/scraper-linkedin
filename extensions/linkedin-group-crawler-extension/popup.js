const els = {
  groupUrls: document.getElementById("groupUrls"),
  maxPosts: document.getElementById("maxPosts"),
  scrollDelayMinMs: document.getElementById("scrollDelayMinMs"),
  scrollDelayMaxMs: document.getElementById("scrollDelayMaxMs"),
  autoNextGroup: document.getElementById("autoNextGroup"),
  apiBase: document.getElementById("apiBase"),
  apiKey: document.getElementById("apiKey"),
  idMember: document.getElementById("idMember"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  statPosts: document.getElementById("statPosts"),
  statScroll: document.getElementById("statScroll"),
  statGroup: document.getElementById("statGroup"),
  log: document.getElementById("log"),
  saveResults: document.getElementById("saveResults"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
};

const CONFIG_STORAGE_KEY = "li_crawl_popup_config";

function appendLog(level, message) {
  const line = document.createElement("div");
  line.className = level || "info";
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  els.log.appendChild(line);
  while (els.log.childNodes.length > 100) els.log.removeChild(els.log.firstChild);
  els.log.scrollTop = els.log.scrollHeight;
}

function appendSaveResult(text) {
  const line = document.createElement("div");
  line.textContent = text;
  els.saveResults.appendChild(line);
  els.saveResults.scrollTop = els.saveResults.scrollHeight;
}

function setRunning(isRunning) {
  els.startBtn.disabled = isRunning;
  els.stopBtn.disabled = !isRunning;
}

async function loadConfig() {
  const stored = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
  const cfg = stored[CONFIG_STORAGE_KEY];
  if (!cfg) return;
  els.groupUrls.value = (cfg.groupUrls || []).join("\n");
  els.maxPosts.value = cfg.maxPosts || 40;
  els.scrollDelayMinMs.value = cfg.scrollDelayMinMs || 2500;
  els.scrollDelayMaxMs.value = cfg.scrollDelayMaxMs || 5000;
  els.autoNextGroup.checked = cfg.autoNextGroup !== false;
  els.apiBase.value = cfg.apiBase || "http://localhost:8000";
  els.apiKey.value = cfg.apiKey || "markee-extension-key-2024";
  els.idMember.value = cfg.idMember || "";
}

function currentConfig() {
  return {
    groupUrls: els.groupUrls.value.split("\n").map((s) => s.trim()).filter(Boolean),
    maxPosts: parseInt(els.maxPosts.value, 10) || 40,
    scrollDelayMinMs: parseInt(els.scrollDelayMinMs.value, 10) || 2500,
    scrollDelayMaxMs: parseInt(els.scrollDelayMaxMs.value, 10) || 5000,
    autoNextGroup: els.autoNextGroup.checked,
    apiBase: els.apiBase.value.trim() || "http://localhost:8000",
    apiKey: els.apiKey.value.trim(),
    idMember: els.idMember.value.trim() || null,
  };
}

function renderStateSnapshot(state) {
  if (!state) return;
  setRunning(!!state.running);
  els.statPosts.textContent = `${state.totalPosts || 0} bài`;
  els.statGroup.textContent = `Group ${(state.currentIndex ?? -1) + 1}/${(state.groupQueue || []).length}`;
  if (state.groupQueue && state.groupQueue.length) {
    els.saveResults.innerHTML = "";
    for (const g of state.groupQueue) {
      if (g.status === "done" || g.status === "error") {
        appendSaveResult(`${g.url} — ${g.status === "error" ? "Lỗi: " + g.error : `${g.savedCount || 0} bài đã lưu`}`);
      }
    }
  }
}

async function requestState() {
  const state = await chrome.runtime.sendMessage({ type: "LI_CRAWL_GET_STATE" });
  renderStateSnapshot(state);
}

function collectAllPosts(state) {
  const posts = [];
  for (const g of state.groupQueue || []) {
    for (const p of g.posts || []) posts.push(p);
  }
  return posts;
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(posts) {
  const headers = ["post_url", "author", "content", "posted_at_raw", "likes", "comments", "reposts", "group_url", "group_name", "crawled_at"];
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const p of posts) lines.push(headers.map((h) => escape(p[h])).join(","));
  return lines.join("\n");
}

els.startBtn.addEventListener("click", async () => {
  const cfg = currentConfig();
  if (!cfg.groupUrls.length) {
    appendLog("error", "Chưa nhập URL group nào.");
    return;
  }
  await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: cfg });
  els.log.innerHTML = "";
  els.saveResults.innerHTML = "";
  setRunning(true);
  appendLog("info", `Bắt đầu cào ${cfg.groupUrls.length} group...`);
  const res = await chrome.runtime.sendMessage({
    type: "LI_CRAWL_START",
    groupUrls: cfg.groupUrls,
    config: { maxPosts: cfg.maxPosts, scrollDelayMinMs: cfg.scrollDelayMinMs, scrollDelayMaxMs: cfg.scrollDelayMaxMs, autoNextGroup: cfg.autoNextGroup },
    apiBase: cfg.apiBase,
    apiKey: cfg.apiKey,
    idMember: cfg.idMember,
  });
  if (!res || !res.started) {
    appendLog("error", "Không khởi động được — kiểm tra lại URL group.");
    setRunning(false);
  }
});

els.stopBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "LI_CRAWL_STOP" });
  appendLog("warn", "Đã gửi lệnh dừng...");
});

els.exportJsonBtn.addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "LI_CRAWL_GET_STATE" });
  const posts = collectAllPosts(state);
  downloadBlob(`linkedin-posts-${Date.now()}.json`, JSON.stringify(posts, null, 2), "application/json");
});

els.exportCsvBtn.addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "LI_CRAWL_GET_STATE" });
  const posts = collectAllPosts(state);
  downloadBlob(`linkedin-posts-${Date.now()}.csv`, toCsv(posts), "text/csv");
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case "LI_CRAWL_LOG":
      appendLog(msg.level, msg.message);
      break;
    case "LI_CRAWL_PROGRESS":
      els.statPosts.textContent = `${msg.postsCount} bài`;
      els.statScroll.textContent = `${msg.scrollCount} lần cuộn`;
      break;
    case "LI_CRAWL_QUEUE_STATUS":
      els.statGroup.textContent = `Group ${msg.groupIndex + 1}/${msg.totalGroups}`;
      appendLog("info", `Đang cào: ${msg.groupUrl}`);
      break;
    case "LI_CRAWL_ERROR":
      appendLog("error", `${msg.groupUrl || ""}: ${msg.message}`);
      break;
    case "LI_CRAWL_SAVE_RESULT":
      appendSaveResult(
        msg.success
          ? `${msg.groupUrl} — ${msg.savedCount} bài mới, ${msg.skippedDuplicates} bài trùng`
          : `${msg.groupUrl} — Lỗi lưu: ${msg.message}`
      );
      break;
    case "LI_CRAWL_ALL_DONE":
      appendLog("success", `Hoàn tất${msg.stopped ? " (đã dừng)" : ""}: ${msg.totalPosts} bài cào được, ${msg.totalSaved} bài đã lưu.`);
      setRunning(false);
      break;
  }
});

loadConfig().then(requestState);
