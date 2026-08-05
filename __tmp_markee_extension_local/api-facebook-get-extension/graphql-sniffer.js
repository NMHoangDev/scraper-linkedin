// Chạy trong MAIN world của trang Facebook (không phải world cô lập của content script)
// để có thể patch window.fetch/XMLHttpRequest và bắt trực tiếp các request GraphQL thật
// mà chính JS của Facebook gửi đi. Nhờ vậy doc_id/variables luôn tự cập nhật đúng,
// không cần sửa code tay mỗi khi Facebook đổi phiên bản GraphQL nội bộ.
(function () {
    if (window.__fbGraphqlSnifferInstalled) return;
    window.__fbGraphqlSnifferInstalled = true;

    // Danh sách các query cần theo dõi (friendly_name -> tự thêm nếu cần bắt thêm query khác)
    const WATCHED_QUERIES = new Set([
        "GroupsCometFeedRegularStoriesPaginationQuery",
    ]);

    function tryCapture(bodyText) {
        if (!bodyText || typeof bodyText !== "string") return;
        try {
            const params = new URLSearchParams(bodyText);
            const friendlyName = params.get("fb_api_req_friendly_name");
            if (!friendlyName || !WATCHED_QUERIES.has(friendlyName)) return;
            const docId = params.get("doc_id");
            const variablesRaw = params.get("variables");
            if (!docId || !variablesRaw) return;
            document.dispatchEvent(new CustomEvent("fb-graphql-docid-captured", {
                detail: { friendlyName, docId, variables: variablesRaw },
            }));
        } catch (e) {
            // Bỏ qua lỗi bắt gói tin, không được phép làm hỏng request gốc của Facebook
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        try {
            const url = typeof input === "string" ? input : input?.url;
            if (url && url.includes("/api/graphql/") && init && init.body) {
                tryCapture(init.body);
            }
        } catch (e) {}
        return originalFetch.apply(this, arguments);
    };

    const OriginalXHR = window.XMLHttpRequest;
    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;
    OriginalXHR.prototype.open = function (method, url) {
        this.__sniffUrl = url;
        return originalOpen.apply(this, arguments);
    };
    OriginalXHR.prototype.send = function (body) {
        try {
            if (this.__sniffUrl && this.__sniffUrl.includes("/api/graphql/")) {
                tryCapture(body);
            }
        } catch (e) {}
        return originalSend.apply(this, arguments);
    };
})();
