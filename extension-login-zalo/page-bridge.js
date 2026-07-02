(() => {
  if (window.__markeeZaloBridgeLoaded) return;
  window.__markeeZaloBridgeLoaded = true;
  window.__zaloExtensionAvailable = true;

  const postResponse = (requestId, success, data, error) => {
    window.postMessage(
      {
        __zaloExt: true,
        type: "RESPONSE",
        requestId,
        success,
        data,
        error,
      },
      "*",
    );
  };

  const postPong = (requestId) => {
    window.postMessage(
      {
        __zaloExt: true,
        type: "PONG",
        requestId,
        installed: true,
        success: true,
        data: { installed: true },
      },
      "*",
    );
  };

  window.addEventListener("message", (event) => {
    // Chỉ nhận message từ chính cửa sổ này (không phải từ iframe khác)
    if (event.source !== window) return;
    // B21: Kiểm tra origin khớp với trang hiện tại — bảo vệ thêm khi
    // page-bridge chạy trong môi trường có cross-origin frames.
    if (event.origin !== window.location.origin) return;
    const payload = event.data;
    if (!payload || payload.__zaloExt !== true || !payload.type) return;

    const requestId = payload.requestId || `zalo-${Date.now()}`;
    if (payload.type === "PING") {
      postPong(requestId);
      return;
    }

    // Guard: nếu background service worker bị unload (MV3 5-minute idle rule),
    // chrome.runtime.sendMessage callback có thể không bao giờ được gọi.
    // Dùng timeout 10s để tránh page bị stuck vĩnh viễn.
    const SEND_TIMEOUT_MS = 10000;
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      postResponse(requestId, false, null, "Extension message timed out after " + SEND_TIMEOUT_MS + "ms — background service worker may have been unloaded. Please retry.");
    }, SEND_TIMEOUT_MS);

    chrome.runtime.sendMessage(
      {
        action: payload.type,
        type: payload.type,
        data: payload.data || {},
      },
      (response) => {
        if (settled) return; // timeout đã xử lý rồi
        settled = true;
        clearTimeout(timeoutId);
        const runtimeError = chrome.runtime.lastError?.message;
        if (runtimeError) {
          postResponse(requestId, false, null, runtimeError);
          return;
        }
        postResponse(
          requestId,
          !!response?.success,
          response?.data ?? null,
          response?.error || null,
        );
      },
    );
  });

  postPong("bridge-ready");
})();
