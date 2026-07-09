let isCommenting = false;
let currentProgress = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_BULK_COMMENT") {
        if (isCommenting) {
            sendResponse({ success: false, error: "Đang có một tiến trình comment đang chạy." });
            return;
        }
        
        isCommenting = true;
        currentProgress = null;
        sendResponse({ success: true });
        
        runBulkComment(request.payload, sender.tab ? sender.tab.id : null);
    } else if (request.action === "GET_STATUS") {
        sendResponse({ isCommenting, currentProgress });
    }
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBulkComment(payload, uiTabId) {
    const { links, posts: passedPosts, text, verifyConfig } = payload;
    const postsToRun = passedPosts || (links ? links.map(l => ({ url: l })) : []);
    
    for (let i = 0; i < postsToRun.length; i++) {
        const currentPost = postsToRun[i];
        const url = currentPost.url;
        
        // Report progress
        currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đang mở tab..." };
        if (uiTabId) {
            chrome.tabs.sendMessage(uiTabId, {
                action: "BULK_COMMENT_PROGRESS",
                payload: currentProgress
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
            
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đang lấy token và comment..." };
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
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
            
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: result.success ? "Thành công" : `Lỗi: ${result.error}`, result };
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }

            // Gọi API tính KPI ngầm từ Background
            if (result && verifyConfig && verifyConfig.email_member) {
                try {
                    const apiBase = verifyConfig.apiBase || "https://seeding.markeeai.com";
                    const verifyBody = {
                        email_member: verifyConfig.email_member,
                        link_post: url,
                        platform: "facebook",
                        content: text,
                        link_comment: result.url || `Bị từ chối / Không lấy được link - ${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        profile_id: result.uid || "Unknown",
                        id_post: currentPost.id_post,
                        id_social_account: verifyConfig.id_social_account || undefined,
                        id_platform: 1
                    };

                    await fetch(`${apiBase}/api/all-platform/facebook/seeding-mark/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(verifyBody)
                    });
                } catch(e) {
                    console.error("Lỗi lưu KPI:", e);
                }
            }

        } catch (e) {
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: `Ngoại lệ: ${e.message}`, result: { success: false, error: e.message } };
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }
        } finally {
            // Close tab
            try {
                await chrome.tabs.remove(tab.id);
            } catch(e) {}
        }
        
        // Delay between posts to avoid ban
        if (i < postsToRun.length - 1) {
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đợi 5 giây để tiếp tục..." };
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }
            await delay(5000);
        }
    }
    
    isCommenting = false;
    currentProgress = null;
    if (uiTabId) {
        chrome.tabs.sendMessage(uiTabId, {
            action: "BULK_COMMENT_DONE",
            payload: { total: postsToRun.length }
        }).catch(() => {});
    }
}
