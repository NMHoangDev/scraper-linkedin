// Lắng nghe lệnh từ background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_COMMENT") {
    executeComment(request.payload)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // asynchronous
  }
});

// Facebook đổi doc_id của useCometUFICreateCommentMutation theo từng bản deploy —
// hardcode 1 giá trị sẽ hỏng dần. graphql-sniffer.js (chạy ở MAIN world) bắt trực
// tiếp doc_id thật mỗi khi CÓ AI đăng comment thật trên Facebook (kể cả tab khác),
// lưu vào chrome.storage.local để dùng lại. Lần đầu cài extension, hãy tự tay đăng
// 1 comment thật bất kỳ trên Facebook để "hiệu chỉnh" giá trị này trước khi seeding.
const FALLBACK_DOC_ID = "36574905442124839";
const CAPTURE_STORAGE_KEY = "fbGraphqlCapture_useCometUFICreateCommentMutation";
const CAPTURE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // quá 7 ngày thì không tin tưởng nữa, quay lại giá trị dự phòng

let capturedDocId = null;

chrome.storage.local.get(CAPTURE_STORAGE_KEY, (result) => {
  const cached = result?.[CAPTURE_STORAGE_KEY];
  if (cached && Date.now() - cached.capturedAt < CAPTURE_MAX_AGE_MS) {
    capturedDocId = cached.docId;
  }
});

document.addEventListener("fb-graphql-docid-captured", (evt) => {
  try {
    const { friendlyName, docId } = evt.detail || {};
    if (friendlyName !== "useCometUFICreateCommentMutation" || !docId) return;
    capturedDocId = docId;
    chrome.storage.local.set({
      [CAPTURE_STORAGE_KEY]: { docId, capturedAt: Date.now() },
    });
    console.log("[Comment Extension] Đã bắt được doc_id comment mới nhất từ Facebook:", docId);
  } catch (e) {
    // Bỏ qua nếu payload bắt được không hợp lệ
  }
});

function getTokensFromPage() {
  return new Promise((resolve, reject) => {
    try {
      const html = document.documentElement.innerHTML;
      let fb_dtsg = "";
      let lsd = "";
      let uid = "";
      let spin_r = "";
      let spin_t = "";
      let jazoest = "";

      const dtsgMatch = html.match(/"DTSGInitialData",\s*\[\],\s*\{"token":"(.*?)"\}/) || html.match(/"fb_dtsg"\s*value="(.*?)"/);
      if (dtsgMatch) fb_dtsg = dtsgMatch[1];
      if (!fb_dtsg) {
        const input = document.querySelector('input[name="fb_dtsg"]');
        if (input) fb_dtsg = input.value;
      }

      const lsdMatch = html.match(/"LSD",\s*\[\],\s*\{"token":"(.*?)"\}/);
      if (lsdMatch) lsd = lsdMatch[1];

      const uidMatch = html.match(/"USER_ID":"(\d+)"/) || html.match(/"ACCOUNT_ID":"(\d+)"/);
      if (uidMatch) uid = uidMatch[1];

      const spinRMatch = html.match(/"__spin_r":(\d+)/);
      if (spinRMatch) spin_r = spinRMatch[1];

      const spinTMatch = html.match(/"__spin_t":(\d+)/);
      if (spinTMatch) spin_t = spinTMatch[1];

      const jazoestMatch = html.match(/"jazoest"\s*value="(.*?)"/) || html.match(/jazoest=(\d+)/);
      if (jazoestMatch) {
        jazoest = jazoestMatch[1];
      } else if (fb_dtsg) {
        let j = 0;
        for (let i = 0; i < fb_dtsg.length; i++) {
          j += fb_dtsg.charCodeAt(i);
        }
        jazoest = "2" + j;
      }

      resolve({ fb_dtsg, lsd, uid, spin_r, spin_t, jazoest });
    } catch (e) {
      reject(new Error("Lỗi khi quét token: " + e.message));
    }
  });
}

async function executeComment(payload) {
  const { url, text } = payload;
  const currentUrl = window.location.href;

  // RẼ NHÁNH CHO REEL: Cách ly tuyệt đối luồng Reel để bảo vệ luồng bài viết thường
  const isReel = url.includes("/reel/") || url.includes("/reels/") || currentUrl.includes("/reel/") || currentUrl.includes("/reels/");
  if (isReel) {
    console.log("[Comment Extension] Phát hiện bài viết Facebook Reel. Kích hoạt luồng Reel riêng biệt.");
    return await executeReelComment(payload);
  }

  // Tách Post ID với cơ chế 3-Layer Fallback (Bao bọc mọi loại URL kể cả pfbid)
  let postId = null;

  // LỚP 1: Quét từ URL payload gửi lên (Hỗ trợ chữ, số, dấu gạch dưới của pfbid)
  const urlMatch = url.match(/\/(?:posts|permalink|videos|story|reel|reels)\/([a-zA-Z0-9_]+)/i) || url.match(/fbid=([a-zA-Z0-9_]+)/i) || url.match(/story_fbid=([a-zA-Z0-9_]+)/i);
  if (urlMatch && urlMatch[1]) {
    postId = urlMatch[1];
  }

  // LỚP 2: Quét từ URL thực tế của tab đang mở (Phòng trường hợp link rút gọn đã redirect)
  if (!postId) {
    const currentUrl = window.location.href;
    const currentMatch = currentUrl.match(/\/(?:posts|permalink|videos|story)\/([a-zA-Z0-9_]+)/i) || currentUrl.match(/fbid=([a-zA-Z0-9_]+)/i) || currentUrl.match(/story_fbid=([a-zA-Z0-9_]+)/i);
    if (currentMatch && currentMatch[1]) {
      postId = currentMatch[1];
    }
  }

  // LỚP 3: Quét trực tiếp trong mã nguồn DOM của Facebook
  if (!postId) {
    // Ưu tiên thẻ meta og:url
    const ogUrlMeta = document.querySelector('meta[property="og:url"]');
    if (ogUrlMeta && ogUrlMeta.content) {
      const ogMatch = ogUrlMeta.content.match(/\/(?:posts|permalink|videos|story)\/([a-zA-Z0-9_]+)/i) || ogUrlMeta.content.match(/fbid=([a-zA-Z0-9_]+)/i);
      if (ogMatch && ogMatch[1]) {
        postId = ogMatch[1];
      }
    }

    // Đào sâu vào config ẩn của Facebook
    if (!postId) {
      const htmlContent = document.documentElement.innerHTML;
      const fbIdMatch = htmlContent.match(/"target_fbid":"([a-zA-Z0-9_]+)"/) || htmlContent.match(/"ft_ent_identifier":"([a-zA-Z0-9_]+)"/);
      if (fbIdMatch && fbIdMatch[1]) {
        postId = fbIdMatch[1];
      }
    }
  }

  // Chốt chặn cuối cùng: Nếu qua 3 lớp vẫn không có thì mới cho bay màu
  if (!postId) {
    throw new Error("Không thể trích xuất Post ID từ URL: " + url + " | Current Tab URL: " + window.location.href);
  }

  const tokens = await getTokensFromPage();
  if (!tokens.fb_dtsg || !tokens.uid) {
    throw new Error("Không tìm thấy fb_dtsg hoặc uid. Vui lòng tải lại trang.");
  }

  const feedbackId = btoa(`feedback:${postId}`);

  const variables = {
    input: {
      client_mutation_id: "1",
      actor_id: tokens.uid,
      feedback_id: feedbackId,
      message: { ranges: [], text: text },
      attachments: null,
      source: "COMET",
    },
    displayCommentsFeedbackContext: null,
    displayCommentsContext: null,
  };

  const body = new URLSearchParams({
    av: tokens.uid,
    __user: tokens.uid,
    fb_api_req_friendly_name: "useCometUFICreateCommentMutation",
    doc_id: capturedDocId || FALLBACK_DOC_ID,
    fb_dtsg: tokens.fb_dtsg,
    lsd: tokens.lsd || "",
    jazoest: tokens.jazoest,
    __spin_r: tokens.spin_r,
    __spin_t: tokens.spin_t,
    __a: "1",
    variables: JSON.stringify(variables),
  });

  const response = await fetch("https://www.facebook.com/api/graphql/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Lỗi HTTP: ${response.status} - ${errText.substring(0, 50)}`);
  }

  const resText = await response.text();
  // Facebook often prepends for (;;); to JSON responses
  const cleanText = resText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/g, "").trim();

  let success = false;
  let commentUrl = "";

  let parsedItems = [];
  try {
    parsedItems = [JSON.parse(cleanText)];
  } catch (e) {
    parsedItems = cleanText
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch (err) {
          return null;
        }
      })
      .filter(Boolean);
  }

  for (const data of parsedItems) {
    const commentCreate = data?.data?.comment_create;
    if (commentCreate) {
      success = true;

      // Theo hướng dẫn chuẩn
      const edge = commentCreate?.feedback_comment_edge;
      const node = edge?.node;

      if (node) {
        const commentId = node.legacy_fbid;
        commentUrl = node.url || (commentId ? `${url}?comment_id=${commentId}` : url);
        break;
      } else if (data.label || data.path) {
        // Có thể là defer/stream fragment chứa node
        const streamNode = data?.data?.node || data?.data;
        if (streamNode && streamNode.legacy_fbid) {
          commentUrl = streamNode.url || `${url}?comment_id=${streamNode.legacy_fbid}`;
          break;
        }
      } else {
        commentUrl = url;
      }
    } else if (data?.errors) {
      console.error("GraphQL Error:", data.errors[0]?.message);
    }
  }

  if (success) {
    return { success: true, url: commentUrl || url, uid: tokens.uid };
  } else {
    throw new Error("API Facebook phản hồi không như mong đợi: " + resText.substring(0, 100));
  }
}

// -----------------------------------------------------------------------------
// LUỒNG XỬ LÝ RIÊNG DÀNH CHO FACEBOOK REELS (/reel/ VÀ /reels/)
// -----------------------------------------------------------------------------

function waitForElement(selector, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    let timer = null;
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        if (timer) clearTimeout(timer);
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    timer = setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeoutMs);
  });
}

async function executeReelComment(payload) {
  const { url, text } = payload;
  const currentUrl = window.location.href;

  // 1. Thử trích xuất Reel ID để gọi GraphQL ngầm (Phương án Nhanh & Ẩn)
  let reelId = null;
  const reelMatch = url.match(/\/(?:reel|reels)\/([a-zA-Z0-9_]+)/i) || currentUrl.match(/\/(?:reel|reels)\/([a-zA-Z0-9_]+)/i);
  if (reelMatch && reelMatch[1]) {
    reelId = reelMatch[1];
  }

  if (!reelId) {
    const htmlContent = document.documentElement.innerHTML;
    const fbIdMatch = htmlContent.match(/"target_fbid":"([a-zA-Z0-9_]+)"/) || htmlContent.match(/"ft_ent_identifier":"([a-zA-Z0-9_]+)"/) || htmlContent.match(/"video_id":"(\d+)"/);
    if (fbIdMatch && fbIdMatch[1]) {
      reelId = fbIdMatch[1];
    }
  }

  // Nếu có Reel ID & Tokens, thử gửi qua API GraphQL
  if (reelId) {
    try {
      const tokens = await getTokensFromPage();
      if (tokens.fb_dtsg && tokens.uid) {
        const feedbackId = btoa(`feedback:${reelId}`);
        const variables = {
          input: {
            client_mutation_id: "1",
            actor_id: tokens.uid,
            feedback_id: feedbackId,
            message: { ranges: [], text: text },
            attachments: null,
            source: "COMET",
          },
          displayCommentsFeedbackContext: null,
          displayCommentsContext: null,
        };

        const body = new URLSearchParams({
          av: tokens.uid,
          __user: tokens.uid,
          fb_api_req_friendly_name: "useCometUFICreateCommentMutation",
          doc_id: capturedDocId || FALLBACK_DOC_ID,
          fb_dtsg: tokens.fb_dtsg,
          lsd: tokens.lsd || "",
          jazoest: tokens.jazoest,
          __spin_r: tokens.spin_r,
          __spin_t: tokens.spin_t,
          __a: "1",
          variables: JSON.stringify(variables),
        });

        const response = await fetch("https://www.facebook.com/api/graphql/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (response.ok) {
          const resText = await response.text();
          const cleanText = resText.replace(/^for\s*\(\s*;\s*;\s*\)\s*;/g, "").trim();
          let parsedItems = [];
          try {
            parsedItems = [JSON.parse(cleanText)];
          } catch (e) {
            parsedItems = cleanText
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => {
                try {
                  return JSON.parse(l);
                } catch (err) {
                  return null;
                }
              })
              .filter(Boolean);
          }
          for (const data of parsedItems) {
            if (data?.data?.comment_create) {
              const edge = data.data.comment_create?.feedback_comment_edge;
              const node = edge?.node;
              const commentUrl = node?.url || (node?.legacy_fbid ? `${url}?comment_id=${node.legacy_fbid}` : url);
              console.log("[Comment Extension] Đăng comment Reel thành công qua GraphQL API!");
              return { success: true, url: commentUrl, uid: tokens.uid };
            }
          }
        }
      }
    } catch (gqlErr) {
      console.log("[Comment Extension] GraphQL Reel comment không khả thi, chuyển sang mô phỏng DOM:", gqlErr.message);
    }
  }

  // 2. Thao tác DOM dự phòng cho Reel (DOM Simulation)
  return await executeReelDomComment(payload);
}

async function executeReelDomComment(payload) {
  const { url, text } = payload;

  // A. Bóc tách Tên Fanpage / Chủ sở hữu Reel bằng selector đặc thù
  let pageName = "";
  const ownerLink = document.querySelector('a[aria-label="Xem trang cá nhân của chủ sở hữu"], a[aria-label="View owner\'s profile"], a[role="link"][href*="/reel/"]');
  if (ownerLink) {
    pageName = ownerLink.innerText.trim();
  }

  // B. Mở nút Bình luận nếu ô comment bị ẩn trong Reel Drawer
  const commentBtnSelector = 'div[aria-label="Bình luận"][role="button"], div[aria-label="Leave a comment"][role="button"], div[aria-label="Comment"][role="button"], div[aria-label*="Bình luận"][role="button"]';
  const commentBtn = await waitForElement(commentBtnSelector, 5000);

  if (commentBtn) {
    commentBtn.click();
    await new Promise((r) => setTimeout(r, 1500));
  }

  // C. Đợi ô nhập liệu comment xuất hiện
  const textboxSelector = 'div[contenteditable="true"][role="textbox"]';
  const textbox = await waitForElement(textboxSelector, 7000);

  if (!textbox) {
    throw new Error("Không thể tìm thấy ô nhập bình luận trên Reels sau khi mở khung bình luận.");
  }

  // D. Focus và inject text qua execCommand
  textbox.focus();
  await new Promise((r) => setTimeout(r, 300));

  document.execCommand("insertText", false, text);
  textbox.dispatchEvent(new Event("input", { bubbles: true }));

  await new Promise((r) => setTimeout(r, 500));

  // E. Giả lập bấm Enter phát bình luận
  const enterEvent = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  });
  textbox.dispatchEvent(enterEvent);

  await new Promise((r) => setTimeout(r, 2000));

  const tokens = await getTokensFromPage().catch(() => ({ uid: "unknown" }));
  return {
    success: true,
    url: url,
    uid: tokens.uid || "unknown",
    pageName: pageName || undefined,
  };
}
