(() => {
  if (window.__markeeZaloBridgeLoaded) return;
  window.__markeeZaloBridgeLoaded = true;
  window.__zaloExtensionAvailable = true;

  // ──────────────────────────────────────────────────────────────────────
  // STEP dispatcher: nhận STEP events từ background service worker
  // và dispatch lên window để app có thể listen & hiển thị progress.
  // Event name: "zalo-ext-step"
  // ──────────────────────────────────────────────────────────────────────
  function handleStepMessage(data) {
    const step = data?.step || "unknown";
    const details = { ...data };
    delete details.step;
    // Expose current step globally — app có thể đọc window.__zaloExtStep
    window.__zaloExtStep = { step, details, ts: data.ts };
    // Dispatch DOM event để code có thể addEventListener
    window.dispatchEvent(
      new CustomEvent("zalo-ext-step", {
        detail: { step, details, ts: data.ts },
      }),
    );
    // Log ra console cho developer thấy
    console.log("[zalo-bridge:STEP]", step, details);
  }

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

    // STEP events: background broadcast progress
    if (payload.type === "STEP") {
      handleStepMessage(payload.data);
      return;
    }

    // RESPONSE/PONG: message do chính page-bridge gửi ra window, bỏ qua
    // (tránh echo loop — postResponse bắn lên window, page-bridge nhận rồi lại gửi background)
    if (payload.type === "RESPONSE" || payload.type === "PONG") {
      return;
    }

    const requestId = payload.requestId || `zalo-${Date.now()}`;
    if (payload.type === "PING") {
      postPong(requestId);
      return;
    }

    // Guard: nếu background service worker bị unload (MV3 5-minute idle rule),
    // chrome.runtime.sendMessage callback có thể không bao giờ được gọi.
    // Dùng timeout 2 phút (120000ms) để cover các tác vụ Zalo lâu (login QR, fetch messages lớn, v.v.)
    // mà vẫn tránh page bị stuck vĩnh viễn.
    const SEND_TIMEOUT_MS = 120000;
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      postResponse(requestId, false, null, "Extension message timed out after " + SEND_TIMEOUT_MS + "ms — background service worker may have been unloaded. Please retry.");
      handleStepMessage({ step: "timeout", timeoutMs: SEND_TIMEOUT_MS });
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
          handleStepMessage({ step: "runtime_error", error: runtimeError });
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
