let isCommenting = false;
let currentProgress = null;
let shouldStop = false;

async function getPersistedState() {
    try {
        const result = await chrome.storage.session.get(["isCommenting", "currentProgress"]);
        if (result.isCommenting) {
            isCommenting = result.isCommenting;
            currentProgress = result.currentProgress || null;
        }
    } catch(e) {
        // session storage may not be available in some Chrome versions
    }
}

async function persistState() {
    try {
        await chrome.storage.session.set({ isCommenting, currentProgress });
    } catch(e) {}
}

async function clearPersistedState() {
    try {
        await chrome.storage.session.remove(["isCommenting", "currentProgress"]);
    } catch(e) {}
}

getPersistedState();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "START_BULK_COMMENT") {
        if (isCommenting) {
            sendResponse({ success: false, error: "Đang có một tiến trình comment đang chạy." });
            return;
        }

        if (!request.payload || !request.payload.text) {
            sendResponse({ success: false, error: "Thiếu nội dung comment." });
            return;
        }

        const { links, posts: passedPosts } = request.payload;
        const postsToRun = passedPosts || (links ? links.map(l => ({ url: l })) : []);

        if (postsToRun.length === 0) {
            sendResponse({ success: false, error: "Không có bài viết nào để comment." });
            return;
        }

        isCommenting = true;
        shouldStop = false;
        currentProgress = null;
        persistState();

        sendResponse({ success: true, total: postsToRun.length });

        runBulkComment(request.payload, sender.tab ? sender.tab.id : null, postsToRun);
    } else if (request.action === "STOP_BULK_COMMENT") {
        shouldStop = true;
        sendResponse({ success: true });
    } else if (request.action === "GET_STATUS") {
        sendResponse({ isCommenting, currentProgress });
    }
    return true;
});

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForTabLoad(tabId, timeoutMs = 10000) {
    return new Promise(resolve => {
        let isResolved = false;
        const timeout = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                resolve();
            }
        }, timeoutMs);

        const listener = (id, info) => {
            if (id === tabId && info.status === 'complete') {
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
}

async function runBulkComment(payload, uiTabId, postsToRun) {
    const { text, verifyConfig } = payload;

    for (let i = 0; i < postsToRun.length; i++) {
        if (shouldStop) break;

        const currentPost = postsToRun[i];
        const url = currentPost.url;
        if (!url) continue;

        currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đang mở tab..." };
        persistState();
        if (uiTabId) {
            chrome.tabs.sendMessage(uiTabId, {
                action: "BULK_COMMENT_PROGRESS",
                payload: currentProgress
            }).catch(() => {});
        }

        let tab;
        try {
            tab = await chrome.tabs.create({ url, active: false });
        } catch (e) {
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: `Lỗi mở tab: ${e.message}` };
            persistState();
            continue;
        }

        try {
            await waitForTabLoad(tab.id);
            await delay(3000);

            if (shouldStop) {
                try { await chrome.tabs.remove(tab.id); } catch(e) {}
                break;
            }

            currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đang lấy token và comment..." };
            persistState();
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }

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
            persistState();
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }

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
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(verifyBody)
                    });
                } catch(e) {
                    console.error("Lỗi lưu KPI:", e);
                }
            }

        } catch (e) {
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: `Ngoại lệ: ${e.message}`, result: { success: false, error: e.message } };
            persistState();
            if (uiTabId) {
                chrome.tabs.sendMessage(uiTabId, {
                    action: "BULK_COMMENT_PROGRESS",
                    payload: currentProgress
                }).catch(() => {});
            }
        } finally {
            if (tab) {
                try { await chrome.tabs.remove(tab.id); } catch(e) {}
            }
        }

        if (shouldStop) break;

        if (i < postsToRun.length - 1) {
            currentProgress = { current: i + 1, total: postsToRun.length, url, status: "Đợi 5 giây để tiếp tục..." };
            persistState();
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
    shouldStop = false;
    currentProgress = null;
    clearPersistedState();
    if (uiTabId) {
        chrome.tabs.sendMessage(uiTabId, {
            action: "BULK_COMMENT_DONE",
            payload: { total: postsToRun.length, stopped: shouldStop }
        }).catch(() => {});
    }
}
