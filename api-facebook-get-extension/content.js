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

    const targetCount = parseInt(count, 10);
    const allPosts = [];
    let cursor = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (allPosts.length < targetCount && hasNextPage) {
        pageCount++;
        addLog(`Đang cào Trang ${pageCount} (Đã có ${allPosts.length}/${targetCount} bài)...`);

        const variables = {
            UFI2CommentsProvider_commentsKey: "GroupsCometFeedRegularStoriesPaginationQuery",
            count: 15, // Tăng lên 15 để cào 100 bài nhanh hơn
            cursor: cursor,
            displayCommentsContextEnableComment: null,
            displayCommentsContextIsAdPreview: null,
            displayCommentsContextIsAggregatedShare: null,
            displayCommentsContextIsStorySet: null,
            displayCommentsFeedbackContext: null,
            feedLocation: "GROUP",
            feedType: "DISCUSSION",
            feedbackSource: 0,
            focusCommentID: null,
            hashtag: null,
            id: tokens.groupId,
            privacySelectorRenderLocation: "COMET_STREAM",
            renderLocation: "group",
            scale: 1.5,
            sortingSetting: "RECENT_ACTIVITY",
            stream_initial_count: 15,
            useDefaultActor: false,
        };

        const body = new URLSearchParams({
            fb_dtsg: tokens.fb_dtsg,
            lsd: tokens.lsd || '',
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name: "GroupsCometFeedRegularStoriesPaginationQuery",
            variables: JSON.stringify(variables),
            doc_id: "27224875563850383",
            server_timestamps: "true",
        });

        const response = await fetch("https://www.facebook.com/api/graphql/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errText = await response.text();
            const err = new Error(`Lỗi HTTP: ${response.status} - ${errText.substring(0, 50)}`);
            err.logs = logs;
            throw err;
        }

        const text = await response.text();
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
