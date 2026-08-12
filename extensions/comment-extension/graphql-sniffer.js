// Chạy trong MAIN world của trang Facebook (không phải world cô lập của content script)
// để có thể patch window.fetch/XMLHttpRequest và bắt trực tiếp response GraphQL thật.
// QUAN TRỌNG: MAIN world KHÔNG có quyền truy cập chrome.storage hay gọi API cross-origin
// bị giới hạn CORS. Thay vào đó, dispatch CustomEvent để content.js (ISOLATED world) xử lý.
(function () {
    if (window.__fbGraphqlSnifferInstalled) return;
    window.__fbGraphqlSnifferInstalled = true;

    // Dispatch CustomEvent để content.js (ISOLATED world) bắt và kiểm tra session / target_link
    // trước khi ghi nhận KPI và hiển thị Toast thông báo cho người dùng.
    function dispatchActionCaptured(actionType, fbUid, postUrl, delayMs = 0) {
        document.dispatchEvent(new CustomEvent("markee-action-captured", {
            detail: {
                actionType: actionType,
                fbUid: fbUid || "",
                postUrl: postUrl || window.location.href,
                delayMs: delayMs || 0,
            },
        }));
    }

    function tryCapture(bodyText, responseData) {
        let friendlyName = "";
        if (bodyText && typeof bodyText === "string") {
            try {
                const params = new URLSearchParams(bodyText);
                friendlyName = params.get("fb_api_req_friendly_name") || "";
                if (friendlyName === "useCometUFICreateCommentMutation") {
                    const docId = params.get("doc_id");
                    if (docId) {
                        document.dispatchEvent(new CustomEvent("fb-graphql-docid-captured", {
                            detail: { friendlyName, docId },
                        }));
                    }
                }
            } catch (e) {}
        }

        if (responseData) {
            try {
                let actionType = null;
                let postUrl = window.location.href;
                let fbUid = "unknown";
                let delayMs = 0;

                // 1. NGHE HÀNH ĐỘNG LIKE (CometUFIFeedbackReactMutation / Reel Like)
                const fbReact = responseData && responseData.data && (responseData.data.feedback_react || responseData.data.feedback_reaction);
                if (fbReact) {
                    actionType = "like";
                    fbUid = (fbReact.viewer_actor && fbReact.viewer_actor.id)
                        || (fbReact.feedback && fbReact.feedback.viewer_actor && fbReact.feedback.viewer_actor.id)
                        || "unknown";
                    postUrl = (fbReact.feedback && fbReact.feedback.url) || window.location.href;
                }

                // 2. NGHE HÀNH ĐỘNG SHARE (Bài viết thường - Kích hoạt ngay tức thì)
                if (!actionType && responseData && responseData.data) {
                    const shareResult =
                        (responseData.data.story_create && (responseData.data.story_create.story || responseData.data.story_create)) ||
                        (responseData.data.share_create && (responseData.data.share_create.story || responseData.data.share_create)) ||
                        (responseData.data.fb_shorts_story_create && (responseData.data.fb_shorts_story_create.story || responseData.data.fb_shorts_story_create)) ||
                        (responseData.data.fb_shorts_share_create && (responseData.data.fb_shorts_share_create.story || responseData.data.fb_shorts_share_create)) ||
                        (responseData.data.composer_story_create && (responseData.data.composer_story_create.story || responseData.data.composer_story_create)) ||
                        responseData.data.reels_share_create;

                    if (shareResult) {
                        actionType = "share";
                        const storyObj = shareResult.story || shareResult;
                        fbUid = (storyObj.default_actor && storyObj.default_actor.id)
                            || (storyObj.actor && storyObj.actor.id)
                            || (storyObj.owner && storyObj.owner.id)
                            || "unknown";
                        postUrl = storyObj.url || storyObj.permalink_url || window.location.href;
                    }
                }

                // 3. NGHE HÀNH ĐỘNG SHARE REEL (Bắt qua xfb_fb_shorts_seen_state_mutation hoặc fb_shorts_seen_state_mutation)
                // Lấy fbUid từ viewer.actor.id ("100044659656204") và hoãn 3 giây trước khi thông báo & bắn về DB
                if (!actionType && responseData && responseData.data) {
                    const shortsMutation = responseData.data.xfb_fb_shorts_seen_state_mutation || responseData.data.fb_shorts_seen_state_mutation;
                    const actorId = shortsMutation && shortsMutation.viewer && shortsMutation.viewer.actor && shortsMutation.viewer.actor.id;

                    if (shortsMutation && actorId) {
                        actionType = "share";
                        fbUid = actorId;
                        delayMs = 3000; // Hoãn 3 giây theo đúng giải pháp người dùng yêu cầu
                    }
                }

                if (actionType) {
                    dispatchActionCaptured(actionType, fbUid, postUrl, delayMs);
                }
            } catch (e) {}
        }
    }

    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
        const response = await originalFetch.apply(this, arguments);
        try {
            const url = typeof input === "string" ? input : (input && input.url);
            if (url && url.includes("/api/graphql/")) {
                if (init && init.body) tryCapture(init.body, null);
                response.clone().json().then(function(data) {
                    tryCapture(null, data);
                }).catch(function() {});
            }
        } catch (e) {}
        return response;
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
                tryCapture(body, null);
                this.addEventListener("load", function () {
                    try {
                        const data = JSON.parse(this.responseText);
                        tryCapture(null, data);
                    } catch (e) {}
                });
            }
        } catch (e) {}
        return originalSend.apply(this, arguments);
    };
})();
