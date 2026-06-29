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
        const response = await fetch("http://127.0.0.1:8000/api/all-platform/groups?platform=facebook");
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
            groups: groups
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
