// background.js - Điều phối auto crawl API

let isRunning = false;
let shouldStop = false;
let currentTabId = null;

// Nhận lệnh từ Popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'START_AUTO_CRAWL') {
        startAutoCrawl(msg.groups, msg.config || {});
        sendResponse({ success: true });
    } else if (msg.action === 'STOP_AUTO_CRAWL') {
        shouldStop = true;
        isRunning = false;
        sendLog('Cảnh báo: Yêu cầu dừng cào...');
        sendResponse({ success: true });
    }
});

async function sendLog(message, isRaw = false, level = 'info') {
    // Gửi log cho Popup của Extension
    chrome.runtime.sendMessage({ action: 'LOG', message, isRaw }).catch(() => {});
    
    // Gửi log cho React Frontend thông qua bridge.js
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_LOG', 
                message, 
                level 
            }).catch(() => {});
        });
    });
}

function sendFrontendProgress(groupIndex, totalGroups) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_PROGRESS', 
                groupIndex, 
                totalGroups 
            }).catch(() => {});
        });
    });
}

function sendFrontendDone(totalGroups, totalPosts) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                action: 'FRONTEND_DONE', 
                totalGroups, 
                totalPosts 
            }).catch(() => {});
        });
    });
}

let API_BASE = 'https://dev.seeding.markeeai.com'; // global fallback for save-posts (dev)

async function startAutoCrawl(groups, config = {}) {
    if (isRunning) return;
    isRunning = true;
    shouldStop = false;
    
    const idMember = config.idMember || null;
    // Use the API URL detected by popup, or fall back to storage (bridge.js).
    API_BASE = config.apiBase || (await chrome.storage.local.get('api_base_url')).api_base_url || API_BASE;
    sendLog(`🚀 Bắt đầu quá trình tự động cào ${groups.length} nhóm...`);

    try {
        const tab = await chrome.tabs.create({ url: 'https://www.facebook.com/', active: true });
        currentTabId = tab.id;

        let totalPostsCrawled = 0;

        for (let i = 0; i < groups.length; i++) {
            if (shouldStop) break;
            
            sendFrontendProgress(i, groups.length);
            
            const group = groups[i];
            sendLog(`\n▶ [${i+1}/${groups.length}] Đang xử lý: ${group.name || group.url}`, false, 'info');
            
            // Bước 1: Navigate tới Group
            await chrome.tabs.update(currentTabId, { url: group.url });
            await sleep(5000); // Chờ load trang ban đầu
            
            if (shouldStop) break;

            // Bước 2: Reload 2 lần (theo yêu cầu của USER để làm sạch session/state)
            sendLog(`Vệ sinh session: Reload lần 1...`);
            await chrome.tabs.reload(currentTabId);
            await sleep(5000);
            
            sendLog(`Vệ sinh session: Reload lần 2...`);
            await chrome.tabs.reload(currentTabId);
            await sleep(6000); // Chờ load lại xong hoàn toàn

            if (shouldStop) break;

            // Bước 3: Tiêm Content Script để gọi API GraphQL
            sendLog(`Đang tiêm lệnh gọi GraphQL API vào trang...`);
            let results = await chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                files: ['content.js']
            }).catch(async (e) => {
                sendLog(`❌ Lỗi tiêm script: ${e.message}. Tiến hành tải lại tab và thử lại...`);
                await chrome.tabs.reload(currentTabId);
                await sleep(5000);
                return chrome.scripting.executeScript({
                    target: { tabId: currentTabId },
                    files: ['content.js']
                }).catch(err => {
                    sendLog(`❌ Lỗi tiêm script (lần 2): ${err.message}. Extension sẽ tự động khởi động lại!`);
                    chrome.runtime.reload();
                    return null;
                });
            });

            if (!results || !results[0]) {
                sendLog(`❌ Không thể thực thi script tại group này.`);
                continue;
            }

            // Gửi thông báo bắt đầu cho content.js
            await sleep(1000);
            
            try {
                sendLog(`Đang ra lệnh lấy 100 bài viết qua API...`);
                const response = await chrome.tabs.sendMessage(currentTabId, {
                    action: "FETCH_API_POSTS",
                    count: 100
                });

                if (response && response.success && response.data) {
                    const postCount = response.data.length;
                    totalPostsCrawled += postCount;
                    sendLog(`✅ API trả về ${postCount} bài. Dữ liệu trích xuất được:`, false, 'success');
                    
                    response.data.forEach((p, idx) => {
                        const snippet = (p.content || '').substring(0, 50).replace(/\n/g, ' ') + (p.content?.length > 50 ? '...' : '');
                        sendLog(`   ${idx + 1}. [${p.author_name || 'Khách'}] ${snippet} (❤️ ${p.reactions || 0}, 💬 ${p.comments || 0})`, false, 'info');
                    });
                    
                    sendLog(`Đang gửi ${postCount} bài lên Backend để lọc lấy 3 bài tốt nhất...`, false, 'info');
                    
                    // Bước 4: Gửi đống này lên backend
                    let pushRes = null;

                    let backendRetry = 0;
                    while (backendRetry <= 2) {
                        try {
                            pushRes = await fetch(`${API_BASE}/api/all-platform/extension/save-posts`, {
                                method: "POST",
                                headers: { 
                                    "Content-Type": "application/json",
                                    "x-api-key": "markee-extension-key-2024"
                                },
                                body: JSON.stringify({
                                    posts: response.data,
                                    group_id: '',
                                    group_url: group.url,
                                    id_member: idMember,
                                    extension_version: "API-Automated-1.0",
                                    // Pass keyword filter params (from app UI) to backend
                                    keywords: group.keywords || null,
                                    post_limit: group.post_limit ?? null
                                })

                            });
                            break;
                        } catch(err) {
                            if (backendRetry >= 2) throw err;
                            backendRetry++;
                            sendLog(`⚠️ Backend mất kết nối, thử lại lần ${backendRetry}/2...`, false, 'warn');
                            await sleep(2000);
                        }
                    }

                    if (pushRes && pushRes.ok) {
                        const pushData = await pushRes.json();
                        sendLog(`🎉 Backend phản hồi: Đã lưu ${pushData.count || 0} bài!`, false, 'success');
                    } else {
                        sendLog(`❌ Lỗi Backend: ${pushRes ? pushRes.status : 'Disconnected'}`, false, 'error');
                    }
                } else {
                    sendLog(`⚠️ Không nhận được dữ liệu bài viết.`, false, 'warn');
                }
            } catch (err) {
                sendLog(`❌ Lỗi giao tiếp content script: ${err.message}`, false, 'error');
            }

            // Nghỉ chút trước khi qua group khác
            await sleep(3000);
        }

        sendLog(`\n🏁 HOÀN TẤT TOÀN BỘ TIẾN TRÌNH CÀO!`, false, 'success');
        sendFrontendDone(groups.length, totalPostsCrawled);

    } catch (e) {
        sendLog(`❌ Lỗi nghiêm trọng: ${e.message}`, false, 'error');
    } finally {
        isRunning = false;
        if (currentTabId) {
            chrome.tabs.remove(currentTabId).catch(() => {});
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
