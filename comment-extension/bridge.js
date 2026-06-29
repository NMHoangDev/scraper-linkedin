// This file is injected into localhost (UI)
window.addEventListener("message", function(event) {
    if (event.source !== window || !event.data) return;

    if (event.data.action === "START_BULK_COMMENT") {
        console.log("Bridge received START_BULK_COMMENT", event.data);
        
        // Gửi tới background script của extension
        chrome.runtime.sendMessage({
            action: "START_BULK_COMMENT",
            payload: event.data.payload
        }, response => {
            if (response && response.success) {
                // Phản hồi lại UI là đã bắt đầu
                window.postMessage({ action: "BULK_COMMENT_STARTED", success: true }, "*");
            }
        });
    } else if (event.data.action === "PING_COMMENT_EXTENSION") {
        window.postMessage({ action: "COMMENT_EXTENSION_READY" }, "*");
    }
});

// Lắng nghe tiến trình từ background và gửi xuống UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "BULK_COMMENT_PROGRESS") {
        window.postMessage({ action: "BULK_COMMENT_PROGRESS", payload: request.payload }, "*");
    } else if (request.action === "BULK_COMMENT_DONE") {
        window.postMessage({ action: "BULK_COMMENT_DONE", payload: request.payload }, "*");
    }
    return true;
});

// Gửi tín hiệu rằng Extension đã sẵn sàng
window.postMessage({ action: "COMMENT_EXTENSION_READY" }, "*");
