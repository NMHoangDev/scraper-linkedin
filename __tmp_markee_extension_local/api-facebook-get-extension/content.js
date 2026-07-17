// ─── Dò doc_id động từ chính request thật của Facebook ──────────────────────
// graphql-sniffer.js (chạy ở MAIN world) bắt request GraphQL thật Facebook tự gửi
// rồi bắn CustomEvent này ra. Nhờ vậy khi Facebook đổi doc_id, extension tự cập nhật
// theo mà không cần sửa code tay. Nếu chưa bắt được lần nào thì dùng giá trị dự phòng
// cố định bên dưới (đã cập nhật theo request thật gần nhất tính tới thời điểm sửa code).
const FALLBACK_DOC_ID = "25454082720955898";
const FALLBACK_VARIABLES = {
    feedLocation: "GROUP",
    feedType: "DISCUSSION",
    feedbackSource: 0,
    filterTopicId: null,
    focusCommentID: null,
    privacySelectorRenderLocation: "COMET_STREAM",
    referringStoryRenderLocation: null,
    renderLocation: "group",
    scale: 1.5,
    sortingSetting: "RECENT_ACTIVITY",
    useDefaultActor: false,
    __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: true,
    __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
    __relay_internal__pv__CometFeedStory_enable_reactor_facepilerelayprovider: false,
    __relay_internal__pv__CometFeedStory_enable_social_bubblesrelayprovider: false,
    __relay_internal__pv__CometFeedStory_enable_post_permalink_white_space_clickrelayprovider: false,
    __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: true,
    __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
    __relay_internal__pv__IsWorkUserrelayprovider: false,
    __relay_internal__pv__TestPilotShouldIncludeDemoAdUseCaserelayprovider: false,
    __relay_internal__pv__FBReels_deprecate_short_form_video_context_gkrelayprovider: true,
    __relay_internal__pv__FBReels_enable_view_dubbed_audio_type_gkrelayprovider: true,
    __relay_internal__pv__CometFeedShareMedia_shouldPrefetchShareImagerelayprovider: false,
    __relay_internal__pv__CometImmersivePhotoCanUserDisable3DMotionrelayprovider: false,
    __relay_internal__pv__WorkCometIsEmployeeGKProviderrelayprovider: false,
    __relay_internal__pv__IsMergQAPollsrelayprovider: false,
    __relay_internal__pv__FBReelsMediaFooter_comet_enable_reels_ads_gkrelayprovider: true,
    __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
    __relay_internal__pv__CometUFICommentAutoTranslationTyperelayprovider: "AUTO_TRANSLATE",
    __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
    __relay_internal__pv__CometUFISingleLineUFIrelayprovider: false,
    __relay_internal__pv__relay_provider_comet_ufi_ssr_seo_deferrelayprovider: true,
    __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: true,
    __relay_internal__pv__ReelsIFUCard_reelsIFULikeCountrelayprovider: false,
    __relay_internal__pv__FBReelsIFUTileContent_reelsIFUPlayOnHoverrelayprovider: true,
    __relay_internal__pv__GroupsCometGYSJFeedItemHeightrelayprovider: 206,
    __relay_internal__pv__ShouldEnableBakedInTextStoriesrelayprovider: false,
    __relay_internal__pv__StoriesShouldIncludeFbNotesrelayprovider: false,
};
const CAPTURE_STORAGE_KEY = "fbGraphqlCapture_GroupsCometFeedRegularStoriesPaginationQuery";
const CAPTURE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // quá 7 ngày thì không tin tưởng nữa, quay lại giá trị dự phòng

let capturedQueryTemplate = null; // { docId, variables } lấy được từ chính request thật của Facebook

chrome.storage.local.get(CAPTURE_STORAGE_KEY, (result) => {
    const cached = result?.[CAPTURE_STORAGE_KEY];
    if (cached && Date.now() - cached.capturedAt < CAPTURE_MAX_AGE_MS) {
        capturedQueryTemplate = { docId: cached.docId, variables: cached.variables };
    }
});

document.addEventListener("fb-graphql-docid-captured", (evt) => {
    try {
        const { friendlyName, docId, variables } = evt.detail || {};
        if (friendlyName !== "GroupsCometFeedRegularStoriesPaginationQuery") return;
        const parsedVariables = JSON.parse(variables);
        capturedQueryTemplate = { docId, variables: parsedVariables };
        chrome.storage.local.set({
            [CAPTURE_STORAGE_KEY]: { docId, variables: parsedVariables, capturedAt: Date.now() },
        });
        console.log("[FB API Crawler] Đã bắt được doc_id mới nhất từ Facebook:", docId);
    } catch (e) {
        // Bỏ qua nếu payload bắt được không hợp lệ
    }
});

// Cuộn nhẹ trang để dụ Facebook tự bắn ra request PaginationQuery thật (nếu chưa có sẵn
// giá trị đã bắt trước đó), cho graphql-sniffer.js cơ hội bắt được doc_id mới nhất.
function nudgeFeedAndWaitForCapture(timeoutMs = 2500) {
    return new Promise((resolve) => {
        if (capturedQueryTemplate) return resolve();
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            document.removeEventListener("fb-graphql-docid-captured", onCapture);
            clearTimeout(timer);
            resolve();
        };
        const onCapture = () => finish();
        document.addEventListener("fb-graphql-docid-captured", onCapture);
        const timer = setTimeout(finish, timeoutMs);
        try {
            window.scrollBy(0, 1200);
            setTimeout(() => window.scrollBy(0, -400), 300);
        } catch (e) {}
    });
}

// Lắng nghe yêu cầu từ popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FETCH_API_POSTS') {
        fetchPosts(request.count)
            .then(result => sendResponse({ success: true, data: result.posts, logs: result.logs }))
            .catch(error => sendResponse({ success: false, error: error.message, logs: error.logs || [] }));
        
        return true; // Báo cho Chrome biết là mình sẽ sendResponse bất đồng bộ
    }
});

function getTokensFromPage() {
    return new Promise((resolve, reject) => {
        try {
            const html = document.documentElement.innerHTML;
            let fb_dtsg = "";
            let lsd = "";
            let groupId = "";

            // Lấy fb_dtsg
            const dtsgMatch = html.match(/"DTSGInitialData",\s*\[\],\s*\{"token":"(.*?)"\}/) || html.match(/"fb_dtsg"\s*value="(.*?)"/);
            if (dtsgMatch) fb_dtsg = dtsgMatch[1];
            if (!fb_dtsg) {
                const input = document.querySelector('input[name="fb_dtsg"]');
                if (input) fb_dtsg = input.value;
            }

            // Lấy lsd
            const lsdMatch = html.match(/"LSD",\s*\[\],\s*\{"token":"(.*?)"\}/);
            if (lsdMatch) lsd = lsdMatch[1];

            // Lấy Group ID (Phải là dạng SỐ)
            // Cách 1: Quét thẳng trong mã nguồn HTML (chính xác nhất)
            const groupIdMatch = html.match(/"groupID":"(\d+)"/) || html.match(/"group_id":"(\d+)"/);
            if (groupIdMatch) {
                groupId = groupIdMatch[1];
            }
            
            // Cách 2: Tìm trong meta tags
            if (!groupId) {
                const meta = document.querySelector('meta[property="al:android:url"]');
                if (meta) {
                    const match = meta.content.match(/group\/(\d+)/);
                    if (match) groupId = match[1];
                }
            }
            
            // Cách 3: Lấy từ URL (chỉ áp dụng nếu URL dùng số)
            if (!groupId) {
                const urlMatch = window.location.pathname.match(/groups\/(\d+)/);
                if (urlMatch) groupId = urlMatch[1];
            }

            resolve({ fb_dtsg, lsd, groupId, success: true });
        } catch (e) {
            reject(new Error("Lỗi khi quét token: " + e.message));
        }
    });
}

async function fetchPosts(count = 20) {
    const logs = [];
    function addLog(msg) {
        logs.push(msg);
        console.log(msg);
    }
    
    addLog("Bắt đầu lấy token từ trang Facebook...");
    const tokens = await getTokensFromPage();
    
    if (!tokens.groupId) {
        const err = new Error("Không tìm thấy Group ID. Hãy chắc chắn bạn đang ở trang Facebook Group!");
        err.logs = logs;
        throw err;
    }
    if (!tokens.fb_dtsg) {
        const err = new Error("Không tìm thấy fb_dtsg. Hãy thử tải lại trang (F5).");
        err.logs = logs;
        throw err;
    }

    addLog(`Đã lấy Tokens thành công! GroupID: ${tokens.groupId}, có fb_dtsg: ${!!tokens.fb_dtsg}, có lsd: ${!!tokens.lsd}`);

    addLog("Đang dò doc_id mới nhất từ chính Facebook (cuộn nhẹ trang)...");
    await nudgeFeedAndWaitForCapture();
    if (capturedQueryTemplate) {
        addLog(`Đã bắt được doc_id động: ${capturedQueryTemplate.docId}`);
    } else {
        addLog("Chưa bắt được doc_id động, dùng giá trị dự phòng cố định.");
    }

    const targetCount = parseInt(count, 10);
    const allPosts = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (allPosts.length < targetCount && hasNextPage) {
        pageCount++;
        addLog(`Đang cào Trang ${pageCount} (Đã có ${allPosts.length}/${targetCount} bài)...`);

        // Dùng template bắt được thật từ Facebook nếu có (luôn đúng theo phiên bản hiện tại
        // của Facebook), nếu chưa bắt được lần nào thì rơi về giá trị dự phòng cố định.
        const templateVariables = capturedQueryTemplate ? capturedQueryTemplate.variables : FALLBACK_VARIABLES;
        const docId = capturedQueryTemplate ? capturedQueryTemplate.docId : FALLBACK_DOC_ID;

        const variables = {
            ...templateVariables,
            count: 15, // Tăng lên 15 để cào 100 bài nhanh hơn
            cursor: cursor,
            id: tokens.groupId,
            stream_initial_count: 15,
        };

        const body = new URLSearchParams({
            fb_dtsg: tokens.fb_dtsg,
            lsd: tokens.lsd || '',
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "GroupsCometFeedRegularStoriesPaginationQuery",
            variables: JSON.stringify(variables),
            doc_id: docId,
            server_timestamps: "true",
        });

        let response = null;
        let text = "";
        let retryCount = 0;
        const MAX_RETRIES = 2;

        while (retryCount <= MAX_RETRIES) {
            try {
                response = await fetch(`${window.location.origin}/api/graphql/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: body.toString(),
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Lỗi HTTP: ${response.status} - ${errText.substring(0, 50)}`);
                }
                text = await response.text();
                break; // Thành công, thoát vòng lặp retry
            } catch (err) {
                if (retryCount >= MAX_RETRIES) {
                    err.logs = logs;
                    throw err;
                }
                retryCount++;
                logs.push(`⚠️ Lỗi khi gọi API Facebook, thử lại lần ${retryCount}/${MAX_RETRIES}...`);
                await new Promise(r => setTimeout(r, 2000)); // Đợi 2 giây trước khi retry
            }
        }
        const lines = text.trim().split("\n");
        let parsedInThisPage = 0;
        
        // Cập nhật hàm đệ quy để xài chung
        function getDeepValue(obj, targetKeys) {
            if (!obj || typeof obj !== 'object') return null;
            for (const k of targetKeys) {
                if (obj[k] !== undefined && obj[k] !== null) return obj[k];
            }
            for (const key in obj) {
                const res = getDeepValue(obj[key], targetKeys);
                if (res !== null) return res;
            }
            return null;
        }
    
        for (const line of lines) {
            try {
                const data = JSON.parse(line);
                
                // Lấy page_info để phân trang
                const pageInfo = getDeepValue(data, ['page_info']);
                if (pageInfo) {
                    if (pageInfo.has_next_page !== undefined) hasNextPage = pageInfo.has_next_page;
                    if (pageInfo.end_cursor) cursor = pageInfo.end_cursor;
                }
                
                // Tìm mảng edges. 
                let edges = [];
                if (data?.data?.node?.group_feed?.edges) {
                    edges = data.data.node.group_feed.edges;
                } else if (Array.isArray(data?.data)) {
                    edges = data.data; 
                } else if (data?.data?.edges) {
                    edges = data.data.edges;
                } else if (data?.node) {
                    edges = [{ node: data.node }]; 
                }
                
                for (const edge of edges) {
                    const node = edge.node;
                    if (!node) continue;
                    
                    const postId = node.post_id || node.id || node.legacy_post_id || getDeepValue(node, ['post_id']);
                    if (!postId) continue; 

                    // Nếu đã đủ số lượng thì bỏ qua parse
                    if (allPosts.length >= targetCount) continue;

                    // Lấy thông tin tác giả từ actors[0] (đúng theo cấu trúc GraphQL Facebook)
                    const actorsArr = getDeepValue(node, ['actors']);
                    const actorObj = (Array.isArray(actorsArr) ? actorsArr[0] : actorsArr) || {};
                    const author = actorObj?.name || getDeepValue(node, ['actors', 'owning_profile', 'name']) || "Ẩn danh";
                    // Ưu tiên lấy url profile trực tiếp từ actor, nếu không có thì dùng numeric ID
                    const actorProfileUrl = actorObj?.url || actorObj?.profile_url || "";
                    const actorId = actorObj?.id || actorObj?.profile_id || "";
                    
                    const messageObj = getDeepValue(node, ['message']);
                    const message = messageObj?.text || "";
                    
                    const url = node.url || node.share_url || `https://www.facebook.com/groups/${tokens.groupId}/posts/${postId}`;
                    const creationTime = node.creation_time || getDeepValue(node, ['creation_time']); 
                    
                    const reactionObj = getDeepValue(node, ['reaction_count']);
                    const reactionCount = reactionObj?.count || 0;
                    
                    const commentObj = getDeepValue(node, ['total_comment_count', 'comments']);
                    const commentCount = typeof commentObj === 'number' ? commentObj : (commentObj?.total_count || 0);
                    
                    const shareObj = getDeepValue(node, ['share_count']);
                    const shareCount = shareObj?.count || 0;
                    
                    let images = [];
                    let videoUrl = null;
                    
                    // Hàm đệ quy lục lọi toàn bộ ảnh và video trong cục attachments
                    function extractMedia(obj) {
                        if (!obj || typeof obj !== 'object') return;
                        // Nếu tìm thấy link ảnh
                        if (obj.image && typeof obj.image.uri === 'string') {
                            // Tránh lấy ảnh trùng lặp
                            if (!images.includes(obj.image.uri)) images.push(obj.image.uri);
                        } 
                        // Nếu tìm thấy link video
                        if (obj.playable_url && typeof obj.playable_url === 'string') {
                            videoUrl = obj.playable_url;
                        }
                        
                        for (const k in obj) {
                            extractMedia(obj[k]);
                        }
                    }
                    
                    const attachments = getDeepValue(node, ['attachments']);
                    if (attachments) extractMedia(attachments);
                    
                    // Lưu vào mảng tổng
                    allPosts.push({
                        post_id: postId,
                        post_url: url,
                        author_name: author,
                        // Ưu tiên URL profile thật (fb.com/username), fallback sang numeric ID URL
                        author_url: actorProfileUrl || (actorId ? `https://www.facebook.com/profile.php?id=${actorId}` : ""),
                        timestamp_raw: new Date((creationTime || 0) * 1000).toISOString(),
                        is_today: creationTime ? isToday(creationTime) : false,
                        content: message || "[Bài viết Media/Share/Poll]",
                        reactions: reactionCount,
                        comments: commentCount,
                        shares: shareCount,
                        images: images,
                        video_url: videoUrl,
                        crawled_at: new Date().toISOString()
                    });
                    parsedInThisPage++;
                }
            } catch (e) {
                // Ignore parse errors for split lines
            }
        }
        
        addLog(`=> Xong Trang ${pageCount}: lấy được ${parsedInThisPage} bài. (Tổng: ${allPosts.length}/${targetCount})`);
        
        // Tránh vòng lặp vô hạn nếu Facebook không trả về gì mới
        if (parsedInThisPage === 0 || !cursor) {
            hasNextPage = false;
        }

        // Tạm nghỉ 500ms giữa các lần chuyển trang để tránh bị Facebook chặn (Rate Limit)
        if (allPosts.length < targetCount && hasNextPage) {
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (allPosts.length === 0) {
        addLog(`[DEBUG-RAW] Không tìm thấy bài viết nào!`);
    }

    addLog(`✅ Đã cào xong tổng cộng ${allPosts.length} bài viết hợp lệ.`);
    return { posts: allPosts, logs };
}

// Kiểm tra bài viết có phải hôm nay không (dựa trên timestamp chuẩn)
function isToday(unixSeconds) {
    const postDate = new Date(unixSeconds * 1000);
    const today = new Date();
    return postDate.getDate() === today.getDate() &&
           postDate.getMonth() === today.getMonth() &&
           postDate.getFullYear() === today.getFullYear();
}
