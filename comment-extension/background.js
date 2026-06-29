let isCommenting = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_BULK_COMMENT") {
        if (isCommenting) {
            sendResponse({ success: false, error: "Đang có một tiến trình comment đang chạy." });
            return;
        }
        
        isCommenting = true;
        sendResponse({ success: true });
        
        runBulkComment(request.payload, sender.tab ? sender.tab.id : null);
    }
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBulkComment(payload, uiTabId) {
    const { links, text } = payload;
    
    for (let i = 0; i < links.length; i++) {
        const url = links[i];
        
        // Report progress
        if (uiTabId) {
            chrome.tabs.sendMessage(uiTabId, {
                action: "BULK_COMMENT_PROGRESS",
                payload: { current: i + 1, total: links.length, url, status: "Đang mở tab..." }
            }).catch(() => {});
        }
        
        // Open tab
        const tab = await chrome.tabs.create({ url: url, active: false });
        
        try {
            // Wait for tab to load
            await new Promise(resolve => {
                let isResolved = false;
                const timeout = setTimeout(() => {
                    if (!isResolved) {
                        isResolved = true;
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                }, 10000); // 10s timeout
                
                const listener = (tabId, info) => {
                    if (tabId === tab.id && info.status === 'complete') {
                        if (!isResolved) {
                            isResolved = true;
                            clearTimeout(timeout);
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
            });
            
            // Wait a bit more for React to render (Facebook is heavy SPA)
            await delay(3000);
            
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: { current: i + 1, total: links.length, url, status: "Đang lấy token và comment..." }
                }).catch(() => {});
            }

            // Execute comment
            const result = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, {
                    action: "EXECUTE_COMMENT",
                    payload: { url, text }
                }, response => {
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                    } else if (!response) {
                        resolve({ success: false, error: "No response from content script." });
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: { current: i + 1, total: links.length, url, status: result.success ? "Thành công" : `Lỗi: ${result.error}`, result }
                }).catch(() => {});
            }

        } catch (e) {
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: { current: i + 1, total: links.length, url, status: `Ngoại lệ: ${e.message}`, result: { success: false, error: e.message } }
                }).catch(() => {});
            }
        } finally {
            // Close tab
            try {
                await chrome.tabs.remove(tab.id);
            } catch(e) {}
        }
        
        // Delay between posts to avoid ban
        if (i < links.length - 1) {
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: { current: i + 1, total: links.length, url, status: "Đợi 5 giây để tiếp tục..." }
                }).catch(() => {});
            }
            await delay(5000);
        }
    }
    
    isCommenting = false;
    if (uiTabId) {
        chrome.tabs.sendMessage(uiTabId, {
            action: "BULK_COMMENT_DONE",
            payload: { total: links.length }
        }).catch(() => {});
    }
}
