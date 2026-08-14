// -----------------------------------------------------------------------------
// LINKEDIN AUTOMATION CONTENT SCRIPT (platforms/linkedin/content.js)
// Xử lý Auto-Comment cho LinkedIn (Permalinks / Posts / Activity)
// -----------------------------------------------------------------------------

(function () {
  if (window.__liCommentInjected) return;
  window.__liCommentInjected = true;

  console.log("[LinkedIn Extension] LinkedIn Comment Content Script loaded.");

  const POST_SELECTORS = [
    'div[data-id^="urn:li:activity"]',
    'article[data-urn*="urn:li:activity"]',
    "article.feed-shared-update-v2",
    "div.feed-shared-update-v2",
    "div.occludable-update",
  ];

  const LI_COMMENT_TRIGGER_SELECTORS = [
    'button[aria-label*="Comment" i]',
    'button[aria-label*="bình luận" i]',
    'button[aria-label*="Bình luận" i]'
  ];

  const LI_COMMENT_BOX_SELECTORS = [
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]'
  ];

  const LI_COMMENT_SUBMIT_SELECTORS = [
    'button[class*="comments-comment-box__submit-button"]',
    'button.artdeco-button--primary',
    'button[type="submit"]',
  ];

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function findPostBlocks() {
    for (const sel of POST_SELECTORS) {
      const els = Array.from(document.querySelectorAll(sel));
      if (els.length > 0) return els;
    }
    return [];
  }

  function extractActivityId(url) {
    if (!url) return null;
    const m = String(url).match(/activity[:-](\d{6,})/);
    return m ? m[1] : null;
  }

  function resolvePostUrl(block) {
    const a = block.querySelector('a[href*="/posts/"], a[href*="/feed/update/"], a[href*="/activity-"]');
    return a ? a.href : null;
  }

  function findMatchingBlock(targetUrl) {
    const blocks = findPostBlocks();
    if (blocks.length === 0) return null;
    const targetId = extractActivityId(targetUrl);
    if (targetId) {
      for (const block of blocks) {
        const blockUrl = resolvePostUrl(block);
        if (blockUrl && extractActivityId(blockUrl) === targetId) return block;
      }
    }
    return blocks[0];
  }

  function waitForElementIn(root, selectors, timeoutMs) {
    return new Promise((resolve) => {
      const start = Date.now();
      (function poll() {
        for (const sel of selectors) {
          try {
            const el = (root || document).querySelector(sel);
            if (el) return resolve(el);
          } catch (e) {}
        }
        if (Date.now() - start > timeoutMs) return resolve(null);
        setTimeout(poll, 300);
      })();
    });
  }

  async function waitForFeed(timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (findPostBlocks().length > 0) return true;
      await sleep(500);
    }
    return false;
  }

  async function doPostComment(url, text) {
    console.log("[LinkedIn Extension] Bắt đầu Auto-Comment cho LinkedIn...");
    const found = await waitForFeed(10000);
    if (!found) {
      return { success: false, error: "Không tìm thấy bài viết trên trang LinkedIn.", platform: "linkedin" };
    }

    const block = findMatchingBlock(url);
    if (!block) {
      return { success: false, error: "Không tìm thấy bài viết để comment.", platform: "linkedin" };
    }

    // 1. Click Trigger nút Comment nếu ô nhập chưa mở
    const trigger = await waitForElementIn(block, LI_COMMENT_TRIGGER_SELECTORS, 5000);
    if (trigger) {
      trigger.click();
      await sleep(1200);
    }

    // 2. Tìm ô nhập liệu contenteditable
    const box =
      (await waitForElementIn(block, LI_COMMENT_BOX_SELECTORS, 7000)) ||
      (await waitForElementIn(document, LI_COMMENT_BOX_SELECTORS, 3000));

    if (!box) {
      return { success: false, error: "Không tìm thấy ô nhập bình luận.", platform: "linkedin" };
    }

    box.focus();
    await sleep(300);

    // Xóa cũ & Nhập văn bản comment
    document.execCommand("insertText", false, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(800);

    // 3. Tìm và click nút Submit
    const submitBtn = await waitForElementIn(box.closest("form") || document, LI_COMMENT_SUBMIT_SELECTORS, 3000);
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.click();
    } else {
      box.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true })
      );
    }

    await sleep(2500);
    console.log("[LinkedIn Extension] Đã gửi comment LinkedIn thành công!");
    return { success: true, url, platform: "linkedin" };
  }

  // Bộ lắng nghe tin nhắn EXECUTE_COMMENT từ Background Script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "EXECUTE_COMMENT" || request.type === "EXECUTE_COMMENT" || request.type === "LI_POST_COMMENT_ONE") {
      const payload = request.payload || {};
      const text = request.text || payload.text;
      const url = request.url || payload.url || window.location.href;

      if (!text || !text.trim()) {
        sendResponse({ success: false, error: "Nội dung comment trống.", platform: "linkedin" });
        return false;
      }

      doPostComment(url, text.trim()).then((res) => sendResponse(res));
      return true; // Giữ kênh giao tiếp Asynchronous mở
    }
  });
})();
