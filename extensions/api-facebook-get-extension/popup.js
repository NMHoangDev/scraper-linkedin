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
        // Route cu "/api/all-platform/groups?platform=facebook" khong con ton tai (404) -
        // backend da doi sang "/api/all-platform/facebook/groups". Them credentials: 'include'
        // de gui kem cookie session dang nhap (backend yeu cau auth).
        const response = await fetch("https://seeding.markeeai.com/api/all-platform/facebook/groups?for_extension=true", {
            credentials: 'include',
        });
        if (!response.ok) throw new Error("Backend không phản hồi danh sách group.");

        const data = await response.json();
        if (data.success === false) throw new Error(data.message || "Backend tra ve loi.");
        // Chuan hoa ten field: facebook_groups tra "group_name"/"group_url",
        // background.js dang doc "name"/"url".
        const groups = (data.data || []).map((g) => ({
            ...g,
            name: g.name || g.group_name,
            url: g.url || g.group_url,
        }));
        
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
