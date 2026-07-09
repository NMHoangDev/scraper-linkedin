const btnAutoStart = document.getElementById('btnAutoStart');
const btnAutoStop = document.getElementById('btnAutoStop');
const statusDiv = document.getElementById('status');
const logPanel = document.getElementById('logPanel');

function addLog(msg) {
    const time = new Date().toLocaleTimeString('vi-VN');
    logPanel.textContent += `[${time}] ${msg}\n`;
    logPanel.scrollTop = logPanel.scrollHeight;
}

// Lắng nghe log từ background.js và content.js
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'LOG') {
        addLog(msg.message);
    }
});

btnAutoStart.addEventListener('click', async () => {
    btnAutoStart.disabled = true;
    btnAutoStop.disabled = false;
    statusDiv.textContent = "Đang lấy danh sách Group từ Backend...";
    logPanel.textContent = '';
    addLog("Đang gọi API lấy danh sách Group...");

    try {
        // Detect API URL from the currently active tab (most reliable — no need to
        // pre-configure anything). Checks the tab the user was on when they clicked
        // the extension icon.
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url || '';
        const knownHosts = ['seeding.markeeai.com', 'zenithglobal.dev', 'localhost', '127.0.0.1'];
        let API_BASE = null;
        if (knownHosts.find(h => currentUrl.includes(h))) {
            try { API_BASE = new URL(currentUrl).origin; } catch (_) {}
        }

        // Fall back to storage (set by bridge.js from a previous visit).
        if (!API_BASE) {
            const { api_base_url } = await chrome.storage.local.get('api_base_url');
            API_BASE = api_base_url || 'https://dev.seeding.markeeai.com';
        }

        addLog(`🌐 Backend: ${API_BASE}`);

        const response = await fetch(`${API_BASE}/api/all-platform/facebook/groups?for_extension=true`, {
            credentials: 'include',
        });
        if (!response.ok) throw new Error("Backend không phản hồi danh sách group.");
        
        const data = await response.json();
        const groups = data.data || [];
        
        if (groups.length === 0) {
            addLog("❌ Không có group nào cần cào từ Backend.");
            statusDiv.textContent = "Sẵn sàng chờ lệnh...";
            btnAutoStart.disabled = false;
            btnAutoStop.disabled = true;
            return;
        }

        addLog(`✅ Đã lấy được ${groups.length} nhóm. Gửi lệnh cho Background để bắt đầu auto-crawl...`);
        statusDiv.textContent = `Đang tự động cào ${groups.length} nhóm...`;

        chrome.runtime.sendMessage({
            action: 'START_AUTO_CRAWL',
            groups: groups,
            config: { apiBase: API_BASE }
        });

    } catch (err) {
        addLog(`❌ Lỗi: ${err.message}`);
        statusDiv.textContent = "Lỗi. Vui lòng kiểm tra lại backend.";
        btnAutoStart.disabled = false;
        btnAutoStop.disabled = true;
    }
});

btnAutoStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'STOP_AUTO_CRAWL' });
    btnAutoStart.disabled = false;
    btnAutoStop.disabled = true;
    statusDiv.textContent = "Đã dừng.";
    addLog("Đã yêu cầu dừng toàn bộ tiến trình.");
});
