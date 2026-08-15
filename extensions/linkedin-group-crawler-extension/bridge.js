// Content script chạy trên trang DASHBOARD (không phải linkedin.com).
// Dịch giữa quy ước "action"-keyed window.postMessage của dashboard (giống bridge.js
// bên comment-extension) và quy ước "type"-keyed chrome.runtime.sendMessage nội bộ
// của extension này (background.js/content.js dùng field `type`).

function safeSendMessage(message, callback) {
  try {
    if (!chrome.runtime?.id) {
      window.postMessage({ action: "LI_EXTENSION_INVALIDATED" }, "*");
      return;
    }
    chrome.runtime.sendMessage(message, callback);
  } catch (e) {
    window.postMessage({ action: "LI_EXTENSION_INVALIDATED" }, "*");
  }
}

window.addEventListener("message", function (event) {
  if (event.source !== window || !event.data) return;
  const { action, payload } = event.data;
  if (!action) return;

  if (action === "PING_LI_EXTENSION") {
    window.postMessage({ action: "LI_EXTENSION_READY" }, "*");
  } else if (action === "LI_FETCH_POST_INFO") {
    safeSendMessage({ type: "LI_FETCH_POST_INFO", url: payload && payload.url }, (resp) => {
      window.postMessage(
        { action: "LI_FETCH_POST_INFO_RESULT", payload: resp || { success: false, error: "Không nhận được phản hồi từ extension." } },
        "*"
      );
    });
  } else if (action === "LI_START_COMMENT") {
    safeSendMessage(
      {
        type: "LI_START_COMMENT",
        url: payload && payload.url,
        text: payload && payload.text,
        verifyConfig: payload && payload.verifyConfig,
      },
      () => {
        window.postMessage({ action: "LI_COMMENT_STARTED" }, "*");
      }
    );
  }
});

// Relay progress/done broadcast từ background xuống trang dashboard.
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "LI_COMMENT_PROGRESS") {
    window.postMessage({ action: "LI_COMMENT_PROGRESS", payload: request }, "*");
  } else if (request.type === "LI_COMMENT_DONE") {
    window.postMessage({ action: "LI_COMMENT_DONE", payload: request }, "*");
  }
  return true;
});

window.postMessage({ action: "LI_EXTENSION_READY" }, "*");
