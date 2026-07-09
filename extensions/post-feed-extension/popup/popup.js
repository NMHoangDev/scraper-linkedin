// ============================================================
// popup.js — Giao diện popup, điều phối crawl qua background.js
// ============================================================

// ── Elements ────────────────────────────────────────────────
const statusBadge   = document.getElementById('statusBadge');
const groupNameEl   = document.getElementById('groupName');
const groupUrlEl    = document.getElementById('groupUrl');
const groupsListEl  = document.getElementById('groupsList');
const queueCountEl  = document.getElementById('queueCount');
const logContainer  = document.getElementById('logContainer');

const btnStart      = document.getElementById('btnStart');
const btnStop       = document.getElementById('btnStop');
const btnExport     = document.getElementById('btnExport');
const btnExportCSV  = document.getElementById('btnExportCSV');
const btnSendAPI    = document.getElementById('btnSendAPI');
const addGroupBtn   = document.getElementById('addGroupBtn');
const newGroupInput = document.getElementById('newGroupUrl');

const statPosts     = document.getElementById('statPosts');
const statScrolls   = document.getElementById('statScrolls');
const statTime      = document.getElementById('statTime');
const statGroupIdx  = document.getElementById('statGroupIdx');
const progressFill  = document.getElementById('progressFill');
const progressText  = document.getElementById('progressText');

const maxPostsInput     = document.getElementById('maxPosts');
const scrollDelayInput  = document.getElementById('scrollDelay');
const autoNextGroupChk  = document.getElementById('autoNextGroup');

// ── State ───────────────────────────────────────────────────
let groups = [];       // [{name, url, status: 'pending'|'active'|'done'}]
let crawlResults = []; // [{post}, ...]
let isRunning = false;
let startTime = null;
let timerInterval = null;
let currentTabId = null;

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved groups from storage
  const data = await chrome.storage.local.get(['groups', 'crawlResults']);
  if (data.groups) {
    groups = data.groups;
    renderGroupsList();
  }
  if (data.crawlResults) {
    crawlResults = data.crawlResults;
    updateExportButtons();
  }

  // Get current tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      currentTabId = tab.id;
      updateGroupInfo(tab);
    }
  } catch (e) {
    log('warn', 'Không lấy được thông tin tab hiện tại');
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener(handleMessage);
});

// ── Group info from current tab ─────────────────────────────
function updateGroupInfo(tab) {
  const url = tab.url || '';
  const isGroup = /facebook\.com\/groups\//.test(url);
  if (isGroup) {
    const name = tab.title?.replace(' | Facebook', '').trim() || 'Group';
    groupNameEl.textContent = name;
    groupUrlEl.textContent = url;
    // Offer to add current group
    const already = groups.some(g => g.url === url);
    if (!already) {
      groups.push({ name, url, status: 'pending' });
      saveGroups();
      renderGroupsList();
    }
  } else {
    groupNameEl.textContent = 'Không phải Facebook Group';
    groupUrlEl.textContent = '—';
  }
}

// ── Groups List ─────────────────────────────────────────────
function renderGroupsList() {
  queueCountEl.textContent = groups.length;
  if (groups.length === 0) {
    groupsListEl.innerHTML = '<div class="empty-state">Chưa có group nào trong hàng đợi</div>';
    return;
  }
  groupsListEl.innerHTML = groups.map((g, i) => `
    <div class="group-item ${g.status}" data-idx="${i}">
      <span class="group-item-name">${g.status === 'active' ? '▶ ' : ''}${g.name}</span>
      <span class="group-item-status">${g.status === 'done' ? '✓' : g.status === 'active' ? 'đang cào...' : 'chờ'}</span>
      <button class="group-item-remove" data-remove="${i}" title="Xóa">×</button>
    </div>
  `).join('');

  // Remove buttons
  groupsListEl.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.remove);
      groups.splice(idx, 1);
      saveGroups();
      renderGroupsList();
    });
  });
}

function saveGroups() {
  chrome.storage.local.set({ groups });
}

// ── Add group manually ──────────────────────────────────────
addGroupBtn.addEventListener('click', addGroupFromInput);
newGroupInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addGroupFromInput();
});

function addGroupFromInput() {
  let url = newGroupInput.value.trim();
  if (!url) return;
  if (!url.startsWith('http')) url = 'https://www.facebook.com/' + url;
  if (!/facebook\.com/.test(url)) {
    log('warn', 'URL không hợp lệ');
    return;
  }
  if (groups.some(g => g.url === url)) {
    log('warn', 'Group đã tồn tại trong hàng đợi');
    return;
  }
  const name = extractGroupName(url);
  groups.push({ name, url, status: 'pending' });
  newGroupInput.value = '';
  saveGroups();
  renderGroupsList();
  log('success', `Đã thêm: ${name}`);
}

function extractGroupName(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'groups') {
      return 'Group ' + parts[1];
    }
  } catch {}
  return url;
}

// ── Config ──────────────────────────────────────────────────
function getConfig() {
  return {
    maxPosts: parseInt(maxPostsInput.value) || 100,
    scrollDelay: parseInt(scrollDelayInput.value) || 2000,
    autoNextGroup: autoNextGroupChk.checked,
  };
}

// ── Start / Stop ────────────────────────────────────────────
btnStart.addEventListener('click', startCrawl);
btnStop.addEventListener('click', stopCrawl);

async function startCrawl() {
  if (groups.length === 0) {
    log('warn', 'Chưa có group nào để cào!');
    return;
  }

  // Reset status
  groups.forEach(g => g.status = 'pending');
  crawlResults = [];
  isRunning = true;
  startTime = Date.now();

  updateUI('running');
  saveGroups();
  renderGroupsList();

  // Start timer
  timerInterval = setInterval(updateTimer, 1000);
  updateTimer();

  // Reset stats
  statPosts.textContent = '0';
  statScrolls.textContent = '0';
  progressFill.style.width = '0%';
  progressText.textContent = 'Đang khởi động...';

  log('success', `Bắt đầu cào ${groups.length} group(s)`);

  // Send start command to background
  chrome.runtime.sendMessage({
    action: 'START_CRAWL',
    config: getConfig(),
    groups: groups,
  }).catch(e => log('error', 'Lỗi gửi lệnh: ' + e.message));
}

async function stopCrawl() {
  isRunning = false;
  clearInterval(timerInterval);
  updateUI('idle');
  log('warn', 'Đã dừng cào bởi người dùng');
  chrome.runtime.sendMessage({ action: 'STOP_CRAWL' }).catch(() => {});
}

// ── Message from background/content ────────────────────────
function handleMessage(msg) {
  switch (msg.type) {
    case 'CRAWL_STATUS':
      setStatus(msg.status, msg.message);
      if (msg.progress !== undefined) {
        progressFill.style.width = msg.progress + '%';
      }
      if (msg.progressText) {
        progressText.textContent = msg.progressText;
      }
      break;

    case 'CRAWL_POST':
      crawlResults.push(msg.post);
      statPosts.textContent = crawlResults.length;
      saveResults();
      updateExportButtons();
      break;

    case 'CRAWL_SCROLL':
      statScrolls.textContent = parseInt(statScrolls.textContent) + 1;
      break;

    case 'CRAWL_LOG':
      log(msg.level || 'info', msg.message);
      break;

    case 'CRAWL_PROGRESS':
      if (msg.groupIndex !== undefined) {
        const total = groups.length;
        statGroupIdx.textContent = `${msg.groupIndex + 1}/${total}`;
      }
      progressFill.style.width = (msg.progress || 0) + '%';
      progressText.textContent = msg.progressText || '';
      break;

    case 'CRAWL_DONE':
      isRunning = false;
      clearInterval(timerInterval);
      updateUI('done');
      log('success', `✅ Hoàn tất! Đã cào ${crawlResults.length} bài viết`);
      saveResults();
      updateExportButtons();
      break;

    case 'CRAWL_ERROR':
      log('error', 'Lỗi: ' + msg.message);
      break;
  }
}

function setStatus(status, message) {
  statusBadge.textContent = message || status;
  statusBadge.className = 'status-badge ' + status;
}

function updateUI(status) {
  btnStart.disabled = status !== 'idle' && status !== 'done';
  btnStop.disabled = status !== 'running';
  setStatus(status,
    status === 'running' ? 'Đang cào...' :
    status === 'done' ? 'Hoàn tất' :
    status === 'error' ? 'Lỗi' : 'Sẵn sàng'
  );
}

function updateTimer() {
  if (!startTime) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const s = elapsed % 60;
  const m = Math.floor(elapsed / 60);
  statTime.textContent = m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Log ─────────────────────────────────────────────────────
function log(level, message) {
  const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = `log-entry log-${level}`;
  entry.textContent = `[${time}] ${message}`;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;

  // Keep max 100 entries
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.firstChild);
  }
}

// ── Save / Export ───────────────────────────────────────────
function saveResults() {
  chrome.storage.local.set({ crawlResults });
}

function updateExportButtons() {
  const hasData = crawlResults.length > 0;
  btnExport.disabled = !hasData;
  btnExportCSV.disabled = !hasData;
  btnSendAPI.disabled = !hasData;
}

btnExport.addEventListener('click', () => exportJSON());
btnExportCSV.addEventListener('click', () => exportCSV());
btnSendAPI.addEventListener('click', () => sendToAPI());

function exportJSON() {
  const blob = new Blob([JSON.stringify(crawlResults, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `fb_posts_${Date.now()}.json`);
}

function exportCSV() {
  if (crawlResults.length === 0) return;
  const headers = ['post_url', 'author_name', 'author_url', 'timestamp_raw', 'timestamp_class', 'content', 'reactions', 'comments', 'shares', 'images', 'video_url', 'group_url', 'crawled_at'];
  const rows = crawlResults.map(p => [
    p.post_url || '',
    (p.author_name || '').replace(/"/g, '""'),
    p.author_url || '',
    p.timestamp_raw || '',
    p.timestamp_class || '',
    (p.content || '').replace(/"/g, '""').replace(/\n/g, ' '),
    p.reactions || 0,
    p.comments || 0,
    p.shares || 0,
    (p.images || []).join(' | '),
    p.video_url || '',
    p.group_url || '',
    p.crawled_at || '',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${v}"`).join(','))
    .join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `fb_posts_${Date.now()}.csv`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function sendToAPI() {
  if (crawlResults.length === 0) return;
  btnSendAPI.disabled = true;
  btnSendAPI.textContent = '⏳ Đang gửi...';
  log('info', 'Đang gửi dữ liệu lên API...');

  try {
    const apiUrl = prompt('Nhập URL API endpoint:', 'http://localhost:8000/api/crawl-result');
    if (!apiUrl) {
      btnSendAPI.disabled = false;
      btnSendAPI.textContent = '📡 Gửi API';
      return;
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts: crawlResults }),
    });

    if (res.ok) {
      log('success', '✅ Gửi API thành công!');
    } else {
      log('error', `Lỗi API: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    log('error', 'Lỗi kết nối: ' + e.message);
  }

  btnSendAPI.disabled = false;
  btnSendAPI.textContent = '📡 Gửi API';
}
