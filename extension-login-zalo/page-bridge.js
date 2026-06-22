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
    if (event.source !== window) return;
    const payload = event.data;
    if (!payload || payload.__zaloExt !== true || !payload.type) return;

    const requestId = payload.requestId || `zalo-${Date.now()}`;
    if (payload.type === "PING") {
      postPong(requestId);
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: payload.type,
        type: payload.type,
        data: payload.data || {},
      },
      (response) => {
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
